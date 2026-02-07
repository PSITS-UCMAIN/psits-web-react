import ejs from "ejs";
import path from "path";
import nodemailer from "nodemailer";
import { IMembershipRequest, IOrderReceipt, IForgotPasswordData } from "./mail.interface";
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
  data: IForgotPasswordData,
  studentMail: string,
) => {
  const emailTemplate = await ejs.renderFile(
    path.join(__dirname, "../assets/reset-password-form.ejs"),
    data
  )

  const mailOptions = {
    from: process.env.EMAIL,
    to: studentMail,
    subject: "Reset Your Password",
    html: emailTemplate,
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
