import { Request } from "express";
import { Student } from "../models/student.model";
import { IStudent } from "../models/student.interface";
import { Admin } from "../models/admin.model";
import { IAdmin } from "../models/admin.interface";
import { IAdminDocument } from "../models/admin.interface";
import { admin_model, role_model } from "../model_template/model_data";
import { account_status } from "../enums/status.enums";
import { psits_roles, student_roles } from "../enums/role.enums";
import { logService } from "./log.service";
import { logs_action } from "../enums/logs.enums";
import bcrypt from "bcryptjs";
import { studentService } from "./student.service";
import { orderService } from "./order.service";
import { AppError } from "../util/app.error.util";
import { IResponseMessage } from "../models/global.response.interface";
import { ILog } from "../models/log.interface";
import { ICreateAdmin } from "../models/admin.interface";

class AdminService {
  //Update One Dynamic Admin
  updateOneDynamic = async (id_number: String, parameters: any) => {
    const result = await Admin.updateOne({ id_number }, { $set: parameters });

    if (result.matchedCount === 0) {
      throw new AppError("Admin not found", 404);
    }

    if (result.modifiedCount === 0) {
      return { status: true, message: "No changes made" };
    }

    return { status: true, message: "Admin updated successfully" };
  };
  //Admin Dashboard Count
  getAdminDashboardCount = async () => {
    const [
      bsitCount,
      bscsCount,
      actCount,
      year1Count,
      year2Count,
      year3Count,
      year4Count,
    ] = await Promise.all([
      Student.countDocuments({ course: "BSIT" }),
      Student.countDocuments({ course: "BSCS" }),
      Student.countDocuments({ course: "ACT" }),
      Student.countDocuments({ year: 1 }),
      Student.countDocuments({ year: 2 }),
      Student.countDocuments({ year: 3 }),
      Student.countDocuments({ year: 4 }),
    ]);

    return {
      courses: {
        BSIT: bsitCount,
        BSCS: bscsCount,
        ACT: actCount,
      },
      years: {
        year1: year1Count,
        year2: year2Count,
        year3: year3Count,
        year4: year4Count,
      },
    };
  };
  //Get all admin accounts , used in Settings and AllOfficers.jsx
  getAll = async (req: any) => {
    const access = req.admin.access;
    const roleFilter = req.query.role_filter;

    const officers = await Admin.find({ status: account_status.ACTIVE });
    if (!officers) {
      throw new AppError("No officer found!", 404);
    }
    let users = officers.map((officer) => admin_model(officer));

    const data =
      access === psits_roles.HEAD_FINANCE || access === psits_roles.FINANCE
        ? users.filter(
            (user) =>
              user.access !== psits_roles.EXECUTIVE &&
              user.access !== psits_roles.ADMIN
          )
        : access === psits_roles.EXECUTIVE
          ? users.filter((user) => user.access !== psits_roles.ADMIN)
          : users;

    if (roleFilter && typeof roleFilter === "string" && roleFilter !== "all") {
      return data.filter(
        (user) =>
          user.access ===
          psits_roles[roleFilter.toUpperCase() as keyof typeof psits_roles]
      );
    }

    return data;
  };
  //Get all members under admin
  getAllMembers = async () => {
    const rolesToFind = [
      student_roles.DEVELOPER,
      student_roles.OFFICER,
      student_roles.MEDIA,
      student_roles.VOLUNTEER,
    ];
    const members: IStudent[] = await Student.find({
      role: { $in: rolesToFind },
      isRequest: false,
    });
    if (!members) {
      throw new AppError("No members found!", 404);
    }
    const users = members.map((member) => role_model(member));

    return users;
  };
  //Get all suspend admin account
  getAllSuspend = async () => {
    const officers = await Admin.find({ status: account_status.SUSPENDED });
    if (!officers) {
      throw new AppError("No suspended account", 404);
    }
    const users = officers.map((officer) => admin_model(officer));
    return users;
  };
  //Edit Admin Account
  editAdmin = async (req: Request) => {
    const { id_number, name, position, email, course, year, campus, githubUsername } = req.body;

    const admin: IAdminDocument | null = await Admin.findOne({
      id_number: req.body.id_number,
    });

    if (!admin) {
      throw new AppError("No admin found!", 404);
    }

    const updateFields: Record<string, unknown> = {
      name,
      position,
      campus,
      email,
      course,
      year,
    };
    if (githubUsername !== undefined) {
      updateFields.githubUsername = githubUsername || null;
    }

    const adminResult = await Admin.updateOne(
      { id_number: id_number },
      { $set: updateFields }
    );

    if (adminResult.modifiedCount > 0) {
      const params = {
        admin: req.admin.name,
        admin_id: req.admin._id,
        action: logs_action.EDITED_ADMIN,
        target: `${id_number} - ${name}`,
        target_id: admin?._id,
        target_model: "Admin",
      };
      //Run Log
      await logService.create(params);

      return { status: true, message: "Officer updated successfully" };
    } else {
      return {
        status: false,
        error: "No officer found with the provided ID",
      };
    }
  };
  //Change Admin Password
  changePassword = async (req: Request) => {
    const admin: IAdminDocument | null = await Admin.findOne({
      id_number: req.body.id_number,
    });

    if (!admin) {
      throw new AppError("Admin not found!", 404);
    }

    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    admin.password = hashedPassword;
    await admin.save();

    const params = {
      admin: req.admin.name,
      admin_id: req.admin._id,
      action: logs_action.CHANGE_PASSWORD,
      target: `${admin.id_number} - ${admin.name}`,
      target_id: admin._id,
      target_model: "Admin",
    };
    //Runs Log
    await logService.create(params);

    return { status: true, message: "Password changed successfully" };
  };
  //Suspend Specific Admin Account
  suspend = async (req: Request) => {
    const { id_number } = req.body;

    const updatedAdmin: IResponseMessage = await this.updateOneDynamic(
      id_number,
      {
        status: account_status.SUSPENDED,
      }
    );

    if (updatedAdmin.status) {
      const params = {
        admin: req.admin.name,
        admin_id: req.admin._id,
        action: logs_action.SUSPEND,
        target: `${id_number}`,
        target_model: "Admin",
      };
      //Runs Log
      await logService.create(params);
      return { status: true, message: "Admin status updated to Suspend" };
    } else {
      return {
        status: false,
        message: "Admin not found or already suspended",
      };
    }
  };

