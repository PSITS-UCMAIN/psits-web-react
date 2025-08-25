"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const limiter_util_1 = __importDefault(require("../util/limiter.util"));
const router = (0, express_1.Router)();
const { loginController, registerController, forgotPasswordController, resetPasswordController, } = require("../controllers/index.controller");
//lOGIN
router.post("/login", limiter_util_1.default, loginController);
//Register
router.post("/register", registerController);
// Student forgot password
router.post("/student/forgot-password", forgotPasswordController);
// Student reset password
router.post("/student/reset-password/:token", resetPasswordController);
exports.default = router;
