import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { Student } from "../models/student.model";
import { IStudent } from "../models/student.interface";
import { account_status, membership_status } from "../enums/status.enums";
import { student_roles } from "../enums/role.enums";
import { campus_type } from "../enums/campus.enums";
import { AppError } from "../util/app.error.util";

class StudentService {
  //Function Format
  //Full Name format
  fullNameFormat(student: IStudent) {
    return (
      student.first_name + " " + student.middle_name + " " + student.last_name
    );
  }
  //Word Format
  capitalizeFormat(word: String) {
    if (!word) return "";
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }
  //
  //
  //Services
  //get search specific student with params
  getSpecific = async (params: any) => {
    const student = await Student.findOne(params);
    if (!student) {
      throw new AppError("Student not found!", 404);
    }
    return student;
  };
  //get search student with session
  getIdSession = async (id_number: String, session: any) => {
    const student = await Student.findOne({ id_number }).session(session);
    if (!student) {
      throw new AppError("Student not found!", 404);
    }
    return student;
  };
  //Fetch all students
  getAll = async () => {
    const student: IStudent[] = await Student.find();
    if (!student) {
      throw new AppError("Student not found!", 404);
    }
    return student;
  };
  //Fetch all student with dynamic params
  getAllStudents = async (params: any) => {
    const student: IStudent[] = await Student.find(params);
    if (!student) {
      throw new AppError("Student not found!", 404);
    }
    return student;
  };
  //Update Student with Dynamic Query
  updateOneDynamic = async (id_number: String, parameters: any) => {
    const result = await Student.updateOne({ id_number }, { $set: parameters });

    if (result.matchedCount === 0) {
      throw new AppError("Student not found!", 404);
    }

    if (result.modifiedCount === 0) {
      return { status: true, message: "No changes made" };
    }

    return { status: true, message: "Student updated successfully" };
  };

  suspendByIdNumber = async (id_number: string) => {
    const result = await Student.updateOne(
      { id_number },
      { $set: { status: account_status.SUSPENDED } }
    );
    if (result.matchedCount === 0) {
      throw new AppError("Student not found", 404);
    }
    return { message: "Student suspended", id_number };
  };

  //Register | Create student
  create = async (req: Request) => {
    const {
      id_number,
      password,
      first_name,
      middle_name,
      last_name,
      email,
      course,
      year,
    }: IStudent = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const newStudent = new Student({
      id_number,
      rfid: "N/A",
      password: hashedPassword,
      first_name: this.capitalizeFormat(first_name),
      middle_name:
        middle_name === undefined ? "" : this.capitalizeFormat(middle_name),
      last_name: this.capitalizeFormat(last_name),
      email,
      course,
      year,
      status: account_status.ACTIVE,
      membershipStatus: membership_status.NONE,
      applied: new Date(),
      role: student_roles.GENERAL,
      campus: campus_type.MAIN,
      isRequest: false,
      createdAt: new Date(),
    });
    await newStudent.save();

    return { status: true, message: "Registration successful" };
  };
  //Count on how many students, request and deleted, this will be under membership tab
  count = async () => {
    const [all, request, deleted] = await Promise.all([
      Student.countDocuments({
        status: account_status.ACTIVE,
      }),
      Student.countDocuments({ membershipStatus: membership_status.PENDING }),
      Student.countDocuments({
        status: account_status.DELETED,
      }),
    ]);

    return { all, request, deleted };
  };
}

const studentService = new StudentService();

export { studentService };
