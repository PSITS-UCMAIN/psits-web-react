import { Router } from "express";
import sendMailRoutes from "./send-mail.route";
import { previewEJSController } from "../../controllers/testing/preview.controller";

const router = Router()

router.use("/email", sendMailRoutes)
router.post("/ejs/preview", previewEJSController)

export default router