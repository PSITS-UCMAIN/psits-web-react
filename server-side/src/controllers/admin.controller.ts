import { Request, Response } from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { Student } from "../models/student.model";
import { Admin } from "../models/admin.model";
import { Merch } from "../models/merch.model";
import { Orders } from "../models/orders.model";
import { Log } from "../models/log.model";
import { MembershipHistory } from "../models/history.model";
import { format, startOfDay, endOfDay } from "date-fns";
import { admin_model, role_model } from "../model_template/model_data";
import { membershipRequestReceipt } from "../mail_template/mail.template";
import { IMembershipRequest } from "mail_template/mail.interface";
import { IStudent } from "../models/student.interface";
import { IHistory } from "../models/history.interface";
import { IOrders } from "../models/orders.interface";
import { IAdmin, IAdminDocument } from "../models/admin.interface";

export const getSearchStudentByIdController = async (
  req: Request,
  res: Response
) => {
  const { id_number } = req.params;
  try {
    const student = await Student.findOne({
      id_number,
    });

    if (!student) {
      res.status(404).json({
        message: "Student not found!",
      });
    } else {
      res.status(200).json({ data: student });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "An error occurred", error: error });
  }
};

export const approveMembershipController = async (
  req: Request,
  res: Response
) => {
  const { reference_code, id_number, type, admin, rfid, date, cash, total } =
    req.body;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const student: IStudent | null = await Student.findOne({
      id_number,
    }).session(session);

    if (!student) {
      console.error(`Student with id_number ${id_number} not found.`);
      return res.status(404).json({ message: "Student not found" });
    }

    let updateQuery = {};
    if (student.isFirstApplication) {
      updateQuery = {
        membershipStatus: "ACTIVE",
        rfid: rfid,
        isFirstApplication: false,
      };
    } else {
      updateQuery = {
        membershipStatus: "RENEWED",
      };
    }

    await Student.updateOne({ id_number }, { $set: updateQuery }).session(
      session
    );

    const history = new MembershipHistory({
      id_number,
      rfid,
      reference_code,
      type: student.isFirstApplication ? "Membership" : "Renewal",
      name: `${student.first_name} ${student.middle_name} ${student.last_name}`,
      year: student.year,
      course: student.course,
      date: new Date(),
      admin: admin ? admin : req.admin.name,
    });

    const savedHistory = await history.save();

    if (!savedHistory) {
      console.error("Failed to save membership history.");

      return res
        .status(500)
        .json({ message: "Failed to save membership history" });
    }
    await session.commitTransaction();
    session.endSession();

    const data: IMembershipRequest = {
      name: `${student.first_name} ${student.middle_name} ${student.last_name}`,
      reference_code,
      cash: cash ?? 50,
      total: cash ?? 50,
      course: student.course,
      year: student.year,
      admin: admin ?? req.admin.name,
      date: format(new Date(), "MMMM d, yyyy"),
      change: (cash ?? 50) - (cash ?? 50),
    };

    // Call the reusable receipt function
    await membershipRequestReceipt(data, student?.email ?? "");

    return res
      .status(200)
      .json({ message: "Membership approved successfully" });
  } catch (error) {
    console.error("Internal server error:", error);
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: "Internal server error", error: error });
  }
};

export const revokeAllMembershipController = async (
  req: Request,
  res: Response
) => {
  try {
    const revokeMembership = await Student.updateMany({
      membershipStatus: "NOT_APPLIED",
    });

    if (!revokeMembership) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.status(200).json({
      message: "All Student Membership has been revoked  successfully",
    });
  } catch (error) {
    console.error("Error revoking membership student:", error);
    res.status(500).json("Internal Server Error");
  }
};

export const getMembershipHistoryController = async (
  req: Request,
  res: Response
) => {
  try {
    const history: IHistory[] = await MembershipHistory.find().sort({
      date: -1,
    });
    if (!history) {
      res.status(401).json({ message: "No History" });
    }
    res.status(200).json(history);
  } catch (error) {
    console.error("Error fetching membership history:", error);
    res.status(500).json("Internal Server Error");
  }
};

export const getMembershipRequestController = async (
  req: Request,
  res: Response
) => {
  try {
    const students: IStudent[] = await Student.find({
      membershipStatus: "PENDING",
    });
    if (!students) {
      res.status(401).json({ message: "No students request" });
    }
    res.status(200).json(students);
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json("Internal Server Error");
  }
};

