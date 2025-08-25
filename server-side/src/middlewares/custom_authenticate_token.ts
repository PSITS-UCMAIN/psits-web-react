import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { Request, Response, NextFunction } from "express";
dotenv.config();
const token_key = process.env.JWT_SECRET ?? "";
import { Admin } from "../models/admin.model";
import { Student } from "../models/student.model";
import { admin_model, user_model } from "../model_template/model_data";
import {
  IAdminModelData,
  IUserModelData,
} from "../model_template/model_data.interface";

export const admin_authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader =
    req.headers["authorization"] || req.headers["Authorization"];

  let token: string | undefined;

  if (authHeader) {
    if (Array.isArray(authHeader)) {
      token = authHeader[0].split(" ")[1];
    } else {
      token = authHeader.split(" ")[1];
    }
  }

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  jwt.verify(token, token_key, async (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({ message: "Forbidden" });
    }

    try {
      const admin = await Admin.findOne({ id_number: decoded.user.id_number });

      if (admin) {
        req.admin = admin_model(admin);
        log_console_admin(admin_model(admin), req);
        next();
      } else res.status(403).json({ message: "Access Denied" });
    } catch (error) {
      console.error(error);
    }
  });
};

export const student_authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader =
    req.headers["authorization"] || req.headers["Authorization"];

  let token: string | undefined;

  if (authHeader) {
    if (Array.isArray(authHeader)) {
      token = authHeader[0].split(" ")[1];
    } else {
      token = authHeader.split(" ")[1];
    }
  }

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  jwt.verify(token, token_key, async (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({ message: "Forbidden" });
    }

    try {
      const student = await Student.findOne({
        id_number: decoded.user?.id_number,
      });

      if (student) {
        req.student = user_model(student);
        log_console(user_model(student), req);
        next();
      } else res.status(403).json({ message: "Access Denied" });
    } catch (error) {
      console.error(error);
    }
  });
};

export const both_authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader =
    req.headers["authorization"] || req.headers["Authorization"];

  let token: string | undefined;

  if (authHeader) {
    if (Array.isArray(authHeader)) {
      token = authHeader[0].split(" ")[1];
    } else {
      token = authHeader.split(" ")[1];
    }
  }

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  jwt.verify(token, token_key, async (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({ message: "Forbidden" });
    }

    try {
      const student = await Student.findOne({
        id_number: decoded.user?.id_number,
      });

      if (!student) {
        const admin = await Admin.findOne({
          id_number: decoded.user?.id_number,
        });
        if (admin) {
          req.both = admin_model(admin);
          log_console_admin(admin_model(admin), req);
          next();
        } else res.status(403).json({ message: "Access Denied" });
      } else if (student) {
        req.both = user_model(student);
        log_console(user_model(student), req);
        next();
      } else res.status(403).json({ message: "Access Denied" });
    } catch (error) {
      console.error(error);
    }
  });
};

export const role_authenticate = (access: Array<String>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (access.includes(req.admin?.access ?? "")) {
        next();
      } else {
        res.status(403).json({ message: "Forbidden Path" });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: error });
    }
  };
};

export const log_console_admin = (user: IAdminModelData, request: Request) => {
  console.log(
    "*********************************\nAdmin Name: " +
      user.name +
      "\nAccess: " +
      user.access +
      "\nRequested Route: " +
      request.originalUrl +
      "\n*********************************"
  );
};
export const log_console = (user: IUserModelData, request: Request) => {
  console.log(
    "*********************************\nStudent Name: " +
      user.name +
      "\nCourse & Year: " +
      user.course +
      "-" +
      user.year +
      "\nRequested Route: " +
      request.originalUrl +
      "\n*********************************"
  );
};
