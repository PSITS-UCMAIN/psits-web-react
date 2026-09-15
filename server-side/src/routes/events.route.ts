import { Router, Request } from "express";
import multer from "multer";
import multerS3 from "multer-s3";
import { S3Client } from "@aws-sdk/client-s3";
import {
  requireAccessTokenV2,
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2,
  adminAccessAuthenticateV2,
} from "../middlewares/authV2.middleware";
import {
  createManualEventController,
  updateAttendancePerSessionController,
  checkLimitPerCampusController,
  updateLimitSettingsController,
  getEligibleAttendeesRaffleController,
  setAttendeeAsRaffleWinnerController,
  removeAttendeeInRaffleController,
  addAttendeeController,
  getEventStatisticsController,
  removeEventController,
  removeAttendanceController,
} from "../controllers/event.controller";

const router = Router();

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

const getUpload = () => {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) return multer();

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
      key: (
        req: Request,
        file: Express.Multer.File,
        cb: (error: any, key?: string) => void
      ) => {
        cb(null, `events/${Date.now()}_${file.originalname}`);
      },
    }),
  });
};

// POST: Create a new Event
router.post(
  "/create-event",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  getUpload().array("images", 3),
  createManualEventController
);

// UPDATE Attendee attendance per session
router.put(
  "/attendance/:event_id/:id_number",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  updateAttendancePerSessionController
);
//Check Limit per campus
router.get(
  "/check-limit/:eventId",
  requireAccessTokenV2,
  roleAuthenticateV2(["admin"]),
  checkLimitPerCampusController
);
//update-settings
router.post(
  "/update-settings/:eventId",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  updateLimitSettingsController
);

// Get Eligible Attendees for Raffle
router.get(
  "/raffle/:eventId",
  requireAccessTokenV2,
  roleAuthenticateV2(["admin"]),
  getEligibleAttendeesRaffleController
);

// Mark Attendee as Raffle Winner
router.post(
  "/raffle/winner/:eventId/:attendeeId",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  setAttendeeAsRaffleWinnerController
);

// Remove Attendee from Raffle
router.put(
  "/raffle/remove/:eventId/:attendeeId",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  removeAttendeeInRaffleController
);

// Add attendee in events
// Possibly unused route
router.post(
  "/add-attendee",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  addAttendeeController
);

//Get all statistic in events
router.get(
  "/get-statistics/:eventId",
  requireAccessTokenV2,
  roleAuthenticateV2(["admin"]),
  getEventStatisticsController
);
//Remove Events
router.post(
  "/remove-event",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  adminAccessAuthenticateV2(["admin"]),
  removeEventController
);
//Remove Attendee
router.post(
  "/remove-attendance",
  requireAccessTokenWithDBCheck,
  roleAuthenticateV2(["admin"]),
  removeAttendanceController
);

export default router;