export const getStudentsCountController = async (
  req: Request,
  res: Response
) => {
  try {
    const [all, request, deleted] = await Promise.all([
      Student.countDocuments({
        status: "True",
      }),
      Student.countDocuments({ membershipStatus: "PENDING" }),

      Student.countDocuments({ status: "False" }),
    ]);

    res.status(200).json({ all, request, deleted });
  } catch (error) {
    console.error(error);
  }
};

export const getActiveMembershipCountController = async (
  req: Request,
  res: Response
) => {
  try {
    const count = await Student.countDocuments({
      status: "True",
      $or: [{ membershipStatus: "ACTIVE" }, { membershipStatus: "RENEWED" }],
    });
    res.status(200).json({ message: count });
  } catch (error) {
    console.error("Error fetching active membership count:", error);
    res.status(500).json({ error: "Failed to fetch count" });
  }
};

export const getPublishMerchandiseCountController = async (
  req: Request,
  res: Response
) => {
  const now = new Date();

  const count = await Merch.countDocuments({
    is_active: true,
    start_date: { $lte: now },
    end_date: { $gte: now },
  });
  return res.json({ message: count });
};

export const getOrderPlacedCountController = async (
  req: Request,
  res: Response
) => {
  const count = await Orders.countDocuments({ order_status: "Pending" });
  return res.json({ message: count });
};

export const getStudentDashboardCountController = async (
  req: Request,
  res: Response
) => {
  try {
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
      Student.countDocuments({ year: "1" }),
      Student.countDocuments({ year: "2" }),
      Student.countDocuments({ year: "3" }),
      Student.countDocuments({ year: "4" }),
    ]);

    return res.json({
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
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "An error occurred while fetching statistics." });
  }
};

export const getDailySalesController = async (req: Request, res: Response) => {
  try {
    const currentDate = new Date();
    const startOfDayDate = startOfDay(currentDate);
    const endOfDayDate = endOfDay(currentDate);

    const result: IOrders[] = await Orders.aggregate([
      {
        $match: {
          transaction_date: {
            $gte: startOfDayDate,
            $lte: endOfDayDate,
          },
          order_status: "Paid",
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product_name",
          totalQuantity: { $sum: "$items.quantity" },
          totalSubtotal: { $sum: "$items.sub_total" },
        },
      },
      {
        $project: {
          product_name: "$_id",
          totalQuantity: 1,
          totalSubtotal: 1,
          _id: 0,
        },
      },
    ]);

    res.json(result);
  } catch (error) {
    console.error("Error fetching orders by date:", error);
    res.status(500).json({ error: "An error occurred while fetching orders" });
  }
};

export const getAllAdminAccountsController = async (
  req: Request,
  res: Response
) => {
  try {
    const officers = await Admin.find({ status: "Active" });
    const users = officers.map((officer) => admin_model(officer));
    res.status(200).json({ data: users });
  } catch (error) {
    console.error("Error fetching officers:", error);
    res.status(500).json({ error: "Failed to fetch officers" });
  }
};

export const getAllAdminMembersController = async (
  req: Request,
  res: Response
) => {
  try {
    const rolesToFind = ["developer", "officers", "media", "volunteer"];
    const members: IStudent[] = await Student.find({
      role: { $in: rolesToFind },
      isRequest: false,
    });
    const users = members.map((member) => role_model(member));

    res.status(200).json({ data: users });
  } catch (error) {
    console.error("Error fetching officers:", error);
    res.status(500).json({ error: "Failed to fetch officers" });
  }
};

export const getAllSuspendAdminAccountController = async (
  req: Request,
  res: Response
) => {
  try {
    const officers = await Admin.find({ status: "Suspend" });
    const users = officers.map((officer) => admin_model(officer));
    res.status(200).json({ data: users });
  } catch (error) {
    console.error("Error fetching officers:", error);
    res.status(500).json({ error: "Failed to fetch officers" });
  }
};

export const editAdminAccountController = async (
  req: Request,
  res: Response
) => {
  const { id_number, name, position, email, course, year, campus } = req.body;

  try {
    const getAdmin: IAdminDocument | null = await Admin.findOne({
      id_number: req.body.id_number,
    });
    if (!getAdmin) {
      res.status(400).json({ message: "No Admin Found!" });
    }

    const adminResult = await Admin.updateOne(
      { id_number: id_number },
      {
        $set: {
          name: name,
          position: position,
          campus: campus,
          email: email,
          course: course,
          year: year,
        },
      }
    );

    if (adminResult.modifiedCount > 0) {
      const log = new Log({
        admin: req.admin.name,
        admin_id: req.admin._id,
        action: "Edited Admin",
        target: `${id_number} - ${name}`,
        target_id: getAdmin?._id,
        target_model: "Admin",
      });

      await log.save();

      res.status(200).json({ message: "Officer updated successfully" });
    } else {
      res.status(404).json({ error: "No officer found with the provided ID" });
    }
  } catch (error) {
    console.error("Error updating officer:", error);
    res.status(500).json({ error: "Failed to update officer" });
  }
};

