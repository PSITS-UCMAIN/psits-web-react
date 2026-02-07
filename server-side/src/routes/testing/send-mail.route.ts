import { Router } from "express";
import { sendCertEJSTestController } from "../../controllers/testing/send-mail.controller";

const router = Router()

router.post("/cert-custom", sendCertEJSTestController)

export default router