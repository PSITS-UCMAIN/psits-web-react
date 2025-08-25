import { rateLimit } from "express-rate-limit";
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message:
    "Too many login attempts from this IP, please try again after 15 minutes.",
  standardHeaders: true,
  legacyHeaders: false,
});

export default loginLimiter;