export const changeAdminPasswordController = async (
  req: Request,
  res: Response
) => {
  try {
    const getAdmin: IAdminDocument | null = await Admin.findOne({
      id_number: req.body.id_number,
    });

    if (!getAdmin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    getAdmin.password = hashedPassword;
    await getAdmin.save();

    // Log the password change action
    const log = new Log({
      admin: req.admin.name,
      admin_id: req.admin._id,
      action: "Changed Admin Password",
      target: `${getAdmin.id_number} - ${getAdmin.name}`,
      target_id: getAdmin._id,
      target_model: "Admin",
    });

    await log.save();

    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ message: "An error occurred", error: error });
  }
};

export const setSuspendAdminAccountController = async (
  req: Request,
  res: Response
) => {
  const { id_number } = req.body;

  try {
    const updatedAdmin = await Admin.updateOne(
      { id_number },
      {
        $set: {
          status: "Suspend",
        },
      }
    );

    if (updatedAdmin.modifiedCount > 0) {
      res.status(200).json({ message: "Admin status updated to Suspend" });
    } else {
      res.status(404).json({ message: "Admin not found or already suspended" });
    }
  } catch (error) {
    console.error("Error suspending admin:", error);
    res.status(500).json({ message: "An error occurred", error: error });
  }
};

export const setMemberRoleRemoveController = async (
  req: Request,
  res: Response
) => {
  const { id_number } = req.body;

  try {
    const updatedStudent = await Student.updateOne(
      { id_number },
      {
        $set: {
          role: "all",
        },
      }
    );

    const updatedStudentOrder = await Orders.updateMany(
      {
        id_number,
      },
      {
        $set: {
          role: "all",
        },
      }
    );

    if (updatedStudent.modifiedCount > 0) {
      res.status(200).json({ message: "Role removed successfully" });
    } else {
      res.status(404).json({ message: "Student not found" });
    }
  } catch (error) {
    console.error("Error removing role from admin:", error);
    res.status(500).json({ message: "An error occurred", error: error });
  }
};

export const setRestoreAdminAccountController = async (
  req: Request,
  res: Response
) => {
  const { id_number } = req.body;

  try {
    const getAdmin: IAdminDocument | null = await Admin.findOne({
      id_number: req.body.id_number,
    });

    if (!getAdmin) {
      return res.status(400).json({ message: "No Admin Found!" });
    }

    const updatedAdmin = await Admin.updateOne(
      { id_number },
      {
        $set: {
          status: "Active",
        },
      }
    );

    if (updatedAdmin.modifiedCount > 0) {
      // Log the restore officer action
      const log = new Log({
        admin: req.admin.name,
        admin_id: req.admin._id,
        action: "Restored Suspended Admin",
        target: `${id_number} - ${getAdmin?.name}`,
        target_id: getAdmin?._id,
        target_model: "Admin",
      });

      await log.save();

      res.status(200).json({ message: "Admin status updated to Active" });
    } else {
      res.status(404).json({ message: "Admin not found or already active" });
    }
  } catch (error) {
    console.error("Error activating admin:", error);
    res.status(500).json({ message: "An error occurred", error: error });
  }
};

export const setAdminRequestRoleController = async (
  req: Request,
  res: Response
) => {
  const { id_number, role, admin } = req.body;

  try {
    const student: IStudent | null = await Student.findOne({
      id_number: id_number,
    });
    const updatedRole = await Student.updateOne(
      { id_number },
      {
        $set: {
          role: role,
          isRequest: true,
          adminRequest: admin,
        },
      }
    );
    const updatedStudentOrder = await Orders.updateMany(
      { id_number },
      {
        $set: {
          role: role,
        },
      }
    );
    await new Log({
      admin: admin,
      action:
        "Request Role for " + student?.first_name + " " + student?.last_name,
      target: role + " request",
      target_model: "Student",
    }).save();

    if (updatedRole.modifiedCount > 0) {
      res.status(200).json({ message: "Role updated successfully" });
    } else {
      res.status(404).json({ message: "Student not found" });
    }
  } catch (error) {
    console.error("Error updating student role:", error);
    res.status(500).json({ message: "An error occurred", error: error });
  }
};

