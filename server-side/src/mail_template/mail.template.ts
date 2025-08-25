import ejs from "ejs";
import path from "path";
import nodemailer from "nodemailer";
import { IMembershipRequest, IOrderReceipt } from "./mail.interface";
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
    path.join(__dirname, "../templates/appr-membership-receipt.ejs"),
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
        path: path.join(__dirname, "../src/psits.jpg"),
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
    path.join(__dirname, "../templates/appr-order-receipt.ejs"),
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
        path: path.join(__dirname, "../src/psits.jpg"),
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

    return { status: true, message: "Email Sent" };
  });
};
