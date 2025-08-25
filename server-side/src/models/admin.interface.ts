import { Document } from "mongoose";
export interface IAdmin {
  id_number: string;
  email?: string;
  password: string;
  name: string;
  course: string;
  year: string;
  position: string;
  status?: string;
  campus?: string;
  access: string;
}

export interface IAdminDocument extends IAdmin, Document {}
