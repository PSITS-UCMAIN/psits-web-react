import { rateLimit } from "express-rate-limit";
import { incrementRateLimitBlocked, logRateLimitViolation, incrementFailedAuthAttempt } from "../services/devtools.service";

// Development mode: More lenient limits for testing
const isDevelopment = process.env.NODE_ENV !== "production";

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 100 : 20, // 100 attempts in dev, 20 in production
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    incrementRateLimitBlocked();
    logRateLimitViolation(req.ip || "unknown", req.path);
    incrementFailedAuthAttempt(req.ip || "unknown");
    res.status(429).json({
      message:
        "Too many login attempts from this IP, please try again after 15 minutes.",
    });
  },
});

export const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 100 : 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    incrementRateLimitBlocked();
    logRateLimitViolation(req.ip || "unknown", req.path);
    res.status(429).json({
      message:
        "Too many signup attempts from this IP, please try again after 15 minutes.",
    });
  },
});

/**
 * Limits password reset emails to 3 per account per 15-minute window. Keyed by
 * IP + requested ID number, so one account can't be flooded with reset emails
 * (or used to drain the Resend quota) while students sharing a campus network
 * IP can still reset their own passwords.
 */
export const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 100 : 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const idNumber =
      typeof req.body?.id_number === "string"
        ? req.body.id_number.trim().toLowerCase()
        : "unknown";
    return `forgot-password:${req.ip ?? "unknown"}:${idNumber}`;
  },
  handler: (req, res) => {
    incrementRateLimitBlocked();
    logRateLimitViolation(req.ip || "unknown", req.path);
    res.status(429).json({
      message:
        "Too many password reset requests, please try again after 15 minutes.",
    });
  },
});

/**
 * Limits application submissions to 1 per student per position per 15-minute
 * window. Only successful submissions count (skipFailedRequests), so a failed
 * attempt (e.g. upload error) doesn't block a retry. Keyed by student ID +
 * position ID so the limit is per-applicant-per-position, not global.
 */
export const applicationSubmitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1,
  skipFailedRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const studentId = req.userV2?.sub ?? "unknown";
    const positionId = (req.params as any)?.id ?? "unknown";
    return `app-submit:${studentId}:${positionId}`;
  },
  handler: (req, res) => {
    incrementRateLimitBlocked();
    logRateLimitViolation(req.ip || "unknown", req.path);
    res.status(429).json({
      message:
        "You have already submitted an application for this position. Please try again later.",
    });
  },
});

export default loginLimiter;
