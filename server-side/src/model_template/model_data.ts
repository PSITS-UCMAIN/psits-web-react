import { IAdmin, IAdminDocument } from "../models/admin.interface";
import { IStudent } from "models/student.interface";
import {
  IAdminModelData,
  IRoleModelData,
  IUserModelData,
  IAdminModelDataDocument,
} from "./model_data.interface";

export const admin_model = (admin: IAdminDocument): any => {
  return {
    _id: admin._id,
    id_number: admin.id_number,
    name: admin.name,
    email: admin.email,
    course: admin.course,
    year: admin.year,
    role: "Admin",
    position: admin.position,
    campus: admin.campus ?? "",
    access: admin.access,
    status: admin.status ?? "True",
  };
};
export const user_model = (user: IStudent): IUserModelData => {
  return {
    id_number: user.id_number,
    name: user.first_name + " " + user.middle_name + " " + user.last_name,
    email: user.email,
    course: user.course,
    year: user.year,
    role: "Student",
    position: "Student",
    campus: user.campus,
    status: user.status,
  };
};
export const role_model = (user: IStudent): IRoleModelData => {
  return {
    id_number: user.id_number,
    name: user.first_name + " " + user.middle_name + " " + user.last_name,
    email: user.email,
    course: user.course,
    year: user.year,
    role: user.role,
    position: "Student",
    status: user.status,
    campus: user.campus,
    isRequest: user.isRequest,
    adminRequest: user.adminRequest,
  };
};
