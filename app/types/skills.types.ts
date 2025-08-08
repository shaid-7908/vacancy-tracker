import { Document } from "mongoose";

export interface SkillDocument extends Document{
    name:String,
    skill_slug:String
}