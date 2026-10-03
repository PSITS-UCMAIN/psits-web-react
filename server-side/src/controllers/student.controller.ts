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
import { account_status, active_status_values } from "../enums/status.enums";
import { psits_roles } from "../enums/role.enums";

export interface StudentSearchResult {
  _id: mongoose.Types.ObjectId;
  rfid?: string;
  id_number: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email?: string;
  course: string;
  status: string;
  membershipStatus: string;
  role: string;
  isFirstApplication: boolean;
  isYearUpdated: boolean;
  createdAt: Date;
  year: number;
  campus: string;
}

export const getAllActiveStudentsController = async (
  req: Request,
  res: Response
) => {
  try {
    const students: StudentSearchResult[] = await Student.find({
      status: { $in: active_status_values },
    }).select(
      "id_number rfid first_name middle_name last_name email course year campus status membershipStatus role isFirstApplication isYearUpdated createdAt"
    );
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
      status: {
        $in: ["False", account_status.DELETED, account_status.SUSPENDED],
      },
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
          status: account_status.ACTIVE,
        },
      }
    );

    if (!restore) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.status(200).json({ message: "Student restored successfully" });
  } catch (error) {
    console.error("Error restoring student:", error);
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
    id,
    id_number,
    rfid,
    first_name,
    middle_name,
    last_name,
    email,
    course,
    year,
  } = req.body;
  const user = req.userV2;
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const studentId = new mongoose.Types.ObjectId(id);
    // Fetch the student document by id_number to get the _id
    const student: IStudentDocument | null = await Student.findOne({
      _id: studentId,
    }).session(session);

    if (!student) {
      await session.abortTransaction();
      await session.endSession();
      return res.status(404).json({ message: "Student not found" });
    }
    const previousIdNumber = student.id_number;
    if (id_number !== previousIdNumber) {
      //Check if the admin has permission to edit the id number
      if (
        user?.access === psits_roles.ADMIN ||
        user?.access === psits_roles.DEVELOPER
      ) {
        //Update student records
        await Student.updateOne(
          { _id: studentId },
          {
            $set: {
              id_number,
              rfid: rfid,
              first_name: first_name,
              middle_name: middle_name,
              last_name: last_name,
              email: email,
              course: course,
              year: year,
            },
          }
        ).session(session);
        //Update order records with the new id_number
        await Orders.updateMany(
          { id_number: previousIdNumber },
          {
            $set: {
              id_number,
              student_name: `${first_name} ${middle_name} ${last_name}`,
              course: course,
              year: year,
              rfid: rfid,
            },
          }
        ).session(session);
        //Update membership history records with the new id_number
        // NOTE: MembershipHistory now uses the student FK as the source of
        // truth; denormalized fields were removed in the drop-redundant-fields
        // migration. No updateMany needed here.
      } else {
        await session.abortTransaction();
        await session.endSession();
        return res.status(403).json({
          message: "You do not have permission to edit the ID number.",
        });
      }
    } else {
      //Update student records without changing the id_number
      await Student.updateOne(
        { _id: studentId },
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
      ).session(session);
      //Update order records with the new student details
      await Orders.updateMany(
        { id_number: previousIdNumber },
        {
          $set: {
            id_number,
            student_name: `${first_name} ${middle_name} ${last_name}`,
            course: course,
            year: year,
            rfid: rfid,
          },
        }
      ).session(session);
      // MembershipHistory no longer stores denormalized student fields —
      // the student FK is the source of truth; no updateMany needed here.
    }

    // Log the editing action.
    const renamedFrom =
      id_number !== previousIdNumber ? `${previousIdNumber} -> ` : "";
    const log = new Log({
      admin: req.admin.name,
      admin_id: req.admin._id,
      action: "Edited Student",
      target: `${renamedFrom}${id_number} - ${first_name} ${middle_name} ${last_name}`,
      target_id: student._id,
      target_model: "Student",
    });

    await log.save({ session });
    await session.commitTransaction();
    await session.endSession();
    res
      .status(200)
      .json({ message: "Student and related orders updated successfully" });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    await session.endSession();
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
  // The route param may carry a campus-scoped suffix (e.g. "71009042-UC_LM").
  // Student `id_number` is stored as a bare 8-digit value — strip the suffix.
  const rawId = req.params.id_number as string;
  const bareId = rawId?.split("-")[0]?.trim() ?? "";

  try {
    if (!bareId) {
      res.status(400).json({ message: "Invalid student ID" });
      return;
    }

    // Resolve the student first so the FK can be used as the query filter.
    const student: IStudentDocument | null = await Student.findOne({
      id_number: bareId,
    });
    if (!student) {
      res.status(404).json({ message: "Student not found" });
      return;
    }

    const membershipHistory = await MembershipHistory.find({
      student: student._id,
    }).sort({ date: -1 });

    // Project the same response shape the frontend expects — the denormalized
    // fields no longer live on the schema; they are derived from the student.
    const fullName =
      `${student.first_name} ${student.middle_name ?? ""} ${student.last_name}`.trim();
    const data = membershipHistory.map((record) => ({
      ...record.toObject(),
      id_number: student.id_number,
      rfid: student.rfid ?? "",
      name: fullName,
      year: student.year,
      course: student.course,
    }));

    res.status(200).json({ data });
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
