"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_rate_limit_1 = require("express-rate-limit");
const loginLimiter = (0, express_rate_limit_1.rateLimit)({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: "Too many login attempts from this IP, please try again after 15 minutes.",
    standardHeaders: true,
    legacyHeaders: false,
});
exports.default = loginLimiter;
