import { SkillDocument } from "../types/skills.types";
import { SkillModel } from "../model/skill.model";
import slugify from 'slugify'

export class SkillRepository{
   static async createSkill(skillname:string):Promise<SkillDocument>{
     try {
        const skill_slug = slugify(skillname)
        const createdSkill = await SkillModel.create({
            name:skillname,
            skill_slug:skill_slug
        })
        return createdSkill
     } catch (error) {
        throw new Error(
          `Failed to create skill:${
            error instanceof Error ? error.message : "Unknown error"
          } `
        );
     }
   }
   static async checkSkillExists(skill_slug:string){
     try{
         const checkForSkill = await SkillModel.findOne({skill_slug:skill_slug})
         return checkForSkill
     }catch(error){
       throw new Error(
         `Failed to check skill: ${
           error instanceof Error ? error.message : "Unknown error"
         }`
       );
     }
   }
}