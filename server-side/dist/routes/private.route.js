"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const custom_authenticate_token_1 = require("../middlewares/custom_authenticate_token");
const express_1 = require("express");
const router = (0, express_1.Router)();
//protected route for admin
router.get("/protected-route-admin", custom_authenticate_token_1.admin_authenticate, async (req, res) => {
    try {
        if (req.admin.role === "Admin") {
            return res.status(200).json({
                user: req.admin,
                role: req.admin.role,
            });
        }
        else
            return res.status(400).json({ message: "Access Denied" });
    }
    catch (error) {
        console.error(error);
    }
});
//Student route
router.get("/protected-route-student", custom_authenticate_token_1.student_authenticate, async (req, res) => {
    try {
        if (req.student.role === "Student") {
            return res.status(200).json({
                user: req.student,
                role: req.student.role,
            });
        }
        else
            return res.status(400).json({ message: "Access Denied" });
    }
    catch (error) {
        console.error(error);
    }
});
exports.default = router;
