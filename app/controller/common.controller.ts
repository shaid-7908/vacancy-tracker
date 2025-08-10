import slugify from "slugify";
import { asyncHandler } from "../utils/async.hadler";
import * as z from 'zod'
import { SkillRepository } from "../repository/skill.repository";
import { sendSuccess } from "../utils/unified.response";
import STATUS_CODES from "../utils/status.codes";
import { CandidateRepository } from "../repository/candidate.repository";
import { Types } from "mongoose";


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
    console.log(req.body)
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

  createSingleCandidate = asyncHandler(async (req,res)=>{
    console.log(req.body)
     const validateRequest = candidateInputSchema.parse(req.body)
     const newlyCreatedCandidate = await CandidateRepository.createCandidate({
      first_name:validateRequest.first_name,
      last_name:validateRequest.last_name,
      contact:validateRequest.contact,
      arrival:validateRequest.arrival,
      skills:validateRequest.skills,
      status:validateRequest.status,
      recruiter_id:req.user.id
     })
     req.flash('success_msg',"Candidate created successfully")
     return sendSuccess(res,'Candidate created',newlyCreatedCandidate,STATUS_CODES.CREATED)
  })

  getFiltredCandidates = asyncHandler(async (req,res)=>{
     const candidate = await CandidateRepository.getCandidates(req.query)
     return sendSuccess(res,'Filterd Candidates',candidate,STATUS_CODES.ACCEPTED)
  })

  /**
   * ====== EJS REDERS ====
   **/
  renderCreateCandidate = asyncHandler(async (req, res) => {
    res.render("createcandidate", { default_user: req.user });
  });

  renderBulkUploadCandidates = asyncHandler(async (req, res) => {
    res.render("bulk-candidates", { default_user: req.user });
  });

  renderCandidateList = asyncHandler(async (req,res)=>{
    res.render("candidatelist",{default_user:req.user})
  })
}

const commonController = new CommonController()

export default commonController