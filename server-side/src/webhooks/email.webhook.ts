import { emailService } from "../services/email.service";

interface EmailWebhookData {
  created_at: Date;
  data: {
    created_at: Date;
    email_id: string;
    from: string;
    message_id: string;
    subject: string;
    to: string[];
  };
  type: "email.delivered" | "email.failed";
}

class EmailWebhook {
  //Email Delivered Webhook
  email = async (data: EmailWebhookData) => {
    // Update the email status in the database
    const result = await emailService.updateStatusByEmailId(
      data.data.email_id,
      data.type === "email.delivered" ? "delivered" : "failed"
    );
    if (!result) {
      console.error(`No email record found for ${data.data.to[0]}`);
    }
  };
}

export const emailWebhook = new EmailWebhook();
