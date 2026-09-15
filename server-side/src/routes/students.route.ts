import { Router } from "express";
import {
  getAllActiveStudentsController,
  getAllDeleteStudentController,
  softDeleteStudentController,
  restoreDeletedStudentController,
  cancelMembershipRequestController,
  editStudentController,
  changeStudentPassword,
  fetchSpecificStudentController,
  fetchSpecificMembershipHistoryController,
  editStudentYearLevel,
} from "../controllers/student.controller";
import {
  requireAccessTokenV2,
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2,
  adminAccessAuthenticateV2,
} from "../middlewares/authV2.middleware";
import { membershipController } from "../controllers/membership.v2.controller";

const router = Router();

// GET list of accepted students
router.get(
  "/students",
  requireAccessTokenV2,
  roleAuthenticateV2(["admin"]),
  getAllActiveStudentsController
);
router.get(
  "/students/deleted-students",
  requireAccessTokenV2,
  roleAuthenticateV2(["admin"]),
  getAllDeleteStudentController
);

// SOFT DELETE student by id_number
router.put(
  "/students/softdelete",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  softDeleteStudentController
);

router.put(
  "/students/restore",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  restoreDeletedStudentController
);

router.put(
  "/students/cancel-membership",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  adminAccessAuthenticateV2(["admin", "finance"]),
  cancelMembershipRequestController
);

router.post(
  "/students/edited-student",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  editStudentController
);

router.post(
  "/students/change-password-admin",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  changeStudentPassword
);

router.get(
  "/fetch-specific-student/:id_number",
  requireAccessTokenV2,
  roleAuthenticateV2(["admin", "student"]),
  fetchSpecificStudentController
);

router.get(
  "/students/student-membership-history/:id_number",
  requireAccessTokenV2,
  roleAuthenticateV2(["admin"]),
  fetchSpecificMembershipHistoryController
);

router.put(
  "/students/edit-year-level/:id_number",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin", "student"]),
  editStudentYearLevel
);

// MEMBERSHIP CRUD ROUTES
router.post(
  "/membership",
  requireAccessTokenV2,
  roleAuthenticateV2(["admin"]),
  membershipController.createMembershipController
);

router.get(
  "/membership",
  requireAccessTokenV2,
  roleAuthenticateV2(["admin"]),
  membershipController.getAllMembershipController
);

router.get(
  "/membership/:id",
  requireAccessTokenV2,
  roleAuthenticateV2(["admin"]),
  membershipController.getMembershipByIdController
);

router.get(
  "/membership/:id/histories",
  requireAccessTokenV2,
  roleAuthenticateV2(["admin"]),
  membershipController.getMembershipHistoriesController
);

router.put(
  "/membership/:id",
  requireAccessTokenV2,
  roleAuthenticateV2(["admin"]),
  membershipController.updateMembershipController
);

router.post(
  "/membership/:id/activate",
  requireAccessTokenV2,
  roleAuthenticateV2(["admin"]),
  membershipController.activateMembershipController
);

router.delete(
  "/membership/:id",
  requireAccessTokenV2,
  roleAuthenticateV2(["admin"]),
  membershipController.revokeMembershipController
);

router.post(
  "/membership/expire-past-due",
  requireAccessTokenV2,
  roleAuthenticateV2(["admin"]),
  membershipController.expirePastDueMembershipsController
);

export default router;
