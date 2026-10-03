import mongoose, { Schema, Document } from "mongoose";
import { IHistory } from "./history.interface";

export interface IHistoryDocument extends IHistory, Document {}

const historySchema = new Schema<IHistoryDocument>({
  membership_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Membership",
    index: true,
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    index: true,
  },
  reference_code: {
    // `require` (the typo used on the other fields below) is not a Mongoose
    // option, so this was never enforced — that is how a null and an empty
    // string reached a unique field.
    type: String,
    unique: true,
    required: true,
  },

  date: {
    type: Date,
    required: true,
  },
  admin: {
    type: String,
    required: true,
  },
  total: {
    type: Number,
    required: true,
  },
});

export const MembershipHistory = mongoose.model<IHistoryDocument>(
  "membershipHistory",
  historySchema
);
