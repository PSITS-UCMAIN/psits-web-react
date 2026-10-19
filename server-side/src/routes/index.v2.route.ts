import { Router } from "express";
import loginLimiter, {
  forgotPasswordLimiter,
  signupLimiter,
} from "../util/limiter.util";
const router: Router = Router();

const {
  loginController,
  registerController,
  forgotPasswordController,
  resetPasswordController,
} = require("../controllers/index.v2.controller");
const { loginV2Controller } = require("../controllers/auth.v2.controller");

//lOGIN
router.post("/login", loginLimiter, loginV2Controller);
//Register
router.post("/register", signupLimiter, registerController);
// Student forgot password
router.post(
  "/student/forgot-password",
  forgotPasswordLimiter,
  forgotPasswordController
);
// Student reset password
router.post("/student/reset-password/:token", resetPasswordController);

export default router;
