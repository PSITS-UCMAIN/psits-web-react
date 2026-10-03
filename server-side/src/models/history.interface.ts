import mongoose from "mongoose";

export interface IHistory {
  membership_id?: mongoose.Types.ObjectId;
  student?: mongoose.Types.ObjectId;
  reference_code: string;
  date: Date;
  admin: string;
  total: number;
}
