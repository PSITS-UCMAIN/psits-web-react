import bcrypt from "bcryptjs";
import { Student } from "../models/student.model";
import { IStudentDocument } from "../models/student.interface";
import { Orders } from "../models/orders.model";
import { Log } from "../models/log.model";
import { MembershipHistory } from "../models/history.model";
import { format } from "date-fns";
import mongoose from "mongoose";
import { Request, Response } from "express";
import { IStudent } from "../models/student.interface";
import { IHistory } from "../models/history.interface";
import { account_status } from "../enums/status.enums";

export const getAllActiveStudentsController = async (
  req: Request,
  res: Response
) => {
  try {
    const students: IStudent[] = await Student.find({
      status: { $in: ["True", account_status.ACTIVE] },
    });
    if (!students) {
      res.status(400).json({ message: "No Students" });
    }
    res.status(200).json(students);
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json("Internal Server Error");
  }
};

export const setStudentMembershipRequest = async (
  req: Request,
  res: Response
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id_number } = req.body;

    const studentFind: IStudent | null = await Student.findOne({
      id_number: id_number,
    }).session(session);

    if (!studentFind) {
      return res.status(400).json({ message: "No student found" });
    }

    if (studentFind.membershipStatus !== "NOT_APPLIED") {
      return res
        .status(400)
        .json({ message: "You already have a pending request." });
    }

    await Student.updateOne({ id_number: id_number }, [
      {
        $set: {
          membershipStatus: "PENDING",
        },
      },
    ]).session(session);

    await session.commitTransaction();
    session.endSession();
    res.status(200).json({ message: "Request submitted successfully" });
  } catch (error) {
    session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: "Error submitting request", error: error });
  }
};

export const getAllDeleteStudentController = async (
  req: Request,
  res: Response
) => {
  try {
    const students: IStudent[] = await Student.find({
      status: { $in: ["False", account_status.DELETED, account_status.SUSPENDED] },
    });
    if (!students) {
      res.status(400).json({ message: "No Deleted Students" });
    }
    res.status(200).json(students);
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json("Internal Server Error");
  }
};

