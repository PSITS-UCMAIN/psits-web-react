import ejs from "ejs";
import path from "path";
import nodemailer from "nodemailer";
import {
  IMembershipRequest,
  IOrderReceipt,
  TCertificateData,
} from "./mail.interface";
// dynamic imports for schema and PDF generator are used below to avoid
// circular import issues at runtime

import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD_APP_EMAIL,
  },
});

export const membershipRequestReceipt = async (
  data: IMembershipRequest,
  studenteEmail: string
) => {
  const emailTemplate = await ejs.renderFile(
    path.join(__dirname, "../assets/appr-membership-receipt.ejs"),
    data
  );

  const mailOptions = {
    from: process.env.EMAIL,
    to: studenteEmail,
    subject: "Your Receipt from PSITS - UC Main",
    html: emailTemplate,
    attachments: [
      {
        filename: "psits.jpg",
        path: path.join(__dirname, "../assets/psits.jpg"),
        cid: "logo",
      },
    ],
  };

  // Send the email
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
};

export const orderReceipt = async (
  data: IOrderReceipt,
  studentEmail: string
) => {
  const emailTemplate = await ejs.renderFile(
    path.join(__dirname, "../assets/appr-order-receipt.ejs"),
    data
  );
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASSWORD_APP_EMAIL,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL,
    to: studentEmail,
    subject: "Your Order Receipt from PSITS - UC Main",
    html: emailTemplate,
    attachments: [
      {
        filename: "psits.jpg",
        path: path.join(__dirname, "../assets/psits.jpg"),
        cid: "logo",
      },
    ],
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
};

export const attendeeRegistrationMail = async (data: {
  studentName: string;
  studentEmail: string;
  eventName: string;
  campus: string;
  studentId: string;
  password: string;
}): Promise<void> => {
  const mailOptions = {
    from: process.env.EMAIL,
    to: data.studentEmail,
    subject: `PSITS - Event Registration Confirmation`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h1 style="color: #333; text-align: center; margin-bottom: 30px;">PSITS - Registration Confirmation</h1>
        <p style="color: #555; font-size: 16px;">Hello ${data.studentName},</p>
        <p style="color: #555; font-size: 16px; margin-bottom: 20px;">
          Your account has been successfully created and you have been registered as an attendee for the following event:
        </p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <p style="margin: 5px 0;"><strong>Event:</strong> ${data.eventName}</p>
          <p style="margin: 5px 0;"><strong>Campus:</strong> ${data.campus}</p>
          <p style="margin: 5px 0;"><strong>Student ID:</strong> ${data.studentId}</p>
          <p style="margin: 5px 0;"><strong>Password:</strong> ${data.password}</p>
        </div>
        <p style="color: #555; font-size: 16px;">
          You can use your Student ID and password to log in to the PSITS portal.
        </p>
        <p style="color: #999; font-size: 14px; margin-top: 30px;">
          If you did not expect this email, please contact your campus PSITS admin.
        </p>
        <p style="color: #555; font-size: 16px;">Thank you,</p>
        <p style="color: #555; font-size: 16px;">The PSITS Team</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

export const forgotPasswordMail = async (
  studentMail: string,
  url: string,
  token: string
) => {
  const mailOptions = {
    from: process.env.EMAIL,
    to: studentMail,
    subject: "Reset Your Password",
    html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
              <h1 style="color: #333; text-align: center; margin-bottom: 30px;">PSITS - Reset Your Password</h1>
              <p style="color: #555; font-size: 16px;">Hello,</p>
              <p style="color: #555; font-size: 16px; margin-bottom: 20px">
                We received a request to reset your password. Click the button below to reset it:
              </p>
              <div style="text-align: center; margin: 40px 0;">
                <a
                  href="${url}${token}"
                  style="display: inline-block; padding: 20px 25px; color: #fff; background-color: #007bff; text-decoration: none; border-radius: 5px; font-size: 24px;">
                  Reset Password
                </a>
              </div>
              <p style="color: #555; font-size: 16px;">Or you can copy and paste this link into your browser:</p>
              <p style="word-break: break-all;">
                <a href="${url}${token}" style="color: #007bff;">
                 ${url}${token}
                </a>
              </p>
              <p style="color: #999; font-size: 14px;">
                This link will expire in 10 minutes. If you didn’t request a password reset, you can safely ignore this email.
              </p>
              <p style="color: #555; font-size: 16px;">Thank you,</p>
              <p style="color: #555; font-size: 16px;">The Support Team</p>
            </div>
          `,
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.error("Error sending email:", err.message);
      return { status: false, message: "Error sending email" };
    }
    console.log("Success sent email for ", studentMail);
    return { status: true, message: "Email Sent" };
  });
};

/**
 * Sends an autmated certificate of participation to a single email
 */
export const certificateOfParticipationEmail = async (
  data: TCertificateData,
  studentEmail: string
) => {
  try {
    const { CertificateDataSchema } = await import("./mail.schema");
    const { generatePDFFromEJS } =
      await import("./utils/generate-pdf-from-ejs");

    const parsedData = CertificateDataSchema.parse(data);

    const pdfBuffer = await generatePDFFromEJS(
      "ejs/pdf-ejs/certificate.ejs",
      parsedData
    );

    const emailTemplate = await ejs.renderFile(
      path.join(__dirname, "../assets/ejs/cert-participation-mail-body.ejs"),
      parsedData,
      { cache: true }
    );

    const fileName = `${parsedData.student_name}-CERT.pdf`.toUpperCase();

    const mailOptions = {
      from: process.env.EMAIL,
      to: studentEmail,
      subject: `Congratulations for Attending ${parsedData.event_name}!`,
      html: emailTemplate,
      attachments: [
        {
          filename: fileName,
          content: Buffer.from(pdfBuffer),
          contentType: "application/pdf",
        },
      ],
    };

    return new Promise((resolve, reject) => {
      transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          console.error("Error sending email:", err.message);
          resolve({ status: false, message: "Error sending email" });
        } else {
          resolve({
            status: true,
            message: `Cert of participation for ${parsedData.student_name} Sent`,
          });
        }
      });
    });
  } catch (err: any) {
    console.error(
      "Unexpected errors when attempting to send/process certificate email: ",
      err.message
    );
    throw err;
  }
};
