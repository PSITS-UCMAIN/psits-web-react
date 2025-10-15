import { Router, Request } from "express";
import multer from "multer";
import multerS3 from "multer-s3";
import { S3Client } from "@aws-sdk/client-s3";
import {
  admin_authenticate,
  both_authenticate,
  role_authenticate,
} from "../middlewares/custom_authenticate_token";
import {
  createManualEventController,
  getAllEventsController,
  getAllEventsAndAttendeesController,
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
import dotenv from "dotenv";
dotenv.config();

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
      cb(null, `event/${Date.now()}_${file.originalname}`);
    },
  }),
});

// POST: Create a new Event
router.post(
  "/create-event",
  admin_authenticate,
  upload.array("images", 3),
  createManualEventController
);

// GET all events
router.get("/get-all-event", both_authenticate, getAllEventsController);

// GET an event and all of its attendees
router.get(
  "/attendees/:id",
  admin_authenticate,
  getAllEventsAndAttendeesController
);

// UPDATE Attendee attendance per session
router.put(
  "/attendance/:event_id/:id_number",
  admin_authenticate,
  updateAttendancePerSessionController
);
//Check Limit per campus
router.get(
  "/check-limit/:eventId",
  admin_authenticate,
  checkLimitPerCampusController
);
//update-settings
router.post(
  "/update-settings/:eventId",
  admin_authenticate,
  updateLimitSettingsController
);

// Get Eligible Attendees for Raffle
router.get(
  "/raffle/:eventId",
  admin_authenticate,
  getEligibleAttendeesRaffleController
);

// Mark Attendee as Raffle Winner
router.post(
  "/raffle/winner/:eventId/:attendeeId",
  admin_authenticate,
  setAttendeeAsRaffleWinnerController
);

// Remove Attendee from Raffle
router.put(
  "/raffle/remove/:eventId/:attendeeId",
  admin_authenticate,
  removeAttendeeInRaffleController
);

// Add attendee in events
// Possibly unused route
router.post("/add-attendee", admin_authenticate, addAttendeeController);

//Get all statistic in events
router.get(
  "/get-statistics/:eventId",
  admin_authenticate,
  getEventStatisticsController
);
//Remove Events
router.post(
  "/remove-event",
  admin_authenticate,
  role_authenticate(["admin"]),
  removeEventController
);
//Remove Attendee
router.post(
  "/remove-attendance",
  admin_authenticate,
  removeAttendanceController
);

export default router;
