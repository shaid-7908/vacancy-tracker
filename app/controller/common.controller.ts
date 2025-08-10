import slugify from "slugify";
import { asyncHandler } from "../utils/async.hadler";
import * as z from 'zod'
import { SkillRepository } from "../repository/skill.repository";
import { sendError, sendSuccess } from "../utils/unified.response";
import STATUS_CODES from "../utils/status.codes";
import { CandidateRepository } from "../repository/candidate.repository";
import { Types } from "mongoose";
import csv from 'csv-parser'
import fs from 'fs'
import { parse, isValid } from "date-fns";
import { pipeline } from "stream/promises";


export const skillInputSchema = z.object({
  skillName: z
    .string()
    .regex(/^[A-Za-z\s]+$/, "Skill name must contain only letters and spaces"),
});

export const candidateInputSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  contact: z.object({
    email: z.string().email("Email is not valid"),
    phone: z
      .string()
      .min(7, "Phone number is too short")
      .regex(/^[+\d\s()\-]+$/, "Invalid phone number format"),
  }),
  arrival: z.object({
    scheduledDate: z
      .string()
      .refine((val) => !Number.isNaN(Date.parse(val)), "Invalid scheduled date")
      .transform((val) => new Date(val)),
    actualDate: z
      .string()
      .refine((val) => !Number.isNaN(Date.parse(val)), "Invalid actual date")
      .transform((val) => new Date(val)),
    status: z.enum(["scheduled", "arrived", "no-show"]).default("scheduled"),
  }),
  skills: z
    .array(z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid skill ID"))
    .min(1, "At least one skill ID is required")
    .transform((ids) => ids.map((id) => new Types.ObjectId(id))),
  status: z.enum(["new", "assigned", "hired", "rejected"]).default("new"),
});


export const csvCandidateSchema = z.object({
  first_name: z.string().min(3, "First name should be 3 character long"),
  last_name: z.string().min(3, "Last name should be 3 character long"),
  email: z.string().email("Email is not valid"),
  phone: z
    .string()
    .min(10, "Phone number is too short")
    .regex(/^[+\d\s()\-]+$/, "Invalid phone number format"),
  scheduledDate: z
    .string()
    .refine((val) => {
      const parsed = parse(val, "dd-MM-yyyy", new Date());
      return isValid(parsed);
    }, "Invalid scheduled date")
    .transform((val) => parse(val, "dd-MM-yyyy", new Date())),
});


class CommonController {
  createOrReturnSkillID = asyncHandler(async (req, res) => {
    const validateRequest = skillInputSchema.parse(req.body);
    const skill_slug = slugify(validateRequest.skillName);
    const skillIfExists = await SkillRepository.checkSkillExists(skill_slug);
    if (!skillIfExists) {
      const newskill = await SkillRepository.createSkill(
        validateRequest.skillName
      );
      return sendSuccess(
        res,
        "Skill created",
        { skill_id: newskill._id },
        STATUS_CODES.CREATED
      );
    }
    return sendSuccess(res, "Skill already exists", {
      skill_id: skillIfExists._id,
    });
  });

  createOrReturnMultipleSkillIDs = asyncHandler(async (req, res) => {
    // Validate input as array of strings
    console.log(req.body);
    const validateRequest = z
      .object({
        skillNames: z.array(
          z
            .string()
            .regex(
              /^[A-Za-z\s]+$/,
              "Skill name must contain only letters and spaces"
            )
        ),
      })
      .parse(req.body);

    const skillIds: string[] = [];

    for (const skillName of validateRequest.skillNames) {
      const skill_slug = slugify(skillName);
      const skillIfExists = await SkillRepository.checkSkillExists(skill_slug);

      if (!skillIfExists) {
        const newSkill = await SkillRepository.createSkill(skillName);
        skillIds.push(newSkill._id as string);
      } else {
        skillIds.push(skillIfExists._id as string);
      }
    }

    return sendSuccess(
      res,
      "Skills processed successfully",
      { skill_ids: skillIds },
      STATUS_CODES.CREATED
    );
  });

  createSingleCandidate = asyncHandler(async (req, res) => {
    console.log(req.body);
    const validateRequest = candidateInputSchema.parse(req.body);
    const newlyCreatedCandidate = await CandidateRepository.createCandidate({
      first_name: validateRequest.first_name,
      last_name: validateRequest.last_name,
      contact: validateRequest.contact,
      arrival: validateRequest.arrival,
      skills: validateRequest.skills,
      status: validateRequest.status,
      recruiter_id: req.user.id,
    });
    req.flash("success_msg", "Candidate created successfully");
    return sendSuccess(
      res,
      "Candidate created",
      newlyCreatedCandidate,
      STATUS_CODES.CREATED
    );
  });

