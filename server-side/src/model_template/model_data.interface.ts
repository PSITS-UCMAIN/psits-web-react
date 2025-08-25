import { Document } from "mongoose";

export interface IAdminModelData {
  id_number: string;
  name: string;
  email?: string;
  course: string;
  year: string;
  role: string;
  position: string;
  campus: string;
  access: string;
  status: string;
}
export interface IUserModelData {
  id_number: string;
  name: string;
  email?: string;
  course: string;
  year: number;
  role: string;
  position: string;
  campus: string;
  status: string;
}
export interface IRoleModelData {
  id_number: string;
  name: string;
  email?: string;
  course: string;
  year: number;
  role: string;
  position: string;
  campus: string;
  status: string;
  isRequest: boolean;
  adminRequest: string;
}

export interface IAdminModelDataDocument extends IAdminModelData, Document {}
