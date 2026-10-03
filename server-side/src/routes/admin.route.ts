import { Router } from "express";

import { adminController } from "../controllers/admin.v2.controller";
import { membershipController } from "../controllers/membership.v2.controller";

import {
  requireAccessTokenV2,
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2,
  adminAccessAuthenticateV2,
} from "../middlewares/authV2.middleware";
import { psits_roles } from "../enums/role.enums";
const router = Router();

//Search student by ID
router.get(
  "/student_search/:id_number",
  requireAccessTokenV2,
  roleAuthenticateV2(["admin"]),
  adminController.getSearchStudentByIdController
);
//ApproveMembership
router.post(
  "/approve-membership",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  adminAccessAuthenticateV2([psits_roles.ADMIN, psits_roles.FINANCE]),
  membershipController.approveMembershipController
);
//Revoke Student Membership
router.put(
  "/revoke-student",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  adminAccessAuthenticateV2([psits_roles.ADMIN]),
  membershipController.revokeAllMembershipController
);
//Membership History
router.get(
  "/history",
  requireAccessTokenV2,
  roleAuthenticateV2(["admin"]),
  membershipController.getMembershipHistoryController
);
//Manual correction of a membership reference code
router.patch(
  "/history/:id/reference",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  adminAccessAuthenticateV2([psits_roles.ADMIN, psits_roles.FINANCE]),
  membershipController.updateMembershipReferenceController
);
//Membership Request
router.get(
  "/membership-request",
  requireAccessTokenV2,
  roleAuthenticateV2(["admin"]),
  membershipController.getMembershipRequestController
);
//Dashboard Student Counts
router.get(
  "/get-dashboard",
  requireAccessTokenV2,
  roleAuthenticateV2(["admin"]),
  adminController.getDashboardStats
);
router.get(
  "/dashboard-stats",
  requireAccessTokenV2,
  roleAuthenticateV2(["admin"]),
  adminController.getDashboardStats
);
//get-active-membership-count
router.get(
  "/get-active-membership-count",
  requireAccessTokenV2,
  roleAuthenticateV2(["admin"]),
  membershipController.getActiveMembershipCountController
);

//get-student-count
router.get(
  "/get-students-count",
  requireAccessTokenV2,
  roleAuthenticateV2(["admin"]),
  adminController.getStudentCountController
);

//Get All admin officers
router.get(
  "/get-all-officers",
  requireAccessTokenV2,
  roleAuthenticateV2(["admin"]),
  adminAccessAuthenticateV2([
    psits_roles.ADMIN,
    psits_roles.FINANCE,
    psits_roles.EXECUTIVE,
  ]),
  adminController.getAllAdminController
);
//Get All Members
router.get(
  "/get-all-members",
  requireAccessTokenV2,
  roleAuthenticateV2(["admin"]),
  adminController.getAllAdminMembersController
);
//Get Suspend Admin Accounts
router.get(
  "/get-suspend-officers",
  requireAccessTokenV2,
  roleAuthenticateV2(["admin"]),
  adminController.getAllSuspendAdminAccountController
);
//Edit Admin Account
router.post(
  "/edit-officer",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  adminAccessAuthenticateV2([psits_roles.ADMIN]),
  adminController.editAdminController
);
//Change Password Admin Account
router.post(
  "/change-password-officer",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  adminAccessAuthenticateV2([psits_roles.ADMIN]),
  adminController.changeAdminPasswordController
);
//Set Admin Account to Suspend
router.put(
  "/suspend",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  adminAccessAuthenticateV2([psits_roles.ADMIN]),
  adminController.setSuspendAdminAccountController
);
//Set Member Role Remove
router.put(
  "/role-remove",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  adminAccessAuthenticateV2([psits_roles.ADMIN, psits_roles.EXECUTIVE]),
  adminController.setMemberRoleRemoveController
);
//Set Restore Deleted Admin
router.put(
  "/restore-officer",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  adminAccessAuthenticateV2(["admin"]),
  adminController.setRestoreAdminAccountController
);
//Set Admin Request Role to Member
router.put(
  "/request-role",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  adminController.setAdminRequestRoleController
);
//Get all Members Account Request Role
router.get(
  "/get-request-role",
  requireAccessTokenV2,
  roleAuthenticateV2(["admin"]),
  adminController.getAllRequestMemberRoleController
);
//Get all Admin Account Request Role
router.get(
  "/get-request-admin",
  requireAccessTokenV2,
  roleAuthenticateV2(["admin"]),
  adminController.getAllRequestAdminAccountController
);
//Set Approve Role for Members
router.put(
  "/approve-role",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  adminAccessAuthenticateV2([psits_roles.ADMIN]),
  adminController.approveRoleMemberController
);
//Set Decline Role for Members
router.put(
  "/decline-role",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  adminAccessAuthenticateV2([psits_roles.ADMIN]),
  adminController.setDeclineMemberRoleController
);
//Add New Admin Account
router.post(
  "/add-officer",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  adminAccessAuthenticateV2([psits_roles.ADMIN]),
  adminController.addNewAdminAccountController
);
//Approve Admin Account Creation
router.put(
  "/approve-admin-account",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  adminAccessAuthenticateV2([psits_roles.ADMIN]),
  adminController.approveAdminAccountController
);
//Decline Admin Account Creation
router.put(
  "/decline-admin-account",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  adminAccessAuthenticateV2([psits_roles.ADMIN]),
  adminController.declineAdminAccountController
);
//update-admin-access
router.put(
  "/update-admin-access",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  adminAccessAuthenticateV2([psits_roles.ADMIN]),
  adminController.setNewAdminAccessController
);
router.get(
  "/get-membership-price",
  requireAccessTokenV2,
  roleAuthenticateV2(["admin"]),
  membershipController.getMemberPriceController
);
router.put(
  "/change-membership-price",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  adminAccessAuthenticateV2([psits_roles.ADMIN, psits_roles.HEAD_FINANCE, psits_roles.FINANCE]),
  membershipController.changeMemberPriceController
);

export default router;
