import { Router } from "express";
import { sendCertEJSTestController } from "../../controllers/testing/send-mail.controller";

const sendMailRoutes = Router()

sendMailRoutes.post("/cert-participation", sendCertEJSTestController)

export default sendMailRoutes