import { Router } from "express";
import multer from "multer";
import {
  addEligibleCertificates,
  removeEligibleCertificates,
  getEligibleCertificatesByEvent,
  bulkCheckEligibility,
  importEligibleCertificatesFromCSV,
} from "../controllers/eligibleCertificate.controller";
import { verifyAdmin } from "../middlewares/verifyAdmin.middleware";

const router = Router();

// Configure multer for CSV file upload (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"));
    }
  },
});

// All routes require admin authentication
router.use(verifyAdmin);

// Add eligible certificates
router.post("/", addEligibleCertificates);

// Remove eligible certificates
router.delete("/", removeEligibleCertificates);

// Get eligible certificates by event
router.get("/event/:eventId", getEligibleCertificatesByEvent);

// Bulk check eligibility
router.post("/bulk-check", bulkCheckEligibility);

// Import from CSV
router.post("/import-csv", upload.single("file"), importEligibleCertificatesFromCSV);

export default router;
