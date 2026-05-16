import { Router } from "express";
import { 
  generateCertificate,
  getEligibleCertificatesForStudent 
} from "../controllers/certificate.controller";
import { verifyStudent } from "../middlewares/verifyStudent.middleware";

const router = Router();

// Get eligible certificates for authenticated student
router.get("/eligible", verifyStudent, getEligibleCertificatesForStudent);

// Generate certificate - requires student authentication
router.post("/generate", verifyStudent, generateCertificate);

export default router;
