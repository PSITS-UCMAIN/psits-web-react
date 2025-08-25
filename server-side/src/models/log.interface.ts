import { Types } from "mongoose";
export interface ILog {
  timestamp: Date;
  admin: string;
  admin_id: Types.ObjectId;
  action: string;
  target: string;
  target_id: Types.ObjectId;
  target_model: string;
}
