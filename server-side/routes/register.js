const express = require("express");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const bycrypt = require("bcrypt");

const Student = require("../models/StudentModel");
const Admin = require("../models/AdminModel");

const router = express.Router();
require("dotenv").config();

const indicator = process.env.DB_NAME !== "psits-test" ? true : false;
const url = indicator
  ? "https://psits-web.vercel.app/reset-password/"
  : "https://psits-web-react-staging.vercel.app/reset-password/";

router.post("/register", async (req, res) => {
  const {
    id_number,
    password,
    rfid,
    first_name,
    middle_name,
    last_name,
    email,
    course,
    year,
    applied,
  } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const newStudent = new Student({
      id_number,
      rfid: "N/A",
      password: hashedPassword,
      first_name,
      middle_name: middle_name === undefined ? "" : middle_name,
      last_name,
      email,
      course,
      year,
      status: "True",
      membership: "None",
      applied,
      role: "all",
      campus: "UC-Main",
      isRequest: false,
    });
    await newStudent.save();

    res.status(200).json({ message: "Registration successful" });
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ message: "Id number already exists" });
    } else {
      console.error({ message: "Error saving new student:", error });
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
});

// Student forgot password
router.post("/student/forgot-password", async (req, res) => {
  try {
    let user;
    let position;

    // Find the user by email
    const userAdmin = await Admin.findOne({
      email: req.body.email,
      id_number: req.body.id_number,
    });
    const getUser = await Student.findOne({
      email: req.body.email,
      id_number: req.body.id_number,
    });
    if (userAdmin) {
      user = userAdmin;
    } else if (getUser) {
      user = getUser;
    } else if (!getUser) {
      console.error(`User with email ${req.body.email} not found`);
      return res.status(404).send({
        message: `The id number you entered is found but appears to be the email is incorrect.`,
      });
    } else if (!userAdmin) {
      console.error(
        `The id number you entered is found but appears to be the email is incorrect.`
      );
      return res.status(404).send({
        message: `The id number you entered is found but appears to be the email is incorrect.`,
      });
    } else {
      console.error(`User with email ${req.body.email} not found`);
      return res.status(404).send({
        message: `The id number you entered is found but appears to be the email is incorrect.`,
      });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "10m",
    });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD_APP_EMAIL,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL,
      to: req.body.email,
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
        return res.status(500).send({ message: err.message });
      }
      //console.log("Email sent from forgot password:", info.response);
      res.status(200).send({ message: "Email sent" });
    });
  } catch (err) {
    console.error("Server error during forgot password process:", err.message);
    res.status(500).send({ message: err.message });
  }
});

// Student reset password
router.post("/student/reset-password/:token", async (req, res) => {
  try {
    const decodedToken = jwt.verify(req.params.token, process.env.JWT_SECRET);

    if (!decodedToken) {
      return res.status(401).send({ message: "Invalid token" });
    }
    let user;

    const getStudent = await Student.findOne({ _id: decodedToken.userId });
    const getAdmin = await Admin.findOne({ _id: decodedToken.userId });
    if (getStudent) {
      // Hash the new password
      const salt = await bycrypt.genSalt(10);
      req.body.newPassword = await bycrypt.hash(req.body.newPassword, salt);

      // Update user's password, clear reset token and expiration time
      getStudent.password = req.body.newPassword;
      await getStudent.save();
    } else if (getAdmin) {
      const salt = await bycrypt.genSalt(10);
      req.body.newPassword = await bycrypt.hash(req.body.newPassword, salt);

      // Update user's password, clear reset token and expiration time
      getAdmin.password = req.body.newPassword;
      await getAdmin.save();
    } else {
      return res.status(401).send({ message: "no user found" });
    }

    // Send success response
    res.status(200).send({ message: "Password updated" });
  } catch (err) {
    // Send error response if any error occurs
    res.status(500).send({ message: err.message });
  }
});

module.exports = router;
