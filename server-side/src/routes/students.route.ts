import { Router } from "express";
import {
  getAllActiveStudentsController,
  setStudentMembershipRequest,
  getAllDeleteStudentController,
  getMembershipStatusController,
  softDeleteStudentController,
  restoreDeletedStudentController,
  cancelMembershipRequestController,
  editStudentController,
  changeStudentPassword,
  fetchSpecificStudentController,
  fetchSpecificMembershipHistoryController,
  editStudentYearLevel,
  isYearUpdatedController,
} from "../controllers/student.controller";
import {
  admin_authenticate,
  student_authenticate,
  both_authenticate,
  role_authenticate,
} from "../middlewares/custom_authenticate_token";

const router = Router();

// GET list of accepted students
router.get("/students", admin_authenticate, getAllActiveStudentsController);
//Student Request Membership
router.put(
  "/students/request",
  student_authenticate,
  setStudentMembershipRequest
);

router.get(
  "/students/deleted-students",
  admin_authenticate,
  getAllDeleteStudentController
);

router.get(
  "/students/get-membership-status/:id",
  both_authenticate,
  getMembershipStatusController
);

// SOFT DELETE student by id_number
router.put(
  "/students/softdelete",
  admin_authenticate,
  softDeleteStudentController
);

router.put(
  "/students/restore",
  admin_authenticate,
  restoreDeletedStudentController
);

router.put(
  "/students/cancel-membership",
  admin_authenticate,
  role_authenticate(["admin", "finance"]),
  cancelMembershipRequestController
);

router.post(
  "/students/edited-student",
  admin_authenticate,
  editStudentController
);

router.post(
  "/students/change-password-admin",
  admin_authenticate,
  changeStudentPassword
);

router.get(
  "/fetch-specific-student/:id_number",
  both_authenticate,
  fetchSpecificStudentController
);

router.get(
  "/students/student-membership-history/:id_number",
  admin_authenticate,
  fetchSpecificMembershipHistoryController
);

router.put(
  "/students/edit-year-level/:id_number",
  both_authenticate,
  editStudentYearLevel
);

router.get(
  "/students/is-year-updated/:id_number",
  both_authenticate,
  isYearUpdatedController
);

export default router;
