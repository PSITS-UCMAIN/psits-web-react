import ejs from "ejs";
import path from "path";
import fs from "fs/promises";
import { Resend } from "resend";
import {
  IMembershipRequest,
  IOrderReceipt,
  TCertificateData,
} from "./mail.interface";
// dynamic imports for schema and PDF generator are used below to avoid
// circular import issues at runtime

import dotenv from "dotenv";
dotenv.config();

import { emailService } from "../services/email.service";
import { AppError } from "../util/app.error.util";

const MANILA_TIME_ZONE = "Asia/Manila";

const receiptDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: MANILA_TIME_ZONE,
  month: "long",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/**
 * Formats a date for display inside receipt emails.
 *
 * The EJS receipt templates are "dumb" - they never format, so every caller has
 * to hand them a ready-to-print string. Passing a raw Date makes EJS stringify
 * it as "Fri Sep 04 2026 10:00:00 GMT+0800 (Singapore Standard Time)".
 *
 * The timezone is pinned to Asia/Manila so the rendered time does not shift
 * with whatever timezone the server happens to run in.
 *
 * The output is assembled from the formatter's individual parts rather than
 * from `toLocaleString`, so the result never picks up the locale's connector
 * wording ("... at 10:00 AM") nor the narrow no-break space Node emits before
 * AM/PM - both of which make the string awkward to copy out of the email.
 *
 * @param value - A Date, ISO string, or timestamp. May be null/undefined.
 * @returns e.g. "September 4, 2026 10:00 AM", or "N/A" when missing/invalid
 */
export const formatReceiptDateTime = (
  value?: Date | string | number | null
): string => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  const parts = receiptDateTimeFormatter.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  return `${part("month")} ${part("day")}, ${part("year")} ${part("hour")}:${part("minute")} ${part("dayPeriod")}`;
};

type EmailTemplateOptions = {
  category: string;
  title: string;
  bodyHtml: string;
  accentColor?: string;
  logoDataUri?: string;
};

