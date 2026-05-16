import { Schema, Document, model } from "mongoose";
import { IEligibleCertificate } from "./eligibleCertificate.interface";

export interface IEligibleCertificateDocument
  extends IEligibleCertificate,
    Document {}

export const eligibleCertificateSchema =
  new Schema<IEligibleCertificateDocument>({
    evaluationId: { type: String, required: true },
    eventId: { type: Schema.Types.ObjectId, ref: "event", required: true },
    attendeeId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    studentIdNumber: { type: String }, // Optional: for quick display without populate
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: String },
  });

// Compound index to prevent duplicates
eligibleCertificateSchema.index(
  { eventId: 1, attendeeId: 1 },
  { unique: true }
);

export const EligibleCertificate = model<IEligibleCertificateDocument>(
  "EligibleCertificate",
  eligibleCertificateSchema
);
