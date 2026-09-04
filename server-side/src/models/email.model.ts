import mongoose, { Schema, Document, Types } from "mongoose";
import { IEmail } from "./email.interface";

export interface IEmailDocument extends IEmail, Document {}

const emailSchema = new Schema<IEmailDocument>({
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  studentId: {
    type: Schema.Types.ObjectId,
    ref: "Student",
    default: null,
  },
  email: { type: String, required: true },
  status: { type: String, default: "pending", required: true },
  subtype: { type: String },
  referenceCode: { type: String },
  payload: { type: String },
  htmlBody: { type: String },
  retryCount: { type: Number, default: 0 },
  emailId: { type: String },
});

export const EmailQueue = mongoose.model<IEmailDocument>(
  "EmailQueue",
  emailSchema
);