const renderPsitsEmail = ({
  category,
  title,
  bodyHtml,
  accentColor = "#1c9dde",
  logoDataUri = "",
}: EmailTemplateOptions): string => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7; padding:32px 16px; font-family: Arial, Helvetica, sans-serif;">
  <tr>
    <td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #ececec;">
        <tr>
          <td style="height:4px; background-color:${accentColor}; font-size:0; line-height:0;">&nbsp;</td>
        </tr>
        <tr>
          <td style="padding:24px 32px 20px 32px; border-bottom:1px solid #f0f0f0;">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-right:14px; vertical-align:middle;">
                  ${logoDataUri ? `<img src="${logoDataUri}" width="44" height="44" alt="PSITS" style="display:block; border-radius:50%; border:1px solid #eee;" />` : ""}
                </td>
                <td style="vertical-align:middle;">
                  <p style="margin:0; font-size:11px; letter-spacing:1px; color:#9a9a9a; font-weight:700; text-transform:uppercase;">
                    ${category}
                  </p>
                  <p style="margin:3px 0 0 0; font-size:20px; line-height:1.3; color:#1f1f1f; font-weight:bold;">
                    ${title}
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px 32px 32px; color:#444444; font-size:15px; line-height:1.6;">
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px; background-color:#fafafa; border-top:1px solid #f0f0f0; text-align:center;">
            <p style="margin:0; font-size:12px; color:#aaaaaa;">
              — PSITS UC-Main &middot; Philippine Society of Information Technology Students
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
`;

const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  return new Resend(apiKey);
};

type SendEmailOptions = {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename?: string;
    path?: string;
    content?: string | Buffer;
    contentType?: string;
    contentId?: string;
  }>;
};

let cachedLogoAttachment: {
  filename: string;
  content: Buffer;
  contentType: string;
  contentId: string;
} | null = null;

const getLogoAttachment = async () => {
  if (!cachedLogoAttachment) {
    const logoPath = path.join(__dirname, "../assets/psits.jpg");
    const logoBuffer = await fs.readFile(logoPath);
    cachedLogoAttachment = {
      filename: "psits.jpg",
      content: logoBuffer,
      contentType: "image/jpeg",
      contentId: "logo",
    };
  }
  return cachedLogoAttachment;
};

const sendEmail = async ({
  to,
  subject,
  html,
  attachments,
}: SendEmailOptions) => {
  const from = process.env.EMAIL;

  if (!from) {
    throw new Error("EMAIL is not configured");
  }

  const resend = getResendClient();

  const result = await resend.emails.send({
    from,
    to,
    subject,
    html,
    attachments,
  });
  return result.data;
};

const sendPsitsTemplatedEmail = async (opts: {
  to: string;
  subject: string;
  category: string;
  title: string;
  bodyHtml: string;
  extraAttachments?: SendEmailOptions["attachments"];
}) => {
  const logoAttachment = await getLogoAttachment();
  const html = renderPsitsEmail({
    category: opts.category,
    title: opts.title,
    bodyHtml: opts.bodyHtml,
    logoDataUri: "cid:logo",
  });

  return await sendEmail({
    to: opts.to,
    subject: opts.subject,
    html,
    attachments: [logoAttachment, ...(opts.extraAttachments ?? [])],
  });
};

export const membershipRequestReceipt = async (
  data: IMembershipRequest,
  studenteEmail: string,
  studentId?: string | null,
  referenceCode?: string
) => {
  if (!studenteEmail || !studentId || !referenceCode) {
    return;
  }

  const emailTemplate = await ejs.renderFile(
    path.join(__dirname, "../assets/appr-membership-receipt.ejs"),
    data
  );

  const logoPath = path.join(__dirname, "../assets/psits.jpg");
  const logoBuffer = await fs.readFile(logoPath);

  try {
    const queueEntry = await emailService.createByEmail(
      "receipt",
      studenteEmail,
      "membership",
      referenceCode
    );

    const id = await sendEmail({
      to: studenteEmail,
      subject: "Your Receipt from PSITS - UC Main",
      html: emailTemplate,
      attachments: [
        {
          filename: "psits.jpg",
          content: logoBuffer,
          contentType: "image/jpeg",
          contentId: "logo",
        },
      ],
    });
    if (!id) {
      throw new AppError("Didnt received id", 500);
    }
    await emailService.updateEmailIdById(String(queueEntry._id), id?.id);
    await emailService.updateStatusById(String(queueEntry._id), "sent");
  } catch (err: unknown) {
    console.error(
      "Failed to send membership request receipt email:",
      err instanceof Error ? err.message : err
    );
  }
};

export const orderReceipt = async (
  data: IOrderReceipt,
  studentEmail: string,
  studentId?: string | null,
  referenceCode?: string
) => {
  if (!studentEmail || !studentId || !referenceCode) {
    return;
  }

  try {
    const emailTemplate = await ejs.renderFile(
      path.join(__dirname, "../assets/appr-order-receipt.ejs"),
      data
    );
    const logoPath = path.join(__dirname, "../assets/psits.jpg");
    const logoBuffer = await fs.readFile(logoPath);

    const queueEntry = await emailService.createByEmail(
      "receipt",
      studentEmail,
      "order",
      referenceCode
    );

    const id = await sendEmail({
      to: studentEmail,
      subject: "Your Order Receipt from PSITS - UC Main",
      html: emailTemplate,
      attachments: [
        {
          filename: "psits.jpg",
          content: logoBuffer,
          contentType: "image/jpeg",
          contentId: "logo",
        },
      ],
    });

    if (!id) {
      throw new AppError("Didnt received id", 500);
    }
    await emailService.updateEmailIdById(String(queueEntry._id), id?.id);
    await emailService.updateStatusById(String(queueEntry._id), "sent");
  } catch (err: unknown) {
    console.error(
      "Failed to send order receipt email:",
      err instanceof Error ? err.message : err
    );
  }
};

export const attendeeRegistrationMail = async (data: {
  studentName: string;
  studentEmail: string;
  eventName: string;
  campus: string;
  studentId: string;
  password: string;
}): Promise<void> => {
  await sendPsitsTemplatedEmail({
    to: data.studentEmail,
    subject: "PSITS - Event Registration Confirmation",
    category: "Event Registration",
    title: "Registration Confirmed",
    bodyHtml: `
      <p>Hello ${data.studentName},</p>
      <p style="margin-bottom:20px;">
        Your account has been successfully created and you have been registered as an attendee for the following event:
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5; border-radius:8px; margin-bottom:20px;">
        <tr><td style="padding:16px 18px;">
          <p style="margin:5px 0;"><strong>Event:</strong> ${data.eventName}</p>
          <p style="margin:5px 0;"><strong>Campus:</strong> ${data.campus}</p>
          <p style="margin:5px 0;"><strong>Student ID:</strong> ${data.studentId}</p>
          <p style="margin:5px 0;"><strong>Password:</strong> ${data.password}</p>
        </td></tr>
      </table>
      <p>You can use your Student ID and password to log in to the PSITS portal.</p>
      <p style="color:#999; font-size:13px; margin-top:24px;">
        If you did not expect this email, please contact your campus PSITS admin.
      </p>
    `,
  });
};

export const forgotPasswordMail = async (
  studentMail: string,
  url: string,
  token: string
) => {
  let queueEntry: any;

  try {
    queueEntry = await emailService.createByEmail(
      "auth",
      studentMail,
      "password_reset",
      token.slice(0, 8)
    );

    const id = await sendPsitsTemplatedEmail({
      to: studentMail,
      subject: "Reset Your Password",
      category: "Philippine Technology of Information Technology Students",
      title: "Reset Your Password",
      bodyHtml: `
        <p>Hello,</p>
        <p style="margin-bottom:20px;">
          We received a request to reset your password. Click the button below to reset it:
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td align="center" style="padding:20px 0;">
            <a href="${url}${token}"
              style="display:inline-block; padding:14px 28px; color:#ffffff; background-color:#007bff; text-decoration:none; border-radius:6px; font-size:16px; font-weight:bold;">
              Reset Password
            </a>
          </td></tr>
        </table>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break:break-all;">
          <a href="${url}${token}" style="color:#007bff;">${url}${token}</a>
        </p>
        <p style="color:#999; font-size:13px; margin-top:16px;">
          This link will expire in 10 minutes. If you didn't request a password reset, you can safely ignore this email.
        </p>
      `,
    });

    if (id?.id) {
      await emailService.updateEmailIdById(queueEntry._id.toString(), id.id);
    }
    await emailService.updateStatusById(queueEntry._id.toString(), "sent");

    return { status: true, message: "Email Sent" };
  } catch (err: any) {
    console.error("Failed to send forgot password email:", err.message);
    if (queueEntry) {
      await emailService.updateStatusById(queueEntry._id.toString(), "failed");
    }
    throw err; // let the caller know the reset email actually failed
  }
};

/**
 * Sends an autmated certificate of participation to a single email
 */
export const certificateOfParticipationEmail = async (
  data: TCertificateData,
  studentEmail: string,
  templateRelativePath: string = "templates/certificates/certificate.ejs"
) => {
  try {
    const { CertificateDataSchema } = await import("./mail.schema");
    const { generatePDFFromEJS } =
      await import("./utils/generate-pdf-from-ejs");

    const parsedData = CertificateDataSchema.parse(data);

    const pdfBuffer = await generatePDFFromEJS(
      templateRelativePath,
      parsedData
    );

    const fileName = `${parsedData.student_name}-CERT.pdf`.toUpperCase();
    const logoAttachment = await getLogoAttachment();

    const html = renderPsitsEmail({
      category: "Certificate",
      title: "Congratulations! Your Certificate of Participation",
      bodyHtml: `
        <p>Hi ${parsedData.student_name},</p>
        <p style="margin-bottom:20px;">
          Thank you for attending <strong>${parsedData.event_name}</strong>! Your certificate of participation is attached to this email.
        </p>
        <p style="color:#999; font-size:13px; margin-top:16px;">
          Keep this certificate for your records.
        </p>
      `,
      logoDataUri: "cid:logo",
    });

    await sendEmail({
      to: studentEmail,
      subject: `Congratulations for Attending ${parsedData.event_name}!`,
      html,
      attachments: [
        logoAttachment,
        {
          filename: fileName,
          content: Buffer.from(pdfBuffer),
          contentType: "application/pdf",
        },
      ],
    });

    return {
      status: true,
      message: `Cert of participation for ${parsedData.student_name} Sent`,
    };
  } catch (err: any) {
    console.error(
      "Unexpected errors when attempting to send/process certificate email: ",
      err.message
    );
    throw err;
  }
};

/**
 * Sends an approval email to a recruitment applicant whose application
 * has been approved and volunteer account created.
 */
export const recruitmentApprovedMail = async (data: {
  applicantName: string;
  applicantEmail: string;
  role: string;
  subRole?: string;
}): Promise<void> => {
  let queueEntry: any;

  try {
    queueEntry = await emailService.createByEmail(
      "recruitment",
      data.applicantEmail,
      "approval"
    );

    const id = await sendPsitsTemplatedEmail({
      to: data.applicantEmail,
      subject: "Your PSITS Application Has Been Approved!",
      category: "Philippine Technology of Information Technology Students",
      title: "PSITS Application Approved",
      bodyHtml: `
        <p>Dear ${data.applicantName},</p>
        <p style="margin-bottom:16px;">
          Congratulations! We're happy to let you know that your application to join PSITS has been approved.
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5; border-radius:8px; margin-bottom:20px;">
          <tr><td style="padding:16px 18px;">
            <p style="margin:5px 0;"><strong>Role:</strong> ${data.role}</p>
            ${data.subRole ? `<p style="margin:5px 0;"><strong>Sub-role:</strong> ${data.subRole}</p>` : ""}
          </td></tr>
        </table>
        <p style="margin-bottom:16px;">
          Welcome to the team! Keep an eye on your email and our official communication channels for announcements and onboarding details.
        </p>
        <p>We're excited to have you with us. See you soon!</p>
      `,
    });

    if (id?.id) {
      await emailService.updateEmailIdById(String(queueEntry._id), id.id);
    }
    await emailService.updateStatusById(String(queueEntry._id), "sent");
  } catch (err: unknown) {
    console.error(
      "Failed to send recruitment approval email:",
      err instanceof Error ? err.message : err
    );
    if (queueEntry) {
      await emailService.updateStatusById(String(queueEntry._id), "failed");
    }
    throw err;
  }
};

/**
 * Sends an interview schedule notification email to a recruitment applicant
 * whose interview has been scheduled. Includes the date, time, and mode
 * (Face-to-Face / Online) with mode-specific instructions.
 */
export const recruitmentInterviewScheduledMail = async (data: {
  applicantName: string;
  applicantEmail: string;
  interviewDate: string;
  interviewTime: string;
  mode: string;
  officer: string;
}): Promise<void> => {
  let queueEntry: any;

  try {
    queueEntry = await emailService.createByEmail(
      "recruitment",
      data.applicantEmail,
      "interview_scheduled"
    );

    const id = await sendPsitsTemplatedEmail({
      to: data.applicantEmail,
      subject: "PSITS Interview Schedule Notification",
      category: "Philipine Technology of Information Technology Students",
      title: "Interview Scheduled",
      bodyHtml: `
        <p>Dear ${data.applicantName},</p>
        <p style="margin-bottom:16px;">
          We are pleased to inform you that you have been shortlisted for the next stage of our recruitment process.
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5; border-radius:8px; margin-bottom:20px;">
          <tr><td style="padding:16px 18px;">
            <p style="margin:5px 0; font-weight:bold; font-size:15px;">Interview Schedule</p>
            <p style="margin:5px 0;"><strong>Date:</strong> ${data.interviewDate}</p>
            <p style="margin:5px 0;"><strong>Time:</strong> ${data.interviewTime}</p>
            <p style="margin:5px 0;"><strong>Mode:</strong> ${data.mode}</p>
            <p style="margin:5px 0;"><strong>Officer's In-charge:</strong> ${data.officer}</p>
          </td></tr>
        </table>
        <p style="margin-bottom:12px;"><strong>For FACE-TO-FACE interview:</strong></p>
        <p style="margin-bottom:16px;">
          Please proceed to <strong>PSITS Office</strong> beside <strong>Room 540</strong> at least <strong>5 minutes before</strong> your scheduled interview time. Kindly bring the documents requested during your application.
        </p>
        <p style="margin-bottom:12px;"><strong>For ONLINE interview:</strong></p>
        <p style="margin-bottom:16px;">
          A recruitment officer will contact you before your scheduled interview to provide the meeting link and any additional instructions. Please ensure that you are available at the scheduled time and have a stable internet connection.
        </p>
        <p style="margin-bottom:16px;">
          If you have any questions or are unable to attend your scheduled interview, please inform us as soon as possible.
        </p>
        <p style="margin-bottom:16px;">We look forward to meeting you and wish you the best of luck.</p>
        <p style="margin-bottom:0;">Best regards,<br/><strong>Recruitment Team</strong></p>
      `,
    });

    if (id?.id) {
      await emailService.updateEmailIdById(String(queueEntry._id), id.id);
    }
    await emailService.updateStatusById(String(queueEntry._id), "sent");
  } catch (err: unknown) {
    console.error(
      "Failed to send recruitment interview scheduled email:",
      err instanceof Error ? err.message : err
    );
    if (queueEntry) {
      await emailService.updateStatusById(String(queueEntry._id), "failed");
    }
    throw err;
  }
};

export const recruitmentInterviewRescheduledMail = async (data: {
  applicantName: string;
  applicantEmail: string;
  interviewDate: string;
  interviewTime: string;
  mode: string;
  officer: string;
}): Promise<void> => {
  let queueEntry: any;

  try {
    queueEntry = await emailService.createByEmail(
      "recruitment",
      data.applicantEmail,
      "interview_rescheduled"
    );

    const id = await sendPsitsTemplatedEmail({
      to: data.applicantEmail,
      subject: "PSITS Interview Reschedule Notification",
      category: "Philipine Technology of Information Technology Students",
      title: "Interview Rescheduled",
      bodyHtml: `
        <p>Dear ${data.applicantName},</p>
        <p style="margin-bottom:16px;">
          We would like to inform you that your interview schedule has been <strong>RESCHEDULED</strong>. Please take note of your new schedule below.
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5; border-radius:8px; margin-bottom:20px;">
          <tr><td style="padding:16px 18px;">
            <p style="margin:5px 0; font-weight:bold; font-size:15px;">New Interview Schedule</p>
            <p style="margin:5px 0;"><strong>Date:</strong> ${data.interviewDate}</p>
            <p style="margin:5px 0;"><strong>Time:</strong> ${data.interviewTime}</p>
            <p style="margin:5px 0;"><strong>Mode:</strong> ${data.mode}</p>
            <p style="margin:5px 0;"><strong>Officer's In-charge:</strong> ${data.officer}</p>
          </td></tr>
        </table>
        <p style="margin-bottom:12px;"><strong>For FACE-TO-FACE interview:</strong></p>
        <p style="margin-bottom:16px;">
          Please proceed to <strong>PSITS Office</strong> beside <strong>Room 540</strong> at least <strong>5 minutes before</strong> your scheduled interview time. Kindly bring the documents requested during your application.
        </p>
        <p style="margin-bottom:12px;"><strong>For ONLINE interview:</strong></p>
        <p style="margin-bottom:16px;">
          A recruitment officer will contact you before your scheduled interview to provide the meeting link and any additional instructions. Please ensure that you are available at the scheduled time and have a stable internet connection.
        </p>
        <p style="margin-bottom:16px;">
          If you have any questions or are unable to attend your rescheduled interview, please inform us as soon as possible.
        </p>
        <p style="margin-bottom:16px;">We look forward to meeting you and wish you the best of luck.</p>
        <p style="margin-bottom:0;">Best regards,<br/><strong>Recruitment Team</strong></p>
      `,
    });

    if (id?.id) {
      await emailService.updateEmailIdById(String(queueEntry._id), id.id);
    }
    await emailService.updateStatusById(String(queueEntry._id), "sent");
  } catch (err: unknown) {
    console.error(
      "Failed to send recruitment interview rescheduled email:",
      err instanceof Error ? err.message : err
    );
    if (queueEntry) {
      await emailService.updateStatusById(String(queueEntry._id), "failed");
    }
    throw err;
  }
};

/**
 * Sends an account-creation email to a verified recruitment applicant whose
 * volunteer account has just been created. Includes the auto-generated login
 * credentials (username + temporary password). Sent only on verification approval
 */
export const recruitmentAccountCreatedMail = async (data: {
  applicantName: string;
  applicantEmail: string;
  role: string;
  subRole?: string;
  username: string;
  tempPassword: string;
}): Promise<void> => {
  let queueEntry: any;

  try {
    queueEntry = await emailService.createByEmail(
      "recruitment",
      data.applicantEmail,
      "account_created"
    );

    const id = await sendPsitsTemplatedEmail({
      to: data.applicantEmail,
      subject: `${"Your PSITS " + data.role} Account Has Been Created!`,
      category: "Philippine Technology of Information Technology Students",
      title: `Your PSITS ${data.role} Account Has Been Created!`,
      bodyHtml: `
        <p>Dear ${data.applicantName},</p>
        <p style="margin-bottom:16px;">
          Welcome to the team! Your PSITS ${data.role} account has been successfully created. Below are your login credentials:
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5; border-radius:8px; margin-bottom:20px;">
          <tr><td style="padding:16px 18px;">
            <p style="margin:5px 0;"><strong>Role:</strong> ${data.role}</p>
            ${data.subRole ? `<p style="margin:5px 0;"><strong>Sub-role:</strong> ${data.subRole}</p>` : ""}
            <p style="margin:5px 0;"><strong>Username:</strong> ${data.username}</p>
            <p style="margin:5px 0;"><strong>Temporary Password:</strong> ${data.tempPassword}</p>
          </td></tr>
        </table>
        <p style="margin-bottom:16px;">
          You can use your username and temporary password to log in to the PSITS portal. For security, please change your password after your first login.
        </p>
        <p style="color:#999; font-size:13px; margin-bottom:0;">
          If you did not expect this email, please contact your campus PSITS admin.
        </p>
      `,
    });

    if (id?.id) {
      await emailService.updateEmailIdById(String(queueEntry._id), id.id);
    }
    await emailService.updateStatusById(String(queueEntry._id), "sent");
  } catch (err: unknown) {
    console.error(
      "Failed to send recruitment account created email:",
      err instanceof Error ? err.message : err
    );
    if (queueEntry) {
      await emailService.updateStatusById(String(queueEntry._id), "failed");
    }
    throw err;
  }
};

/**
 * Sends a rejection email to a recruitment applicant whose application
 * has been rejected.
 */
export const recruitmentRejectedMail = async (data: {
  applicantName: string;
  applicantEmail: string;
  reason?: string;
}): Promise<void> => {
  let queueEntry: any;

  try {
    queueEntry = await emailService.createByEmail(
      "recruitment",
      data.applicantEmail,
      "rejection"
    );

    const id = await sendPsitsTemplatedEmail({
      to: data.applicantEmail,
      subject: "Update on Your PSITS Application",
      category: "Philippine Technology of Information Technology Students",
      title: "Application Update",
      bodyHtml: `
        <p>Dear ${data.applicantName},</p>
        <p style="margin-bottom:16px;">Thank you for expressing your interest in joining PSITS.</p>
        <p style="margin-bottom:16px;">
          After carefully reviewing all applications, we regret to inform you that your application was not selected for this recruitment period.
        </p>
        ${
          data.reason
            ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5; border-radius:8px; margin-bottom:20px;">
                <tr><td style="padding:16px 18px;">
                  <p style="margin:5px 0;"><strong>Reason:</strong> ${data.reason}</p>
                </td></tr>
              </table>`
            : ""
        }
        <p style="margin-bottom:0;">
          We truly appreciate your interest in being part of PSITS and encourage you to apply again in future recruitment periods. We wish you the best, and we hope to see you again in the future!
        </p>
      `,
    });

    if (id?.id) {
      await emailService.updateEmailIdById(String(queueEntry._id), id.id);
    }
    await emailService.updateStatusById(String(queueEntry._id), "sent");
  } catch (err: unknown) {
    console.error(
      "Failed to send recruitment rejection email:",
      err instanceof Error ? err.message : err
    );
    if (queueEntry) {
      await emailService.updateStatusById(String(queueEntry._id), "failed");
    }
    throw err;
  }
};
