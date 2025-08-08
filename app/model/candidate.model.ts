import { model, Schema } from "mongoose";
import { CandidateDocument } from "../types/candidate.types";


const ContactSchema = new Schema(
  {
    phone: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
  },
  { _id: false }
); // _id: false prevents creating _id for subdocuments

const ArrivalSchema = new Schema(
  {
    scheduledDate: {
      type: Date,
      required: true,
    },
    actualDate: {
      type: Date,
      required: false,
    },
    status: {
      type: String,
      enum: ["scheduled", "arrived", "no-show"],
      default: "scheduled",
      required: true,
    },
  },
  { _id: false }
);


const CandidateSchema = new Schema<CandidateDocument>({
    first_name:{
        type:String,
        required:true
    },
    last_name:{
        type:String,
        required:true
    },
    contact:ContactSchema,
    arrival:ArrivalSchema,
    skills:{
        type:[Schema.Types.ObjectId],
        required:true,
        ref:'skills'
    },
    status:{
        type:String,
        enum:["new","assigned","hired","rejected"]
    },
    recruiter_id:{
        type:Schema.Types.ObjectId,
        ref:'users'
    }
    
})

const CandidateModel = model<CandidateDocument>('candidates',CandidateSchema)

export { CandidateModel}