export const getMembershipStatusController = async (
  req: Request,
  res: Response
) => {
  const { id } = req.params;
  try {
    const student: IStudent | null = await Student.findOne({ id_number: id });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.status(200).json({
      status: student.membershipStatus,
      isFirstApplication: student.isFirstApplication,
    });
  } catch (error) {
    console.error("Error fetching student:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const softDeleteStudentController = async (
  req: Request,
  res: Response
) => {
  const { id_number, name } = req.body;

  try {
    // Find and delete the student by id_number
    const deletedStudent = await Student.updateOne(
      { id_number: id_number },
      {
        $set: {
          status: "False",
          deletedBy: name,
          deletedDate: format(new Date(), "MMMM d, yyyy h:mm:ss a"),
        },
      }
    );

    if (!deletedStudent) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.status(200).json({ message: "Student deleted successfully" });
  } catch (error) {
    console.error("Error deleting student:", error);
    res.status(500).json("Internal Server Error");
  }
};

export const restoreDeletedStudentController = async (
  req: Request,
  res: Response
) => {
  const { id_number } = req.body;

  try {
    const restore = await Student.updateOne(
      { id_number: id_number },
      {
        $set: {
          status: "True",
        },
      }
    );

    if (!restore) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.status(200).json({ message: "Student retore successfully" });
  } catch (error) {
    console.error("Error deleting student:", error);
    res.status(500).json("Internal Server Error");
  }
};
export const cancelMembershipRequestController = async (
  req: Request,
  res: Response
) => {
  const { id_number } = req.body;

  try {
    const cancel = await Student.updateOne(
      { id_number: id_number },
      {
        $set: {
          membershipStatus: "NOT_APPLIED",
        },
      }
    );

    if (!cancel) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.status(200).json({ message: "Student cancel membership successfully" });
  } catch (error) {
    console.error("Error deleting student:", error);
    res.status(500).json("Internal Server Error");
  }
};

export const editStudentController = async (req: Request, res: Response) => {
  const {
    id_number,
    rfid,
    first_name,
    middle_name,
    last_name,
    email,
    course,
    year,
  } = req.body;

  try {
    // Fetch the student document by id_number to get the _id
    const student: IStudentDocument | null = await Student.findOne({
      id_number: id_number,
    });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Update the student's information
    const studentResult = await Student.updateOne(
      { id_number: id_number },
      {
        $set: {
          rfid: rfid,
          first_name: first_name,
          middle_name: middle_name,
          last_name: last_name,
          email: email,
          course: course,
          year: year,
        },
      }
    );

    // Update related orders with the new student details
    await Orders.updateMany(
      { id_number: id_number },
      {
        $set: {
          student_name: `${first_name} ${middle_name} ${last_name}`,
          course: course,
          year: year,
          rfid: rfid,
        },
      }
    );

    // Log the editing action
    const log = new Log({
      admin: req.admin.name,
      admin_id: req.admin._id,
      action: "Edited Student",
      target: `${id_number} - ${first_name} ${middle_name} ${last_name}`,
      target_id: student._id,
      target_model: "Student",
    });

    await log.save();

    res
      .status(200)
      .json({ message: "Student and related orders updated successfully" });
  } catch (error) {
    console.error("Error updating student and orders:", error);
    res.status(500).json("Internal Server Error");
  }
};
export const changeStudentPassword = async (req: Request, res: Response) => {
  try {
    const { id_number, password } = req.body;

    if (typeof id_number !== "string" || !id_number.trim()) {
      return res.status(400).json({ message: "Student ID is required" });
    }

    if (typeof password !== "string" || !password.trim()) {
      return res.status(400).json({ message: "Password is required" });
    }

    const getStudent: IStudentDocument | null = await Student.findOne({
      id_number: id_number.trim(),
    });

    if (!getStudent) {
      return res.status(404).json({ message: "Student not found" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await Student.updateOne(
      { _id: getStudent._id },
      { $set: { password: hashedPassword } }
    );

    // Log the password change action
    const log = new Log({
      admin: req.admin?.name ?? req.userV2?.idNumber ?? "Admin",
      admin_id: req.admin?._id,
      action: "Changed Student Password",
      target: `${getStudent.id_number} - ${getStudent.first_name} ${getStudent.middle_name} ${getStudent.last_name}`,
      target_id: getStudent._id,
      target_model: "Student",
    });

    await log.save();
  

    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Error changing student password:", error);
    res.status(500).json({ message: "An error occurred", error: error });
  }
};

export const fetchSpecificStudentController = async (
  req: Request,
  res: Response
) => {
  const { id_number } = req.params;

  try {
    const student: IStudent | null = await Student.findOne({ id_number });
    if (!student) {
      res.status(404).json({ message: "Student not found" });
    } else {
      const user = {
        isRequest: student.isRequest,
        role: student.role,
      };
      res.status(200).json({ data: user });
    }
  } catch (error) {
    console.error(error);
  }
};

export const fetchSpecificMembershipHistoryController = async (
  req: Request,
  res: Response
) => {
  const { id_number } = req.params;

  try {
    const membershipHistory: IHistory[] = await MembershipHistory.find({
      id_number: id_number,
    }).sort({ date: -1 });

    if (!membershipHistory) {
      res.status(400).json({ message: "No Membership History" });
    }

    res.status(200).json({ data: membershipHistory });
  } catch (error) {
    console.error("Error fetching student membership history:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const editStudentYearLevel = async (req: Request, res: Response) => {
  const { id_number } = req.params;
  const { year } = req.body;

  // Validate year input
  if (year === undefined || year === null) {
    return res.status(400).json({ message: "Year level is required." });
  }

  if (typeof year !== "number" || year < 1 || year > 5) {
    return res
      .status(400)
      .json({ message: "Year level must be between 1 and 5." });
  }

  try {
    // Find the student first to check current state
    const student: IStudent | null = await Student.findOne({ id_number });
    if (!student) {
      return res.status(404).json({ message: "Student not found." });
    }

    // Update year level
    const updatedStudent = await Student.findOneAndUpdate(
      { id_number },
      {
        year,
      },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      message: "Student year level updated successfully.",
      student: updatedStudent,
    });
  } catch (error) {
    console.error("Error updating student year level:", error);
    return res.status(500).json({ message: "Internal Server Error." });
  }
};

export const isYearUpdatedController = async (req: Request, res: Response) => {
  const { id_number } = req.params;
  try {
    // Validate id_number presence (optional but recommended)
    if (!id_number) {
      return res
        .status(400)
        .json({ message: "Student ID number is required." });
    }

    // Find student by id_number
    const student: IStudent | null = await Student.findOne({ id_number });

    if (!student) {
      return res.status(404).json({ message: "Student not found." });
    }

    return res.status(200).json({
      createdAt: student.createdAt,
      message: "Student year update status retrieved successfully.",
    });
  } catch (error) {
    console.error("Error updating student year level:", error);
    return res.status(500).json({ message: "Internal Server Error." });
  }
};
