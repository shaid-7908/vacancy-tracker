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

const SkillModel = model<SkillDocument>('skills',SkillSchema)

export {SkillModel}