import { Router, Request } from "express";
import { reportController } from "../controllers/report.v2.controller";
import dotenv from "dotenv";
import {
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2,
} from "../middlewares/authV2.middleware";
dotenv.config();

const router = Router();

router.get(
  "/filter-options",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  reportController.fetchFilterOptions
);

router.get(
  "/export",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  reportController.exportReport
);

router.get(
  "/refunds/export",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  reportController.exportRefundReport
);

router.get(
  "/refunds",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  reportController.fetchRefundReport
);

router.get(
  "/",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  reportController.fetchReport
);

export default router;
