import { Router } from "express";
import sendMailRoutes from "./send-mail.route";

const router = Router()

router.use("/mail", sendMailRoutes)

export default router