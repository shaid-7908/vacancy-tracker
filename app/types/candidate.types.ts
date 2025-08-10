import { Document, Types } from "mongoose";

interface Contact{
    phone:String,
    email:String
}

interface Arrival {
  scheduledDate: Date;
  actualDate: Date | undefined ;
  status: String;
}

export interface CandidateDocument extends Document{
    first_name:String,
    last_name:String,
    contact:Contact,
    skills:Types.ObjectId[],
    arrival:Arrival,
    status:String,
    recruiter_id:Types.ObjectId
}