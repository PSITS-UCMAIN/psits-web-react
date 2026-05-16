import { Router } from "express";
import { 
  generateCertificate,
  getEligibleCertificatesForStudent 
} from "../controllers/certificate.controller";
import { requireAccessTokenV2, roleAuthenticateV2 } from "../middlewares/authV2.middleware";

const router = Router();

// Get eligible certificates for authenticated student
router.get("/eligible", requireAccessTokenV2, roleAuthenticateV2(["Student"]), getEligibleCertificatesForStudent);

// Generate certificate - requires student authentication
router.post("/generate", requireAccessTokenV2, roleAuthenticateV2(["Student"]), generateCertificate);

export default router;
