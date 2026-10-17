import { Router } from "express";
import {
  loginV2Controller,
  refreshV2Controller,
  logoutV2Controller,
  signupV2Controller,
} from "../controllers/auth.v2.controller";
import loginLimiter, { signupLimiter } from "../util/limiter.util";

const router: Router = Router();

/**
 * POST /v2/auth/login
 * Authenticate user with id_number + password, issue tokens, set refresh cookie
 */
router.post("/login", loginLimiter, loginV2Controller);

/**
 * POST /v2/auth/refresh
 * Read refresh token from cookie, validate, issue new tokens
 */
router.post("/refresh", refreshV2Controller);

/**
 * POST /v2/auth/logout
 * Clear refresh token cookie (stateless; token remains valid until expiry)
 */
router.post("/logout", logoutV2Controller);

/**
 * POST /v2/auth/signup
 * Create a new student account using studentService.create, respond with success/failure
 */
router.post("/signup", signupLimiter, signupV2Controller);

export default router;
