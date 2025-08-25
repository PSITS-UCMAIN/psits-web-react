import mongoose, { Schema, Document } from "mongoose";
import { ILog } from "./log.interface";

export interface ILogDocument extends ILog, Document {}

const logSchema = new Schema<ILogDocument>({
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
  },
  admin: {
    type: String,
    required: true,
  },
  admin_id: {
    type: Schema.Types.ObjectId,
    ref: "Admin",
    required: false,
  },
  action: {
    type: String,
    required: true,
  },
  target: {
    type: String,
    required: false,
  },
  target_id: {
    type: Schema.Types.ObjectId,
    required: false,
  },
  target_model: {
    type: String,
    required: false, // Specifies the collection name for the `target_id` reference
    enum: ["Admin", "Student", "Merchandise", "Order", "Merchandise Report"], // Allowed models
  },
});

export const Log = mongoose.model<ILogDocument>("Log", logSchema);
