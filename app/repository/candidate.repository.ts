import { CandidateModel } from "../model/candidate.model";
import { CandidateDocument } from "../types/candidate.types";


export class CandidateRepository{
    /*
    create single candidate
    */
    static async createCandidate(candidateData:Partial<CandidateDocument>):Promise<CandidateDocument>{
       try {
          const newcandidate = await CandidateModel.create(candidateData)
          return newcandidate
       } catch (error) {
        console.log(error)
        throw new Error(
          `Failed to create candidate:${
            error instanceof Error ? error.message : "Unknown error"
          } `
        );
       }
    }
    static async getCandidates(query:any){
        const {search,arrivalStatus,candidateStatus} =query
        const matchState:any = {}
        if(search){
          const searchRegx = new RegExp(search as string, "i");
          matchState.$or = [
            { first_name: { $regex: searchRegx } },
            { last_name: { $regex: searchRegx } },
            { "skillsDocs.name": { $regex: searchRegx} },
            { "skillsDocs.skill_slug": { $regex: searchRegx } },
          ];
        }
        if(arrivalStatus){
          matchState["arrival.status"] ={$regex:new RegExp(arrivalStatus as string,'i')}
        }
        if(candidateStatus){
          matchState.status = {$regex:new RegExp(candidateStatus as string,'i')}
        }
        const pipeline = [
          {
            $lookup: {
              from: "skills",
              localField: "skills",
              foreignField: "_id",
              as: "skillsDocs",
            },
          },
          {$match:matchState}
        ];
        try{

          const candidates = await CandidateModel.aggregate(pipeline)
          return candidates
        }catch(error){
          throw new Error(
            `Failed to create candidate:${
              error instanceof Error ? error.message : "Unknown error"
            } `
          );
        }
    }


}