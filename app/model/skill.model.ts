import { model, Schema } from "mongoose";
import { SkillDocument } from "../types/skills.types";

const SkillSchema = new Schema<SkillDocument>({
    name:{
        type:String,
        required:true
    },
    skill_slug:{
      type:String,
      required:true,
      unique:true
    }
})

SkillSchema.index({name:1})
SkillSchema.index({skill_slug:1},{unique:true})

const SkillModel = model<SkillDocument>('skills',SkillSchema)

export {SkillModel}