import mongoose, { Schema, Document } from "mongoose";
import { IAdmin } from "./admin.interface";

export interface IAdminDocument extends IAdmin, Document {}

const adminSchema = new Schema<IAdminDocument>({
  id_number: { type: String, unique: true },
  email: { type: String },
  password: { type: String, required: true },
  name: { type: String, required: true },
  course: { type: String, required: true },
  year: { type: String, required: true },
  position: { type: String, required: true },
  status: { type: String },
  campus: { type: String },
  access: { type: String, default: "admin" },
});

export const Admin = mongoose.model<IAdminDocument>("Admin", adminSchema);