  suspendByIdNumber = async (id_number: string) => {
    const updatedAdmin: IResponseMessage = await this.updateOneDynamic(
      id_number,
      {
        status: account_status.SUSPENDED,
      }
    );
    if (!updatedAdmin.status) {
      throw new AppError("Admin not found or already suspended", 404);
    }
    return { message: "Admin account suspended", id_number };
  };
  //Remove role of members
  removeRole = async (req: Request) => {
    const { id_number } = req.body;

    const updatedRole: IResponseMessage = await studentService.updateOneDynamic(
      id_number,
      {
        role: student_roles.GENERAL,
      }
    );

    //Parameterized
    const first_params = {
      id_number,
      order_status: "Pending",
    };
    const second_params = {
      role: student_roles.GENERAL,
    };
    //Run Dynamic Update Query
    const updatedStudentOrder: IResponseMessage =
      await orderService.updateOneDynamic(first_params, second_params);
    //For logs
    const student = await studentService.getSpecific(id_number);

    if (updatedRole || updatedStudentOrder) {
      const params = {
        admin: req.admin.name,
        admin_id: req.admin._id,
        action: logs_action.REMOVE_ROLE,
        target: `${id_number} `,
        target_id: student?._id,
        target_model: "Member",
      };
      //Runs Log
      await logService.create(params);
      return { status: true, message: "Role removed successfully" };
    } else {
      return { status: false, message: "Student not found" };
    }
  };
  //Restore admin account
  restore = async (req: Request) => {
    const { id_number } = req.body;

    const admin = await this.retrieveSpecific(req.body.id_number);

    if (!admin) {
      throw new AppError("No admin found!", 404);
    }

    const updatedAdmin: IResponseMessage = await this.updateOneDynamic(
      id_number,
      {
        status: account_status.ACTIVE,
      }
    );

    if (updatedAdmin) {
      // Log the restore officer action
      const params = {
        admin: req.admin.name,
        admin_id: req.admin._id,
        action: logs_action.RESTORE,
        target: `${id_number} - ${admin?.name}`,
        target_id: admin?._id,
        target_model: "Admin",
      };
      //Runs Log
      await logService.create(params);

      return { status: 200, message: "Admin status updated to Active" };
    } else {
      return { status: 404, message: "Admin not found or already active" };
    }
  };
  //Request role for member through admin
  requestRole = async (req: Request) => {
    const { id_number, role, admin } = req.body;

    //
    //Parametirized updated
    const params = {
      role: role,
      isRequest: true,
      adminRequest: admin,
    };
    //Run update
    const updatedRole: IResponseMessage = await studentService.updateOneDynamic(
      id_number,
      params
    );

    if (updatedRole.status) {
      //Parametirized Logs
      const log_params = {
        admin: req.admin.name,
        admin_id: req.admin._id,
        action: logs_action.REQUEST_ROLE,
        target: role + " request",
        target_model: "Member",
      };
      //Runs Log
      await logService.create(log_params);
      return { status: true, message: "Role updated successfully" };
    } else {
      return { status: false, message: "Student not found" };
    }
  };
  //Get all request member data who've in pending status
  getAllMemberRequest = async () => {
    const students: IStudent[] = await studentService.getAllStudents({
      isRequest: true,
    });
    if (!students) {
      throw new AppError("No student found!", 404);
    }
    const user = students.map((student) => role_model(student));
    return user;
  };
  //Get all admin request account creation
  getAllAdminRequest = async () => {
    const admin: IAdmin[] = await this.fetch({
      status: account_status.PENDING,
    });
    if (!admin) {
      throw new AppError("No admins found!", 404);
    }
    const users = admin.map((admins) => ({
      id_number: admins.id_number,
      email: admins.email,
      name: admins.name,
      course: admins.course,
      year: admins.year,
      role: admins.position,
      status: admins.status,
    }));
    return users;
  };
  //Approve Member Role as admin
  approveMember = async (req: Request) => {
    const { id_number } = req.body;
    const student = await studentService.getSpecific(id_number);
    if (!student) {
      throw new AppError("No student found", 404);
    }
    const updatedRole = await studentService.updateOneDynamic(id_number, {
      isRequest: false,
    });

    if (updatedRole.status) {
      //Parametirized Logs
      const log_params = {
        admin: req.admin.name,
        admin_id: req.admin._id,
        action: logs_action.APPROVE_ROLE,
        target: id_number,
        target_model: "Member",
      };
      //Runs Log
      await logService.create(log_params);
      return { status: true, message: "Role approved successfully" };
    } else {
      return { status: false, message: "Student not found" };
    }
  };
  //Decline Member role as admin
  declineMember = async (req: Request) => {
    const { id_number } = req.body;

    try {
      const updatedRole = await studentService.updateOneDynamic(id_number, {
        role: student_roles.GENERAL,
        isRequest: false,
      });

      if (updatedRole.status) {
        //Parametirized Logs
        const log_params = {
          admin: req.admin.name,
          admin_id: req.admin._id,
          action: logs_action.DECLINE_ROLE,
          target: id_number,
          target_model: "Member",
        };
        //Runs Log
        await logService.create(log_params);
        return { status: true, message: "Role declined successfully" };
      } else {
        return { status: false, message: "Student not found" };
      }
    } catch (error) {
      console.error("Error updating student role:", error);
      return { status: false, message: "An error occurred", error: error };
    }
  };
  //Create Admin Account
  create = async (body: ICreateAdmin, req: Request) => {
    //Check if id number existed
    const admin = await Admin.findOne({ id_number: body.id_number });
    if (admin) {
      throw new AppError("Already have an account!", 404);
    }

    const hashedPassword = await bcrypt.hash(body.password, 10);
    const newAdmin: IAdminDocument = new Admin({
      id_number: body.id_number,
      name: body.name,
      password: hashedPassword,
      email: body.email,
      position: body.position,
      course: body.course,
      year: body.year,
      campus: body.campus,
      status: account_status.PENDING,
      access: psits_roles.STANDARD,
    });
    await newAdmin.save();

    const log_params = {
      admin: req.admin.name,
      admin_id: req.admin._id,
      action: logs_action.CREATE_ADMIN,
      target: body.id_number,
      target_model: "Admin",
    };
    //Runs Log
    await logService.create(log_params);

    return { status: true, message: "Account Creation successful" };
  };
  //Approved Admin Account
  approveAdmin = async (req: Request) => {
    const { id_number } = req.body;

    const updatedRole = await this.updateOneDynamic(id_number, {
      status: account_status.ACTIVE,
    });

    if (updatedRole.status) {
      const log_params = {
        admin: req.admin.name,
        admin_id: req.admin._id,
        action: logs_action.APPROVE_ADMIN,
        target: id_number,
        target_model: "Admin",
      };
      //Runs Log
      await logService.create(log_params);
      return { status: true, message: "Admin Account approved successfully" };
    } else {
      throw new AppError("Admin not found!", 404);
    }
  };
  //Decline Admin Account
  declineAdmin = async (req: Request) => {
    const { id_number } = req.body;

    const deletedAdmin = await Admin.deleteOne({
      id_number,
      status: account_status.PENDING,
    });

    if (deletedAdmin.deletedCount > 0) {
      const log_params = {
        admin: req.admin.name,
        admin_id: req.admin._id,
        action: logs_action.DECLINE_ADMIN,
        target: id_number,
        target_model: "Admin",
      };
      //Runs Log
      await logService.create(log_params);
      return { status: true, message: "Admin account deleted successfully" };
    } else {
      throw new AppError("Admin not found!", 404);
    }
  };
  //Change access in admin
  changeAccess = async (req: Request) => {
    const { id_number, newAccess } = req.body;

    if (!id_number || !newAccess) {
      return { status: false, message: "id_number and newAccess are required" };
    }

    let accessValue: string | undefined;

    if (Array.isArray(newAccess)) {
      if (newAccess.length === 0) {
        return { status: false, message: "newAccess cannot be empty" };
      }
      const normalized = newAccess[0].trim().toUpperCase();
      accessValue = normalized as keyof typeof psits_roles;

      if (!accessValue) {
        return { status: false, message: "Invalid access level" };
      }
    } else if (typeof newAccess === "string") {
      const upper = newAccess.toUpperCase();
      accessValue = psits_roles[upper as keyof typeof psits_roles];
      if (!accessValue) {
        return { status: false, message: "Invalid access level" };
      }
    } else {
      return {
        status: false,
        message: "newAccess must be a string or array of strings",
      };
    }

    const adminToUpdate = await this.retrieveSpecific(id_number);

    if (!adminToUpdate) {
      throw new AppError("Admin not found!", 404);
    }

    adminToUpdate.access = accessValue;
    await adminToUpdate.save();

    const log_params = {
      admin: req.admin.name,
      admin_id: req.admin._id,
      action: logs_action.CHANGE_ACCESS,
      target: "Change Access to " + accessValue,
      target_model: "Admin",
    };
    //Runs Log
    await logService.create(log_params);

    return { status: true, message: "Access updated successfully" };
  };
  //
  //Retrive Specific Admin
  retrieveSpecific = async (id_number: String) => {
    const admin = await Admin.findOne({ id_number });
    if (!admin) {
      throw new AppError("No admin found!", 404);
    }
    return admin;
  };
  //Fetch all admin with dynamic params
  fetch = async (params: any) => {
    const admin = await Admin.find(params);
    if (!admin) {
      throw new AppError("No admin found!", 404);
    }
    return admin;
  };
}

const adminService = new AdminService();

export { adminService };
