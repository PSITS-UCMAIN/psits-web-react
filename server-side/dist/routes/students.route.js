"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const student_controller_1 = require("../controllers/student.controller");
const custom_authenticate_token_1 = require("../middlewares/custom_authenticate_token");
const router = (0, express_1.Router)();
// GET list of accepted students
router.get("/students", custom_authenticate_token_1.admin_authenticate, student_controller_1.getAllActiveStudentsController);
//Student Request Membership
router.put("/students/request", custom_authenticate_token_1.student_authenticate, student_controller_1.setStudentMembershipRequest);
router.get("/students/deleted-students", custom_authenticate_token_1.admin_authenticate, student_controller_1.getAllDeleteStudentController);
router.get("/students/get-membership-status/:id", custom_authenticate_token_1.both_authenticate, student_controller_1.getMembershipStatusController);
// SOFT DELETE student by id_number
router.put("/students/softdelete", custom_authenticate_token_1.admin_authenticate, student_controller_1.softDeleteStudentController);
router.put("/students/restore", custom_authenticate_token_1.admin_authenticate, student_controller_1.restoreDeletedStudentController);
router.put("/students/cancel-membership", custom_authenticate_token_1.admin_authenticate, (0, custom_authenticate_token_1.role_authenticate)(["admin", "finance"]), student_controller_1.cancelMembershipRequestController);
router.post("/students/edited-student", custom_authenticate_token_1.admin_authenticate, student_controller_1.editStudentController);
router.post("/students/change-password-admin", custom_authenticate_token_1.admin_authenticate, student_controller_1.changeStudentPassword);
router.get("/fetch-specific-student/:id_number", custom_authenticate_token_1.both_authenticate, student_controller_1.fetchSpecificStudentController);
router.get("/students/student-membership-history/:id_number", custom_authenticate_token_1.admin_authenticate, student_controller_1.fetchSpecificMembershipHistoryController);
exports.default = router;
