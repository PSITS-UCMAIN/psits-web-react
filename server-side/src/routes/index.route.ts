import { Router } from "express";
const router: Router = Router();

import {
  loginController,
  registerController,
  forgotPasswordController,
  resetPasswordController,
} from "../controllers/index.controller";

//lOGIN
router.post("/login", loginController);
//Register
router.post("/register", registerController);
// Student forgot password
router.post("/student/forgot-password", forgotPasswordController);
// Student reset password
router.post("/student/reset-password/:token", resetPasswordController);

export default router;
