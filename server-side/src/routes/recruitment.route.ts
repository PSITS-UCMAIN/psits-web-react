import { Router, Request, Response, NextFunction } from "express";
import { recruitmentController } from "../controllers/recruitment.v2.controller";
import {
  requireAccessTokenV2,
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2,
  adminAccessAuthenticateV2,
} from "../middlewares/authV2.middleware";
import { psits_roles } from "../enums/role.enums";
import { applicationSubmitLimiter } from "../util/limiter.util";
import multer from "multer";
import multerS3 from "multer-s3";
import { r2Client } from "../lib/r2Client";
import path from "path";

const getResumeUpload = () => {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) {
    return multer();
  }

  return multer({
    storage: multerS3({
      s3: r2Client,
      bucket,
      metadata: (
        req: Request,
        file: Express.Multer.File,
        cb: (error: any, metadata?: any) => void
      ) => {
        cb(null, { fieldName: file.fieldname });
      },
      contentType: (
        req: Request,
        file: Express.Multer.File,
        cb: (error: any, contentType?: string) => void
      ) => {
        cb(null, file.mimetype);
      },
      key: (
        req: Request,
        file: Express.Multer.File,
        cb: (error: any, key?: string) => void
      ) => {
        const ext = path.extname(file.originalname);
        const positionId = req.params.id ?? "unknown";
        cb(
          null,
          `recruitment/${positionId}/resume/${Date.now()}_${Math.random()
            .toString(36)
            .slice(2)}${ext}`
        );
      },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (
      req: Request,
      file: Express.Multer.File,
      cb: multer.FileFilterCallback
    ) => {
      const allowed = ["application/pdf"];
      if (allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Only PDF resumes are allowed"));
      }
    },
  });
};

const router = Router();

// All admin access levels EXCEPT STANDARD / NO_ACCESS can manage recruitment
const recruitmentMutationRoles = [
  psits_roles.ADMIN,
  psits_roles.HEAD_FINANCE,
  psits_roles.FINANCE,
  psits_roles.EXECUTIVE,
  psits_roles.DEVELOPER,
];

/** Public endpoints - no auth required for reading positions */
router.get("/positions", recruitmentController.listPositions);

router.get("/positions/:id", recruitmentController.getPositionById);

/** Admin-only endpoints - require role authentication */
router.post(
  "/positions",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  adminAccessAuthenticateV2(recruitmentMutationRoles),
  recruitmentController.createPosition
);

router.post(
  "/positions/bulk-open",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  adminAccessAuthenticateV2(recruitmentMutationRoles),
  recruitmentController.createPositionsFromOpening
);

router.patch(
  "/positions/:id",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  adminAccessAuthenticateV2(recruitmentMutationRoles),
  recruitmentController.updatePosition
);

router.delete(
  "/positions/:id",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  adminAccessAuthenticateV2(recruitmentMutationRoles),
  recruitmentController.deletePosition
);

router.patch(
  "/positions/:id/hiring-status",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  adminAccessAuthenticateV2(recruitmentMutationRoles),
  recruitmentController.toggleHiringStatus
);

router.post(
  "/positions/:id/applications",
  requireAccessTokenV2,
  roleAuthenticateV2(["student"]),
  applicationSubmitLimiter,
  getResumeUpload().fields([{ name: "resume", maxCount: 1 }]),
  (err: unknown, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof multer.MulterError) {
      return res
        .status(400)
        .json({ error: "UPLOAD_ERROR", message: err.message });
    }
    if (err) {
      console.error("Resume upload failed:", err);
      return res
        .status(500)
        .json({ error: "UPLOAD_ERROR", message: "Resume upload failed" });
    }
    next();
  },
  recruitmentController.submitApplication
);

router.get(
  "/applications/me",
  requireAccessTokenV2,
  roleAuthenticateV2(["student"]),
  recruitmentController.getApplicationsForUser
);

router.get(
  "/applications/me/:id",
  requireAccessTokenV2,
  roleAuthenticateV2(["student"]),
  recruitmentController.getApplicationForUser
);

router.get(
  "/applications/:id/resume",
  requireAccessTokenV2,
  roleAuthenticateV2(["admin"]),
  recruitmentController.downloadResume
);

router.get(
  "/applications/:id/resume-url",
  requireAccessTokenV2,
  roleAuthenticateV2(["admin"]),
  recruitmentController.getResumeUrl
);
/** Admin endpoints - applicant management */
router.get(
  "/applicants",
  requireAccessTokenV2,
  roleAuthenticateV2(["admin"]),
  recruitmentController.getApplicants
);

router.get(
  "/applications/:id",
  requireAccessTokenV2,
  roleAuthenticateV2(["admin"]),
  recruitmentController.getApplicationDetails
);

router.delete(
  "/applicants/rejected",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  adminAccessAuthenticateV2(recruitmentMutationRoles),
  recruitmentController.clearRejectedApplications
);

router.patch(
  "/applications/:id/status",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  adminAccessAuthenticateV2(recruitmentMutationRoles),
  recruitmentController.updateApplicationStatus
);

router.delete(
  "/applications/:id",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  adminAccessAuthenticateV2(recruitmentMutationRoles),
  recruitmentController.deleteApplication
);

router.post(
  "/applications/:id/verify",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  adminAccessAuthenticateV2(recruitmentMutationRoles),
  recruitmentController.verifyApplicantAccount
);

router.post(
  "/applications/:id/interview",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  adminAccessAuthenticateV2(recruitmentMutationRoles),
  recruitmentController.createInterview
);

router.patch(
  "/applications/:id/interview",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  adminAccessAuthenticateV2(recruitmentMutationRoles),
  recruitmentController.updateInterview
);

router.delete(
  "/applications/:id/interview",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  adminAccessAuthenticateV2(recruitmentMutationRoles),
  recruitmentController.cancelInterview
);

export default router;
