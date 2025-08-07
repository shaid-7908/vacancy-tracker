import mongoose, { Schema, model } from "mongoose";
import { UserDocument } from "../types/user.types";

const userSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    profileImage: { type: String },
    dateOfBirth: { type: Date },
    password: { type: String, required: true },
    refreshToken: { type: String },
    role: { type: String, enum: ["manager", "admin", "recruiter"] },
    isVerified: { type: Boolean, default: false },
    current_status:{
      type:String,
      enum:["active","inactive"]
    },
    state: {
      type: String,
    },
    pincode: {
      type: Number,
    },
    city: {
      type: String,
    },
    addressline1: {
      type: String,
    },
    location_coord: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: undefined, // so it's optional
      },
    },
  },
  {
    timestamps: true,
  }
);

export const UserModel = model<UserDocument>("users", userSchema);

const OTPSchema = new Schema({
  user_id:{
    type:Schema.Types.ObjectId,
    ref:'users'
  },
  user_email:{
    type:String
  },
  user_otp:{
    type:Number
  },
  user_token:{
    type:String
  }
},{timestamps:true})

OTPSchema.index({user_email:1})
OTPSchema.index({ user_id: 1 });


export const OTPModel = model("user_otps",OTPSchema)
