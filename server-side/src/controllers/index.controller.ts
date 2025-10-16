import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { Student } from "../models/student.model";
import { Admin, IAdminDocument } from "../models/admin.model";
import { Log } from "../models/log.model";
import { forgotPasswordMail } from "../mail_template/mail.template";
import { Request, Response } from "express";
import { IStudent } from "../models/student.interface";
import dotenv from "dotenv";
dotenv.config();
const token_key = process.env.JWT_SECRET ?? "Default_Token";
const url =
  process.env.DB_NAME !== "psits-test"
    ? "https://psits.vercel.app/reset-password/"
    : "https://psits-staging.vercel.app/reset-password/";

export const loginController = async (req: Request, res: Response) => {
  const { id_number, password } = req.body;

  try {
    let users: IAdminDocument | IStudent;
    let role;
    let admin: IAdminDocument | null = null;
    let student: IStudent | null = null;
    let campus;

    if (id_number.includes("-admin")) {
      admin = await Admin.findOne({ id_number });
    }

    if (!admin) {
      student = await Student.findOne({ id_number });
      if (!student) {
        return res.status(400).json({ message: "Invalid Credentials" });
      }

      const passwordMatch = await bcrypt.compare(password, student.password);

      if (passwordMatch && student.status === "False") {
        return res
          .status(400)
          .json({ message: "Your account has been deleted!" });
      } else if (passwordMatch && student.status === "True") {
        users = student;
        role = "Student";
      } else {
        return res
          .status(400)
          .json({ message: "Invalid ID number or password" });
      }
    } else {
      const passwordMatch = await bcrypt.compare(password, admin.password);

      if (passwordMatch && admin.status === "Active") {
        users = admin;
        role = "Admin";
      } else if (passwordMatch && admin.status === "Suspend") {
        return res.status(400).json({
          message: "Your account has been suspended! Please contact president",
        });
      } else {
        return res
          .status(400)
          .json({ message: "Invalid ID number or password" });
      }
    }

    const user = {
      id_number: users.id_number,
    };
    campus = users.campus;
    const token = jwt.sign({ user }, token_key, {
      expiresIn: role === "Admin" ? "4h" : "10m",
    });

    if (admin) {
      if (role === "Admin") {
        const log = new Log({
          admin: admin.name,
          admin_id: admin._id,
          action: "Admin Login",
        });

        await log.save();
      }
    }

    return res.status(200).json({
      message: "Signed in successfully",
      role,
      token,
      campus,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occurred", error });
  }
};

export const registerController = async (req: Request, res: Response) => {
  const {
    id_number,
    password,
    rfid,
    first_name,
    middle_name,
    last_name,
    email,
    course,
    year,
    applied,
  } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const newStudent = new Student({
      id_number,
      rfid: "N/A",
      password: hashedPassword,
      first_name,
      middle_name: middle_name === undefined ? "" : middle_name,
      last_name,
      email,
      course,
      year,
      status: "True",
      membership: "None",
      applied,
      role: "all",
      campus: "UC-Main",
      isRequest: false,
      isYearUpdated: true,
    });
    await newStudent.save();

    res.status(200).json({ message: "Registration successful" });
  } catch (error) {
    if (error) {
      res.status(400).json({ message: "Id number already exists" });
    } else {
      console.error({ message: "Error saving new student:", error });
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
};

export const forgotPasswordController = async (req: Request, res: Response) => {
  try {
    let user;
    let position;

    // Find the user by email
    const userAdmin = await Admin.findOne({
      email: req.body.email,
      id_number: req.body.id_number,
    });
    const getUser = await Student.findOne({
      email: req.body.email,
      id_number: req.body.id_number,
    });
    if (userAdmin) {
      user = userAdmin;
    } else if (getUser) {
      user = getUser;
    } else if (!getUser) {
      console.error(`User with email ${req.body.email} not found`);
      return res.status(404).json({
        message: `The id number you entered is found but appears to be the email is incorrect.`,
      });
    } else if (!userAdmin) {
      console.error(
        `The id number you entered is found but appears to be the email is incorrect.`
      );
      return res.status(404).json({
        message: `The id number you entered is found but appears to be the email is incorrect.`,
      });
    } else {
      console.error(`User with email ${req.body.email} not found`);
      return res.status(404).json({
        message: `The id number you entered is found but appears to be the email is incorrect.`,
      });
    }

    const token = jwt.sign({ userId: user._id }, token_key, {
      expiresIn: "10m",
    });
    await forgotPasswordMail(req.body.email, url, token);
  } catch (err) {
    console.error("Server error during forgot password process:", err);
    res.status(500).send({ message: err });
  }
};

export interface jwtPayload {
  userId: string;
}

export const resetPasswordController = async (req: Request, res: Response) => {
  try {
    const decodedToken = jwt.verify(req.params.token, token_key) as jwtPayload;

    if (!decodedToken) {
      return res.status(401).send({ message: "Invalid token" });
    }
    let user;

    const getStudent = await Student.findOne({ _id: decodedToken.userId });
    const getAdmin = await Admin.findOne({ _id: decodedToken.userId });
    if (getStudent) {
      // Hash the new password
      const salt = await bcrypt.genSalt(10);
      req.body.newPassword = await bcrypt.hash(req.body.newPassword, salt);

      // Update user's password, clear reset token and expiration time
      getStudent.password = req.body.newPassword;
      await getStudent.save();
    } else if (getAdmin) {
      const salt = await bcrypt.genSalt(10);
      req.body.newPassword = await bcrypt.hash(req.body.newPassword, salt);

      // Update user's password, clear reset token and expiration time
      getAdmin.password = req.body.newPassword;
      await getAdmin.save();
    } else {
      return res.status(401).send({ message: "no user found" });
    }

    // Send success response
    res.status(200).send({ message: "Password updated" });
  } catch (err) {
    // Send error response if any error occurs
    res.status(500).send({ message: err });
  }
};