export const getAllRequestMemberController = async (
  req: Request,
  res: Response
) => {
  try {
    const students: IStudent[] = await Student.find({ isRequest: true });
    const user = students.map((student) => role_model(student));
    res.status(200).json({ data: user });
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json("Internal Server Error");
  }
};

export const getAllRequestAdminAccountController = async (
  req: Request,
  res: Response
) => {
  try {
    const admin: IAdmin[] = await Admin.find({ status: "Request" });
    const users = admin.map((admins) => ({
      id_number: admins.id_number,
      email: admins.email,
      name: admins.name,
      course: admins.course,
      year: admins.year,
      role: admins.position,
      status: admins.status,
    }));
    res.status(200).json({ data: users });
  } catch (error) {
    console.error("Error fetching admins:", error);
    res.status(500).json("Internal Server Error");
  }
};

export const approveRoleMemberController = async (
  req: Request,
  res: Response
) => {
  const { id_number } = req.body;

  try {
    const updatedRole = await Student.updateOne(
      { id_number },
      {
        $set: {
          isRequest: false,
        },
      }
    );

    if (updatedRole.modifiedCount > 0) {
      res.status(200).json({ message: "Role approved successfully" });
    } else {
      res.status(404).json({ message: "Student not found" });
    }
  } catch (error) {
    console.error("Error updating student role:", error);
    res.status(500).json({ message: "An error occurred", error: error });
  }
};

export const setDeclineMemberRoleController = async (
  req: Request,
  res: Response
) => {
  const { id_number } = req.body;

  try {
    const updatedRole = await Student.updateOne(
      { id_number },
      {
        $set: {
          role: "all",
          isRequest: false,
        },
      }
    );

    if (updatedRole.modifiedCount > 0) {
      res.status(200).json({ message: "Role approved successfully" });
    } else {
      res.status(404).json({ message: "Student not found" });
    }
  } catch (error) {
    console.error("Error updating student role:", error);
    res.status(500).json({ message: "An error occurred", error: error });
  }
};

export const addNewAdminAccountController = async (
  req: Request,
  res: Response
) => {
  const {
    id_number,
    name,
    password,
    email,
    position,
    course,
    year,
    campus,
    status,
  } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin: IAdminDocument = new Admin({
      id_number,
      name,
      password: hashedPassword,
      email,
      position,
      course,
      year,
      campus,
      status,
      access: "standard",
    });
    await newAdmin.save();

    res.status(200).json({ message: "Account Creation successful" });
  } catch (error) {
    console.error(error);
  }
};

export const approveAdminAccountController = async (
  req: Request,
  res: Response
) => {
  const { id_number } = req.body;

  try {
    const updatedRole = await Admin.updateOne(
      { id_number },
      {
        $set: {
          status: "Active",
        },
      }
    );

    if (updatedRole.modifiedCount > 0) {
      res.status(200).json({ message: "Admin Account approved successfully" });
    } else {
      res.status(404).json({ message: "Admin not found" });
    }
  } catch (error) {
    console.error("Error updating admin account:", error);
    res.status(500).json({ message: "An error occurred", error: error });
  }
};

export const declineAdminAccountController = async (
  req: Request,
  res: Response
) => {
  const { id_number } = req.body;

  try {
    const deletedAdmin = await Admin.deleteOne({ id_number });

    if (deletedAdmin.deletedCount > 0) {
      res.status(200).json({ message: "Admin account deleted successfully" });
    } else {
      res.status(404).json({ message: "Admin not found" });
    }
  } catch (error) {
    console.error("Error deleting admin account:", error);
    res.status(500).json({ message: "An error occurred", error: error });
  }
};

export const setNewAdminAccessController = async (
  req: Request,
  res: Response
) => {
  const { id_number, newAccess } = req.body;

  if (!id_number || !newAccess) {
    return res
      .status(400)
      .json({ message: "id_number and newAccess are required" });
  }

  try {
    const adminToUpdate: IAdminDocument | null = await Admin.findOne({
      id_number,
    });

    if (!adminToUpdate) {
      return res.status(404).json({ message: "Admin not found" });
    }

    adminToUpdate.access = newAccess;
    await adminToUpdate.save();

    await new Log({
      admin: req.admin.name,
      action: `Change Access for ${adminToUpdate.name} to ${newAccess}`,
      target: "Change Access",
      target_model: "Admin",
    }).save();

    res.status(200).json({ message: "Access updated successfully" });
  } catch (error) {
    console.error("Error updating access account:", error);
    res.status(500).json({ message: "An error occurred", error: error });
  }
};
