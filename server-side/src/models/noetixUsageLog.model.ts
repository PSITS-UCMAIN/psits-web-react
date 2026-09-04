import mongoose, { Schema, Document } from "mongoose";

export interface INoetixUsageLog {
  session_id: string;
  admin: string;
  admin_id: mongoose.Types.ObjectId;
  goal: string;
  tool_names: string[];
  success: boolean;
  error?: string;
  iterations: number;
  mode: "agent" | "goal";
  timestamp: Date;
}

export interface INoetixUsageLogDocument extends INoetixUsageLog, Document {}

const noetixUsageLogSchema = new Schema<INoetixUsageLogDocument>(
  {
    session_id: { type: String, required: true },
    admin: { type: String, required: true },
    admin_id: { type: Schema.Types.ObjectId, ref: "Admin", required: true },
    goal: { type: String, required: true },
    tool_names: { type: [String], default: [] },
    success: { type: Boolean, required: true },
    error: { type: String },
    iterations: { type: Number, required: true },
    mode: { type: String, enum: ["agent", "goal"], required: true },
    timestamp: { type: Date, required: true },
  },
  { timestamps: true }
);

noetixUsageLogSchema.index({ admin_id: 1, timestamp: -1 });
noetixUsageLogSchema.index({ session_id: 1 });
noetixUsageLogSchema.index({ timestamp: -1 });

export const NoetixUsageLog = mongoose.model<INoetixUsageLogDocument>(
  "NoetixUsageLog",
  noetixUsageLogSchema
);
