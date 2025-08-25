import { Router } from "express";
import {
  admin_authenticate,
  role_authenticate,
} from "../middlewares/custom_authenticate_token";
import {
  getSearchStudentByIdController,
  approveMembershipController,
  revokeAllMembershipController,
  getMembershipHistoryController,
  getMembershipRequestController,
  getStudentsCountController,
  getActiveMembershipCountController,
  getPublishMerchandiseCountController,
  getOrderPlacedCountController,
  getStudentDashboardCountController,
  getDailySalesController,
  getAllAdminAccountsController,
  getAllAdminMembersController,
  getAllSuspendAdminAccountController,
  editAdminAccountController,
  changeAdminPasswordController,
  setSuspendAdminAccountController,
  setMemberRoleRemoveController,
  setRestoreAdminAccountController,
  setAdminRequestRoleController,
  getAllRequestMemberController,
  getAllRequestAdminAccountController,
  approveRoleMemberController,
  setDeclineMemberRoleController,
  addNewAdminAccountController,
  approveAdminAccountController,
  declineAdminAccountController,
  setNewAdminAccessController,
} from "../controllers/admin.controller";

const router = Router();

//Search student by ID
router.get(
  "/student_search/:id_number",
  admin_authenticate,
  getSearchStudentByIdController
);
//ApproveMembership
router.post(
  "/approve-membership",
  admin_authenticate,
  role_authenticate(["admin", "finance"]),
  approveMembershipController
);
//Revoke Student Membership
router.put(
  "/revoke-student",
  admin_authenticate,
  role_authenticate(["admin"]),
  revokeAllMembershipController
);
//Membership History
router.get("/history", admin_authenticate, getMembershipHistoryController);
//Membership Request
router.get(
  "/membership-request",
  admin_authenticate,
  getMembershipRequestController
);
//Dashboard Student Counts
router.get(
  "/get-students-count",
  admin_authenticate,
  getStudentsCountController
);
//get-active-membership-count
router.get(
  "/get-active-membership-count",
  admin_authenticate,
  getActiveMembershipCountController
);
//Dashboard Publish Merchandise Count
router.get(
  "/merchandise-created",
  admin_authenticate,
  getPublishMerchandiseCountController
);
//Dashboard Placed Order Count
router.get("/placed-orders", admin_authenticate, getOrderPlacedCountController);
//All Student Dashboard Stats
router.get(
  "/dashboard-stats",
  admin_authenticate,
  getStudentDashboardCountController
);
//Get Daily Sales Stats
router.get("/get-daily-sales", admin_authenticate, getDailySalesController);
//Get All admin officers
router.get(
  "/get-all-officers",
  admin_authenticate,
  getAllAdminAccountsController
);
//Get All Members
router.get(
  "/get-all-members",
  admin_authenticate,
  getAllAdminMembersController
);
//Get Suspend Admin Accounts
router.get(
  "/get-suspend-officers",
  admin_authenticate,
  getAllSuspendAdminAccountController
);
//Edit Admin Account
router.post(
  "/edit-officer",
  admin_authenticate,
  role_authenticate(["admin"]),
  editAdminAccountController
);
//Change Password Admin Account
router.post(
  "/change-password-officer",
  admin_authenticate,
  role_authenticate(["admin"]),
  changeAdminPasswordController
);
//Set Admin Account to Suspend
router.put(
  "/suspend",
  admin_authenticate,
  role_authenticate(["admin"]),
  setSuspendAdminAccountController
);
//Set Member Role Remove
router.put(
  "/role-remove",
  admin_authenticate,
  role_authenticate(["admin", "executive"]),
  setMemberRoleRemoveController
);
//Set Restore Deleted Admin
router.put(
  "/restore-officer",
  admin_authenticate,
  role_authenticate(["admin"]),
  setRestoreAdminAccountController
);
//Set Admin Request Role to Member
router.put("/request-role", admin_authenticate, setAdminRequestRoleController);
//Get all Members Account Request Role
router.get(
  "/get-request-role",
  admin_authenticate,
  getAllRequestMemberController
);
//Get all Admin Account Request Role
router.get(
  "/get-request-admin",
  admin_authenticate,
  getAllRequestAdminAccountController
);
//Set Approve Role for Members
router.put(
  "/approve-role",
  admin_authenticate,
  role_authenticate(["admin"]),
  approveRoleMemberController
);
//Set Decline Role for Members
router.put(
  "/decline-role",
  admin_authenticate,
  role_authenticate(["admin"]),
  setDeclineMemberRoleController
);
//Add New Admin Account
router.post(
  "/add-officer",
  admin_authenticate,
  role_authenticate(["admin"]),
  addNewAdminAccountController
);
//Approve Admin Account Creation
router.put(
  "/approve-admin-account",
  admin_authenticate,
  role_authenticate(["admin"]),
  approveAdminAccountController
);
//Decline Admin Account Creation
router.put(
  "/decline-admin-account",
  admin_authenticate,
  role_authenticate(["admin"]),
  declineAdminAccountController
);
//update-admin-access
router.put(
  "/update-admin-access",
  admin_authenticate,
  setNewAdminAccessController
);

export default router;
