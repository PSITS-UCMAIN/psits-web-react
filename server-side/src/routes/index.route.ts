import { Router } from "express";
import loginLimiter from "../util/limiter.util";
const router: Router = Router();

const {
  loginController,
  registerController,
  forgotPasswordController,
  resetPasswordController,
} = require("../controllers/index.controller");

//lOGIN
router.post("/login", loginLimiter, loginController);
//Register
router.post("/register", registerController);
// Student forgot password
router.post("/student/forgot-password", forgotPasswordController);
// Student reset password
router.post("/student/reset-password/:token", resetPasswordController);

export default router;
