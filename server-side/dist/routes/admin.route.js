"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const custom_authenticate_token_1 = require("../middlewares/custom_authenticate_token");
const admin_controller_1 = require("../controllers/admin.controller");
const router = (0, express_1.Router)();
//Search student by ID
router.get("/student_search/:id_number", custom_authenticate_token_1.admin_authenticate, admin_controller_1.getSearchStudentByIdController);
//ApproveMembership
router.post("/approve-membership", custom_authenticate_token_1.admin_authenticate, (0, custom_authenticate_token_1.role_authenticate)(["admin", "finance"]), admin_controller_1.approveMembershipController);
//Revoke Student Membership
router.put("/revoke-student", custom_authenticate_token_1.admin_authenticate, (0, custom_authenticate_token_1.role_authenticate)(["admin"]), admin_controller_1.revokeAllMembershipController);
//Membership History
router.get("/history", custom_authenticate_token_1.admin_authenticate, admin_controller_1.getMembershipHistoryController);
//Membership Request
router.get("/membership-request", custom_authenticate_token_1.admin_authenticate, admin_controller_1.getMembershipRequestController);
//Dashboard Student Counts
router.get("/get-students-count", custom_authenticate_token_1.admin_authenticate, admin_controller_1.getStudentsCountController);
//get-active-membership-count
router.get("/get-active-membership-count", custom_authenticate_token_1.admin_authenticate, admin_controller_1.getActiveMembershipCountController);
//Dashboard Publish Merchandise Count
router.get("/merchandise-created", custom_authenticate_token_1.admin_authenticate, admin_controller_1.getPublishMerchandiseCountController);
//Dashboard Placed Order Count
router.get("/placed-orders", custom_authenticate_token_1.admin_authenticate, admin_controller_1.getOrderPlacedCountController);
//All Student Dashboard Stats
router.get("/dashboard-stats", custom_authenticate_token_1.admin_authenticate, admin_controller_1.getStudentDashboardCountController);
//Get Daily Sales Stats
router.get("/get-daily-sales", custom_authenticate_token_1.admin_authenticate, admin_controller_1.getDailySalesController);
//Get All admin officers
router.get("/get-all-officers", custom_authenticate_token_1.admin_authenticate, admin_controller_1.getAllAdminAccountsController);
//Get All Members
router.get("/get-all-members", custom_authenticate_token_1.admin_authenticate, admin_controller_1.getAllAdminMembersController);
//Get Suspend Admin Accounts
router.get("/get-suspend-officers", custom_authenticate_token_1.admin_authenticate, admin_controller_1.getAllSuspendAdminAccountController);
//Edit Admin Account
router.post("/edit-officer", custom_authenticate_token_1.admin_authenticate, (0, custom_authenticate_token_1.role_authenticate)(["admin"]), admin_controller_1.editAdminAccountController);
//Change Password Admin Account
router.post("/change-password-officer", custom_authenticate_token_1.admin_authenticate, (0, custom_authenticate_token_1.role_authenticate)(["admin"]), admin_controller_1.changeAdminPasswordController);
//Set Admin Account to Suspend
router.put("/suspend", custom_authenticate_token_1.admin_authenticate, (0, custom_authenticate_token_1.role_authenticate)(["admin"]), admin_controller_1.setSuspendAdminAccountController);
//Set Member Role Remove
router.put("/role-remove", custom_authenticate_token_1.admin_authenticate, (0, custom_authenticate_token_1.role_authenticate)(["admin", "executive"]), admin_controller_1.setMemberRoleRemoveController);
//Set Restore Deleted Admin
router.put("/restore-officer", custom_authenticate_token_1.admin_authenticate, (0, custom_authenticate_token_1.role_authenticate)(["admin"]), admin_controller_1.setRestoreAdminAccountController);
//Set Admin Request Role to Member
router.put("/request-role", custom_authenticate_token_1.admin_authenticate, admin_controller_1.setAdminRequestRoleController);
//Get all Members Account Request Role
router.get("/get-request-role", custom_authenticate_token_1.admin_authenticate, admin_controller_1.getAllRequestMemberController);
//Get all Admin Account Request Role
router.get("/get-request-admin", custom_authenticate_token_1.admin_authenticate, admin_controller_1.getAllRequestAdminAccountController);
//Set Approve Role for Members
router.put("/approve-role", custom_authenticate_token_1.admin_authenticate, (0, custom_authenticate_token_1.role_authenticate)(["admin"]), admin_controller_1.approveRoleMemberController);
//Set Decline Role for Members
router.put("/decline-role", custom_authenticate_token_1.admin_authenticate, (0, custom_authenticate_token_1.role_authenticate)(["admin"]), admin_controller_1.setDeclineMemberRoleController);
//Add New Admin Account
router.post("/add-officer", custom_authenticate_token_1.admin_authenticate, (0, custom_authenticate_token_1.role_authenticate)(["admin"]), admin_controller_1.addNewAdminAccountController);
//Approve Admin Account Creation
router.put("/approve-admin-account", custom_authenticate_token_1.admin_authenticate, (0, custom_authenticate_token_1.role_authenticate)(["admin"]), admin_controller_1.approveAdminAccountController);
//Decline Admin Account Creation
router.put("/decline-admin-account", custom_authenticate_token_1.admin_authenticate, (0, custom_authenticate_token_1.role_authenticate)(["admin"]), admin_controller_1.declineAdminAccountController);
//update-admin-access
router.put("/update-admin-access", custom_authenticate_token_1.admin_authenticate, admin_controller_1.setNewAdminAccessController);
exports.default = router;