  createBulkCandidate = asyncHandler(async (req, res) => {
    if (!req.file) {
      return sendError(
        res,
        "No File was uploaded",
        null,
        STATUS_CODES.BAD_REQUEST
      );
    }

    // Local CSV row schema (keeps your exported csvCandidateSchema unchanged)
    const csvRowSchema = z.object({
      first_name: z.string().min(3, "First name should be 3 character long"),
      last_name: z.string().min(3, "Last name should be 3 character long"),
      email: z.string().email("Email is not valid"),
      phone: z
        .string()
        .min(10, "Phone number is too short")
        .regex(/^[+\d\s()\-]+$/, "Invalid phone number format"),
      scheduledDate: z
        .string()
        .refine(
          (val) => isValid(parse(val, "dd-MM-yyyy", new Date())),
          "Invalid scheduled date"
        )
        .transform((val) => parse(val, "dd-MM-yyyy", new Date())),
      // optional columns if present in CSV
      actualDate: z
        .string()
        .optional()
        .transform((val) =>
          val ? parse(val, "dd-MM-yyyy", new Date()) : undefined
        )
        .refine((d) => d === undefined || isValid(d as Date), {
          message: "Invalid actual date",
        }),
      status: z
        .enum([
          "new",
          "assigned",
          "hired",
          "rejected",
          "in-progress",
          "completed",
        ])
        .optional(),
      // skills come as CSV of names: "Carpentry, Masonry"
      skills: z.string().min(1, "At least one skill is required"),
    });

    const rows: Record<string, string>[] = [];
    try {
      // Stream CSV → collect rows
      await pipeline(
        fs.createReadStream(req.file.path),
        csv().on("data", (row) => rows.push(row))
      );
    } catch (err) {
      // Clean up file and fail
      fs.unlink(req.file.path, () => {});
      return sendError(
        res,
        "Failed to read CSV",
        err,
        STATUS_CODES.BAD_REQUEST
      );
    } finally {
      // Always attempt cleanup of the temp upload
      fs.unlink(req.file.path, () => {});
    }

    const createdIds: string[] = [];
    const errors: Array<{ index: number; error: any; raw?: any }> = [];

    // Cache: slug -> skillId to avoid duplicate DB hits
    const skillIdCache = new Map<string, string>();

    const getSkillIdByName = async (
      nameRaw: string
    ): Promise<string | null> => {
      const name = nameRaw.trim();
      if (!name) return null;
      const skill_slug = slugify(name, { lower: true, strict: true });

      const cached = skillIdCache.get(skill_slug);
      if (cached) return cached;

      const existing = await SkillRepository.checkSkillExists(skill_slug);
      if (existing) {
        console.log(name)
        skillIdCache.set(skill_slug, String(existing._id));
        return String(existing._id);
      }

      const created = await SkillRepository.createSkill(name);
      skillIdCache.set(skill_slug, String(created._id));
      return String(created._id);
    };

    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i];

      // Validate row
      const parsed = csvRowSchema.safeParse(raw);
      if (!parsed.success) {
        errors.push({ index: i, error: parsed.error.flatten(), raw });
        continue;
      }
      const r = parsed.data;

      try {
        // Resolve skill IDs (parallel per candidate)
        const skillNames = r.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        if (skillNames.length === 0) {
          errors.push({ index: i, error: "No valid skill names", raw });
          continue;
        }

        const skillIds = (await Promise.all(skillNames.map(getSkillIdByName)))
          .filter((x): x is string => Boolean(x))
          .map((id) => new Types.ObjectId(id));

        // Construct candidate payload
        const candidatePayload = {
          first_name: r.first_name,
          last_name: r.last_name,
          contact: {
            email: r.email,
            phone: r.phone,
          },
          arrival: {
            scheduledDate: r.scheduledDate as Date,
            actualDate: (r.actualDate as Date | undefined) || undefined,
            status: "scheduled" as const,
          },
          skills: skillIds,
          status:"new",
          recruiter_id: req.user.id,
        };

        const created = await CandidateRepository.createCandidate(
          candidatePayload
        );
        createdIds.push(String(created._id));
      } catch (e) {
        console.log(e)
        errors.push({ index: i, error: e, raw });
      }
    }

    return sendSuccess(
      res,
      "Candidate added successfully",
      {
        createdCount: createdIds.length,
        createdIds,
        errorCount: errors.length,
        // optional: trim or omit raw/errors in production
        errors,
      },
      STATUS_CODES.OK
    );
  });

  getFiltredCandidates = asyncHandler(async (req, res) => {
    const candidate = await CandidateRepository.getCandidates(req.query);
    return sendSuccess(
      res,
      "Filterd Candidates",
      candidate,
      STATUS_CODES.ACCEPTED
    );
  });

  /**
   * ====== EJS REDERS ====
   **/
  renderCreateCandidate = asyncHandler(async (req, res) => {
    res.render("createcandidate", { default_user: req.user });
  });

  renderBulkUploadCandidates = asyncHandler(async (req, res) => {
    res.render("bulk-candidates", { default_user: req.user });
  });

  renderCandidateList = asyncHandler(async (req, res) => {
    res.render("candidatelist", { default_user: req.user });
  });
}

const commonController = new CommonController()

export default commonController