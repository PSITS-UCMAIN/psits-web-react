const express = require("express");
const bcrypt = require("bcryptjs");
const Student = require("../models/StudentModel");
const Admin = require("../models/AdminModel");
const Log = require("../models/LogModel");
const rateLimit = require("express-rate-limit");
require("dotenv").config();
const jwt = require("jsonwebtoken");

const router = express.Router();
const token_key = process.env.JWT_SECRET;

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message:
    "Too many login attempts from this IP, please try again after 15 minutes.",
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/login", loginLimiter, async (req, res) => {
  const { id_number, password } = req.body;

  try {
    let users;
    let role;
    let admin = null;
    let student = null;
    let campus;

    if (id_number.includes("-admin")) {
      admin = await Admin.findOne({ id_number });
    }

    if (!admin) {
      student = await Student.findOne({ id_number });
      if (!student) {
        return res.status(400).json({ message: "Invalid Credentials" });
      }

      const passwordMatch = await bcrypt.compare(password, student.password);

      if (passwordMatch && student.status === "False") {
        return res
          .status(400)
          .json({ message: "Your account has been deleted!" });
      } else if (passwordMatch && student.status === "True") {
        users = student;
        role = "Student";
      } else {
        return res
          .status(400)
          .json({ message: "Invalid ID number or password" });
      }
    } else {
      const passwordMatch = await bcrypt.compare(password, admin.password);

      if (passwordMatch && admin.status === "Active") {
        users = admin;
        role = "Admin";
      } else if (passwordMatch && admin.status === "Suspend") {
        return res.status(400).json({
          message: "Your account has been suspended! Please contact president",
        });
      } else {
        return res
          .status(400)
          .json({ message: "Invalid ID number or password" });
      }
    }

    const user = {
      id_number: users.id_number,
    };
    campus = users.campus;
    const token = jwt.sign({ user }, token_key, {
      expiresIn: role === "Admin" ? "4h" : "10m",
    });

    if (role === "Admin") {
      const log = new Log({
        admin: users.name,
        admin_id: users._id,
        action: "Admin Login",
      });

      await log.save();
    }

    return res.status(200).json({
      message: "Signed in successfully",
      role,
      token,
      campus,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "An error occurred", error });
  }
});

module.exports = router;
