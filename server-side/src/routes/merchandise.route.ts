import { Router, Request } from "express";
import multer from "multer";
import multerS3 from "multer-s3";
import { S3Client } from "@aws-sdk/client-s3";
import {
  createMerchandiseController,
  retrieveActiveMerchandiseController,
  retrieveSpecificMerchandiseController,
  retrieveMerchAdminController,
  deleteReportController,
  updateMerchandiseController,
  softDeleteMerchandiseController,
  publishMerchandiseController,
} from "../controllers/merchandise.controller";
import dotenv from "dotenv";
import {
  admin_authenticate,
  both_authenticate,
  role_authenticate,
} from "../middlewares/custom_authenticate_token";
const router = Router();

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-southeast-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const upload = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: process.env.AWS_BUCKET_NAME!,
    metadata: (
      req: Request,
      file: Express.Multer.File,
      cb: (error: any, metadata?: any) => void
    ) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: (
      req: Request,
      file: Express.Multer.File,
      cb: (error: any, key?: string) => void
    ) => {
      cb(null, `merchandise/${Date.now()}_${file.originalname}`);
    },
  }),
});

//Create Merchandise Route
router.post(
  "/",
  admin_authenticate,
  role_authenticate(["admin", "finance"]),
  upload.array("images", 3),
  createMerchandiseController
);
//Retrieve All Active Merchandise
router.get("/retrieve", both_authenticate, retrieveActiveMerchandiseController);
//Retrieve Specific Merchandise
router.get(
  "/retrieve/:id",
  both_authenticate,
  retrieveSpecificMerchandiseController
);

router.get("/retrieve-admin", admin_authenticate, retrieveMerchAdminController);
//Delete Report in Merchandise
router.delete(
  "/delete-report",
  admin_authenticate,
  role_authenticate(["admin", "finance"]),
  deleteReportController
);
//Update Merchandise Data
router.put(
  "/update/:_id",
  admin_authenticate,
  role_authenticate(["admin", "finance"]),
  upload.array("images", 3),
  updateMerchandiseController
);

// DELETE merch by id (soft)
router.put(
  "/delete-soft",
  admin_authenticate,
  role_authenticate(["admin", "finance"]),
  softDeleteMerchandiseController
);

// Publish merch
router.put(
  "/publish",
  admin_authenticate,
  role_authenticate(["admin", "finance"]),
  publishMerchandiseController
);

export default router;
