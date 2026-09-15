import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { Student } from "../models/student.model";
import { IStudentDocument } from "../models/student.interface";
import { Admin } from "../models/admin.model";
import { IAdminDocument } from "../models/admin.interface";
import { signAccessToken, signRefreshToken } from "../util/jwt.util";
import {
  setRefreshCookie,
  clearRefreshCookie,
  getRefreshTokenFromCookie,
} from "../util/cookie.util";
import { verifyRefreshToken } from "../util/jwt.util";
import { Log } from "../models/log.model";
import { AuthError, AuthErrorCodes } from "../util/errors.util";
import { account_status } from "../enums/status.enums";
import { campus_type } from "../enums/campus.enums";
import { studentService } from "../services/student.service";
import {
  validateSignupData,
  normalizeYear,
  getSignupErrorResponse,
} from "../util/signupValidation.util";
import { validateId } from "../util/studentId.util";

/**
 * Shared user response type for frontend
 */
type UserResponse = {
  id: string;
  idNumber: string;
  role: "admin" | "student";
  campus: string;
  name?: string;
  email?: string;
  course?: string;
  year?: number | string;
  membershipStatus?: string;
  position?: string;
  access?: string;
};

/**
 * Convert Student/Admin model to UserResponse
 */
const toUserResponse = (
  user: IStudentDocument | IAdminDocument,
  role: "admin" | "student"
): UserResponse => {
  if (role === "student") {
    const student = user as IStudentDocument;
    return {
      id: student._id.toString(),
      idNumber: student.id_number,
      role: "student",
      campus: student.campus,
      name: `${student.first_name} ${student.middle_name || ""} ${
        student.last_name
      }`.trim(),
      email: student.email,
      course: student.course,
      year: student.year,
      membershipStatus: student.membershipStatus,
    };
  } else {
    const admin = user as IAdminDocument;
    return {
      id: admin._id.toString(),
      idNumber: admin.id_number,
      role: "admin",
      campus: admin.campus || campus_type.MAIN,
      name: admin.name,
      email: admin.email,
      course: admin.course,
      year: admin.year,
      position: admin.position,
      access: admin.access,
    };
  }
};

/**
 * POST /v2/auth/login
 * Validates credentials, issues access + refresh tokens, sets refresh cookie.
 */
