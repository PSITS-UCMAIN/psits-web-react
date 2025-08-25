import {
  admin_authenticate,
  student_authenticate,
} from "../middlewares/custom_authenticate_token";

import { Router, Request, Response } from "express";
const router = Router();

//protected route for admin
router.get(
  "/protected-route-admin",
  admin_authenticate,
  async (req: Request, res: Response) => {
    try {
      if (req.admin.role === "Admin") {
        return res.status(200).json({
          user: req.admin,
          role: req.admin.role,
        });
      } else return res.status(400).json({ message: "Access Denied" });
    } catch (error) {
      console.error(error);
    }
  }
);
//Student route
router.get(
  "/protected-route-student",
  student_authenticate,
  async (req, res) => {
    try {
      if (req.student.role === "Student") {
        return res.status(200).json({
          user: req.student,
          role: req.student.role,
        });
      } else return res.status(400).json({ message: "Access Denied" });
    } catch (error) {
      console.error(error);
    }
  }
);

export default router;
