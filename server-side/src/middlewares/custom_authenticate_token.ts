import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { Request, Response, NextFunction } from "express";
dotenv.config();
const token_key = process.env.JWT_SECRET ?? "";
import { Admin } from "../models/admin.model";
import { Student } from "../models/student.model";
import { admin_model, user_model } from "../model_template/model_data";

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
      // Log verify error for debugging (do not log the token itself)
      console.error('[student_authenticate] JWT verify error:', err && err.message ? err.message : err);
      return res.status(403).json({ message: "Forbidden" });
    }

    // Log decoded user identifier for debugging (avoid printing entire token)
    try {
      const decodedUserIdNum = decoded?.user?.id_number;
      console.log('[student_authenticate] decoded user id_number:', decodedUserIdNum);
    } catch (logErr) {
      console.error('[student_authenticate] failed to read decoded payload', logErr);
    }

    try {
      const student = await Student.findOne({
        id_number: decoded.user?.id_number,
      });

      if (student) {
        req.student = user_model(student);

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

          next();
        } else res.status(403).json({ message: "Access Denied" });
      } else if (student) {
        req.both = user_model(student);

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
