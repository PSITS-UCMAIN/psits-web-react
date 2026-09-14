import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import multerS3 from "multer-s3";
import { r2Client } from "../lib/r2Client";
import path from "path";
import { merchandiseController } from "../controllers/merchandise.v2.controller";
import dotenv from "dotenv";
import {
  requireAccessTokenV2,
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2,
  adminAccessAuthenticateV2,
} from "../middlewares/authV2.middleware";
import { psits_roles } from "../enums/role.enums";
dotenv.config();

const router = Router();

const getUpload = () => {
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
        cb(null, `merchandise/${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
      },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (
      req: Request,
      file: Express.Multer.File,
      cb: multer.FileFilterCallback
    ) => {
      const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Only JPEG, PNG, WebP, GIF images are allowed"));
      }
    },
  });
};

router.post(
  "/",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  adminAccessAuthenticateV2([psits_roles.ADMIN, psits_roles.FINANCE]),
  getUpload().array("images", 3),
  (err: unknown, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: "UPLOAD_ERROR", message: err.message });
    }
    if (err) {
      console.error("Merchandise V2 upload failed:", err);
      return res.status(500).json({ error: "UPLOAD_ERROR", message: "Image upload failed" });
    }
    next();
  },
  merchandiseController.create
);

router.get(
  "/",
  requireAccessTokenV2,
  roleAuthenticateV2(["admin"]),
  merchandiseController.retrieveAll
);

router.get(
  "/active",
  requireAccessTokenV2,
  roleAuthenticateV2(["admin", "student"]),
  merchandiseController.retrieveActive
);

router.get(
  "/retrieve-published",
  requireAccessTokenV2,
  roleAuthenticateV2(["admin", "student"]),
  merchandiseController.retrievePublished
);

router.get("/image/*", merchandiseController.getImage);

router.get(
  "/:id",
  requireAccessTokenV2,
  roleAuthenticateV2(["admin", "student"]),
  merchandiseController.retrieveById
);

router.put(
  "/update/:_id",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  adminAccessAuthenticateV2([psits_roles.ADMIN, psits_roles.FINANCE]),
  getUpload().array("images", 3),
  (err: unknown, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: "UPLOAD_ERROR", message: err.message });
    }
    if (err) {
      console.error("Merchandise V2 upload failed:", err);
      return res.status(500).json({ error: "UPLOAD_ERROR", message: "Image upload failed" });
    }
    next();
  },
  merchandiseController.update
);

router.put(
  "/delete-soft",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  adminAccessAuthenticateV2([psits_roles.ADMIN, psits_roles.FINANCE]),
  merchandiseController.softDelete
);

router.put(
  "/publish",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  adminAccessAuthenticateV2([psits_roles.ADMIN, psits_roles.FINANCE]),
  merchandiseController.publish
);

router.delete(
  "/hard-delete",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  adminAccessAuthenticateV2([psits_roles.ADMIN, psits_roles.FINANCE]),
  merchandiseController.hardDelete
);

export default router;
