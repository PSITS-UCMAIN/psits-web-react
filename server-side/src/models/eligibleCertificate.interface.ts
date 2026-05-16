import { Types } from "mongoose";

export interface IEligibleCertificate {
  evaluationId: string;
  eventId: Types.ObjectId;
  attendeeId: Types.ObjectId; // ObjectId reference to Student model
  studentIdNumber?: string; // Denormalized for quick display without populate
  createdAt?: Date;
  createdBy?: string; // admin who added this record
}
