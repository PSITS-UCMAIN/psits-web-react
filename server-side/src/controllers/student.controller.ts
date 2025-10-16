import bcrypt from "bcryptjs";
import { Student, IStudentDocument } from "../models/student.model";
import { Admin } from "../models/admin.model";
import { Orders } from "../models/orders.model";
import { Log } from "../models/log.model";
import { MembershipHistory } from "../models/history.model";
import { format } from "date-fns";
import mongoose from "mongoose";
import { Request, Response } from "express";
import { IStudent } from "../models/student.interface";
import { IHistory } from "../models/history.interface";
import { IOrders } from "../models/orders.interface";
import { IAdmin, IAdminDocument } from "../models/admin.interface";

export const getAllActiveStudentsController = async (
  req: Request,
  res: Response
) => {
  try {
    const students: IStudent[] = await Student.find({
      status: "True",
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
      status: "False",
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
    const getStudent: IStudentDocument | null = await Student.findOne({
      id_number: req.body.id_number,
    });

    if (!getStudent) {
      return res.status(404).json({ message: "Student not found" });
    }

    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    getStudent.password = hashedPassword;
    await getStudent.save();

    // Log the password change action
    const log = new Log({
      admin: req.admin.name,
      admin_id: req.admin._id,
      action: "Changed Student Password",
      target: `${getStudent.id_number} - ${getStudent.first_name} ${getStudent.middle_name} ${getStudent.last_name}`,
      target_id: getStudent._id,
      target_model: "Student",
    });

    await log.save();
    //console.log("Action logged successfully.");

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

    // Check if already updated this school year
    if (student.isYearUpdated) {
      return res.status(400).json({
        message:
          "Student's year level has already been updated for this school year.",
      });
    }

    // Update both year and isYearUpdated flag
    const updatedStudent = await Student.findOneAndUpdate(
      { id_number },
      {
        year,
        isYearUpdated: true,
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

    // Return the isYearUpdated status
    return res.status(200).json({
      isYearUpdated: student.isYearUpdated,
      message: "Student year update status retrieved successfully.",
    });
  } catch (error) {
    console.error("Error updating student year level:", error);
    return res.status(500).json({ message: "Internal Server Error." });
  }
};
