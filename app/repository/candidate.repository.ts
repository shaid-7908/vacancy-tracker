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
        throw new Error(
          `Failed to create candidate:${
            error instanceof Error ? error.message : "Unknown error"
          } `
        );
       }
    }


}