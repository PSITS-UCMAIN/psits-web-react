import { Router } from "express";
import { sendCertParticipationController } from "../controllers/mail.controller";

const router = Router()

router.post("/send-cert-participation", sendCertParticipationController)

export default router