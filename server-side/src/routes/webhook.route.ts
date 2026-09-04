import { Router } from "express";
import { Request, Response } from "express";
import { emailWebhook } from "../webhooks/email.webhook";
import { verifyResendWebhook } from "../middlewares/resend.webhook.middleware";
const router = Router();

router.post("/", verifyResendWebhook, async (req: Request, res: Response) => {
  await emailWebhook.email(req.body);
  res.status(200).json({ message: "Webhook received" });
});

export default router;