export const loginV2Controller = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const id_number =
    typeof req.body?.id_number === "string" ? req.body.id_number.trim() : "";
  const password =
    typeof req.body?.password === "string" ? req.body.password : "";

  try {
    if (!id_number || !password) {
      throw new AuthError(AuthErrorCodes.InvalidCredentials);
    }

    // Rejecting the format before any lookup keeps malformed and oversized
    // values out of the query entirely. It leaks nothing about who exists.
    if (!validateId(id_number, { mode: "login" }).valid) {
      return res.status(400).json({ message: "Invalid ID number format." });
    }

    let user: IAdminDocument | IStudentDocument | null = null;
    let role: "admin" | "student";
    let accessLevel: string | undefined;

    // Check if admin login (id_number contains "-admin")
    if (id_number.includes("-admin")) {
      let admin = await Admin.findOne({ id_number });

      // Some legacy admin records store only the base eight-digit ID.
      if (!admin && id_number.endsWith("-admin")) {
        admin = await Admin.findOne({
          id_number: id_number.slice(0, -"-admin".length),
        });
      }

      if (!admin) {
        throw new AuthError(AuthErrorCodes.InvalidCredentials);
      }

      const passwordMatch = await bcrypt.compare(password, admin.password);
      console.log("Password match:", passwordMatch); // Debugging line
      if (!passwordMatch) {
        throw new AuthError(AuthErrorCodes.InvalidCredentials);
      }

      const isSuspended = admin.status === account_status.SUSPENDED;
      if (isSuspended) {
        throw new AuthError(AuthErrorCodes.AccountSuspended);
      }

      const isActive = admin.status === account_status.ACTIVE;
      if (!isActive) {
        throw new AuthError(AuthErrorCodes.AccountNotActive);
      }

      user = admin;
      role = "admin";
      accessLevel = admin.access;

      // Log admin login
      const log = new Log({
        admin: admin.name,
        admin_id: String(admin._id),
        action: "Admin Login (v2)",
      });
      await log.save();
    } else {
      // Student login
      const student = await Student.findOne({ id_number });
      if (!student) {
        throw new AuthError(AuthErrorCodes.InvalidCredentials);
      }

      const passwordMatch = await bcrypt.compare(password, student.password);
      if (!passwordMatch) {
        throw new AuthError(AuthErrorCodes.InvalidCredentials);
      }

      const isDeleted =
        student.status === account_status.DELETED ||
        student.status === "Deleted" ||
        student.status === "False";
      if (isDeleted) {
        throw new AuthError(AuthErrorCodes.AccountDeleted);
      }

      const isActive =
        student.status === account_status.ACTIVE ||
        student.status === "Active" ||
        student.status === "True";
      if (!isActive) {
        throw new AuthError(AuthErrorCodes.AccountNotActive);
      }

      user = student;
      role = "student";
    }

    // Sign tokens
    const accessToken = signAccessToken({
      sub: user._id.toString(),
      idNumber: user.id_number,
      role,
      campus: user.campus || campus_type.MAIN,
      access: accessLevel,
    });

    const refreshToken = signRefreshToken({
      sub: user._id.toString(),
      idNumber: user.id_number,
      role,
      campus: user.campus || campus_type.MAIN,
    });

    // Save refresh token to database for rotation validation
    if (role === "admin") {
      await Admin.findByIdAndUpdate(user._id, {
        currentRefreshToken: refreshToken,
      });
    } else {
      await Student.findByIdAndUpdate(user._id, {
        currentRefreshToken: refreshToken,
      });
    }

    // Set refresh token in httpOnly cookie
    setRefreshCookie(res, refreshToken);

    // Return access token and user data
    return res.status(200).json({
      message: "Signed in successfully",
      accessToken,
      user: toUserResponse(user, role),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /v2/auth/refresh
 * Reads refresh token from cookie, verifies it, checks for reuse (theft detection), issues new tokens.
 * Implements refresh token rotation: old token is invalidated upon successful refresh.
 */
export const refreshV2Controller = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const refreshToken = getRefreshTokenFromCookie(req.headers.cookie);

    if (!refreshToken) {
      throw new AuthError(AuthErrorCodes.TokenNotFound);
    }

    // Verify refresh token signature
    let claims;
    try {
      claims = verifyRefreshToken(refreshToken);
    } catch (error) {
      throw new AuthError(AuthErrorCodes.InvalidToken);
    }

    // Fetch user from DB to check if token matches stored currentRefreshToken
    let user: IStudentDocument | IAdminDocument | null = null;
    let role: "admin" | "student" = claims.role;

    if (role === "admin") {
      user = await Admin.findById(claims.sub);
    } else {
      user = await Student.findById(claims.sub);
    }

    // Explicitly check if user exists first.
    if (!user) {
      clearRefreshCookie(res);
      throw new AuthError(AuthErrorCodes.AccountNoLongerActive);
    }

    const isAccountActive =
      role === "admin"
        ? user.status === account_status.ACTIVE
        : user.status === account_status.ACTIVE;

    if (!isAccountActive) {
      clearRefreshCookie(res);
      throw new AuthError(AuthErrorCodes.AccountNoLongerActive);
    }

    // CRITICAL: Verify refresh token matches the stored token (rotation check)
    if (user.currentRefreshToken !== refreshToken) {
      // Invalidate all sessions for this user by setting currentRefreshToken to null
      if (role === "admin") {
        await Admin.findByIdAndUpdate(claims.sub, {
          currentRefreshToken: null,
        });
      } else {
        await Student.findByIdAndUpdate(claims.sub, {
          currentRefreshToken: null,
        });
      }

      clearRefreshCookie(res);
      throw new AuthError(AuthErrorCodes.TokenInvalidated);
    }

    // Generate new tokens (rotation)
    const newAccessToken = signAccessToken({
      sub: user._id.toString(),
      idNumber: user.id_number,
      role,
      campus: user.campus || campus_type.MAIN,
      access: role === "admin" ? (user as IAdminDocument).access : undefined,
    });

    const newRefreshToken = signRefreshToken({
      sub: user._id.toString(),
      idNumber: user.id_number,
      role,
      campus: user.campus || campus_type.MAIN,
    });

    // Update database with new refresh token (invalidate old one)
    if (role === "admin") {
      await Admin.findByIdAndUpdate(claims.sub, {
        currentRefreshToken: newRefreshToken,
      });
    } else {
      await Student.findByIdAndUpdate(claims.sub, {
        currentRefreshToken: newRefreshToken,
      });
    }

    // Set new refresh token in cookie
    setRefreshCookie(res, newRefreshToken);

    return res.status(200).json({
      message: "Token refreshed successfully",
      accessToken: newAccessToken,
      user: toUserResponse(user, role),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /v2/auth/logout
 * Clears refresh token cookie and invalidates stored token in database.
 * This ensures the token can never be reused, even if it's stolen.
 */
export const logoutV2Controller = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const refreshToken = getRefreshTokenFromCookie(req.headers.cookie);

    // If a valid refresh token exists, invalidate it in the database
    if (refreshToken) {
      try {
        const claims = verifyRefreshToken(refreshToken);

        if (claims.role === "admin") {
          await Admin.findByIdAndUpdate(claims.sub, {
            currentRefreshToken: null,
          });
        } else {
          await Student.findByIdAndUpdate(claims.sub, {
            currentRefreshToken: null,
          });
        }
      } catch (error) {
        // Token might be expired or invalid, but we still clear the cookie
      }
    }

    clearRefreshCookie(res);
    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
};

export const signupV2Controller = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const validationError = validateSignupData({
      fname: req.body.fname,
      lname: req.body.lname,
      id: req.body.id,
      email: req.body.email,
    });
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const year = normalizeYear(req.body.year);
    if (year === null) {
      return res
        .status(400)
        .json({ message: "Year level must be between 1 and 5." });
    }

    req.body = {
      id_number: req.body.id,
      password: req.body.password,
      first_name: req.body.fname,
      middle_name: req.body.mname,
      last_name: req.body.lname,
      email: req.body.email,
      course: req.body.course,
      year,
    };

    const result = await studentService.create(req);

    if (!result.status) {
      return res.status(400).json({ message: result.message });
    }

    return res.status(201).json({ message: result.message });
  } catch (error: any) {
    const mapped = getSignupErrorResponse(error);
    if (mapped) {
      return res.status(mapped.status).json({ message: mapped.message });
    }
    next(error);
  }
};
