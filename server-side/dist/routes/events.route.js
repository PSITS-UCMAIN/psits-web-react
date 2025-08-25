"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const multer_s3_1 = __importDefault(require("multer-s3"));
const client_s3_1 = require("@aws-sdk/client-s3");
const custom_authenticate_token_1 = require("../middlewares/custom_authenticate_token");
const event_controller_1 = require("../controllers/event.controller");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const router = (0, express_1.Router)();
const s3Client = new client_s3_1.S3Client({
    region: process.env.AWS_REGION || "ap-southeast-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
});
const upload = (0, multer_1.default)({
    storage: (0, multer_s3_1.default)({
        s3: s3Client,
        bucket: process.env.AWS_BUCKET_NAME,
        metadata: (req, file, cb) => {
            cb(null, { fieldName: file.fieldname });
        },
        key: (req, file, cb) => {
            cb(null, `event/${Date.now()}_${file.originalname}`);
        },
    }),
});
// POST: Create a new Event
router.post("/create-event", custom_authenticate_token_1.admin_authenticate, upload.array("images", 3), event_controller_1.createManualEventController);
// GET all events
router.get("/get-all-event", custom_authenticate_token_1.both_authenticate, event_controller_1.getAllEventsController);
// GET all events and attendees
router.get("/attendees/:id", custom_authenticate_token_1.admin_authenticate, event_controller_1.getAllEventsAndAttendeesController);
// UPDATE Attendee attendance per session
router.put("/attendance/:event_id/:id_number", custom_authenticate_token_1.admin_authenticate, event_controller_1.updateAttendancePerSessionController);
//Check Limit per campus
router.get("/check-limit/:eventId", custom_authenticate_token_1.admin_authenticate, event_controller_1.checkLimitPerCampusController);
//update-settings
router.post("/update-settings/:eventId", custom_authenticate_token_1.admin_authenticate, event_controller_1.updateLimitSettingsController);
// Get Eligible Attendees for Raffle
router.get("/raffle/:eventId", custom_authenticate_token_1.admin_authenticate, event_controller_1.getEligibleAttendeesRaffleController);
// Mark Attendee as Raffle Winner
router.post("/raffle/winner/:eventId/:attendeeId", custom_authenticate_token_1.admin_authenticate, event_controller_1.setAttendeeAsRaffleWinnerController);
// Remove Attendee from Raffle
router.put("/raffle/remove/:eventId/:attendeeId", custom_authenticate_token_1.admin_authenticate, event_controller_1.removeAttendeeInRaffleController);
//Add attendee in events
router.post("/add-attendee", custom_authenticate_token_1.admin_authenticate, event_controller_1.addAttendeeController);
//Get all statistic in events
router.get("/get-statistics/:eventId", custom_authenticate_token_1.admin_authenticate, event_controller_1.getEventStatisticsController);
//Remove Events
router.post("/remove-event", custom_authenticate_token_1.admin_authenticate, (0, custom_authenticate_token_1.role_authenticate)(["admin"]), event_controller_1.removeEventController);
//Remove Attendee
router.post("/remove-attendance", custom_authenticate_token_1.admin_authenticate, event_controller_1.removeAttendanceController);
exports.default = router;
