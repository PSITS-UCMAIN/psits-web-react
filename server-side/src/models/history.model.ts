import mongoose, { Schema, Document } from "mongoose";
import { IHistory } from "./history.interface";

export interface IHistoryDocument extends IHistory, Document {}

const historySchema = new Schema<IHistoryDocument>({
  id_number: {
    type: String,
    require: true,
  },
  rfid: {
    type: String,
  },
  reference_code: {
    type: String,
    unique: true,
    require: true,
  },
  name: {
    type: String,
    require: true,
  },
  year: {
    type: String,
    require: true,
  },
  course: {
    type: String,
    require: true,
  },
  type: {
    type: String,
    require: true,
  },
  date: {
    type: Date,
    require: true,
  },
  admin: {
    type: String,
    require: true,
  },
});

export const MembershipHistory = mongoose.model<IHistoryDocument>(
  "membshipHistory",
  historySchema
);
