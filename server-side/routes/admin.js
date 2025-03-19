const express = require("express");
const bcrypt = require("bcryptjs");
const Admin = require("../models/AdminModel");
const MembershipHistory = require("../models/MembershipHistory");
const Merch = require("../models/MerchModel");
const Student = require("../models/StudentModel");
const Order = require("../models/OrdersModel");
const Log = require("../models/LogModel");
const { format, startOfDay, endOfDay } = require("date-fns");
const nodemailer = require("nodemailer");
const ejs = require("ejs");
const path = require("path");
const authenticateToken = require("../middlewares/authenticateToken");

const router = express.Router();

router.post("/approve-membership", authenticateToken, async (req, res) => {
  const { reference_code, id_number, type, admin, rfid, date, cash, total } =
    req.body;

  try {
    const student = await Student.findOne({ id_number });

    if (!student) {
      console.error(`Student with id_number ${id_number} not found.`);
      return res.status(404).json({ message: "Student not found" });
    }

    const history = new MembershipHistory({
      id_number,
      rfid,
      reference_code,
      type,
      name: `${student.first_name} ${student.middle_name} ${student.last_name}`,
      year: student.year,
      course: student.course,
      date,
      admin,
    });

    const savedHistory = await history.save();

    if (!savedHistory) {
      console.error("Failed to save membership history.");
      return res
        .status(500)
        .json({ message: "Failed to save membership history" });
    }

    let updateQuery = {};
    if (type === "Membership") {
      updateQuery = { membership: "Accepted", rfid: rfid };
    } else if (type === "Renewal") {
      updateQuery = {
        renew: "Accepted",
      };
    }

    await Student.updateOne({ id_number }, { $set: updateQuery });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD_APP_EMAIL,
      },
    });

    const emailTemplate = await ejs.renderFile(
      path.join(__dirname, "../templates/appr-membership-receipt.ejs"), // Path to the ejs file
      {
        name: `${student.first_name} ${student.middle_name} ${student.last_name}`,
        reference_code,
        cash,
        total,
        course: student.course,
        year: student.year,
        admin,
        date: format(new Date(date), "MMMM d, yyyy"),
        change: cash - total,
      }
    );

    const mailOptions = {
      from: process.env.EMAIL,
      to: student.email,
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
        return res
          .status(500)
          .json({ message: "Error sending email", error: error.message });
      } else {
        return res
          .status(200)
          .json({ message: "Approve student successful and email sent" });
      }
    });
  } catch (error) {
    console.error("Internal server error:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
});

router.put("/renew-student", authenticateToken, async (req, res) => {
  try {
    const renewStudent = await Student.updateMany(
      {
        status: "True",
        membership: "Accepted",
      },
      {
        $set: {
          renew: "None",
        },
      }
    );

    if (!renewStudent) {
      return res.status(404).json({ message: "Student not found" });
    }

    res
      .status(200)
      .json({ message: "All Student has been renewed successfully" });
  } catch (error) {
    console.error("Error deleting student:", error);
    res.status(500).json("Internal Server Error");
  }
});

router.get("/history", authenticateToken, async (req, res) => {
  try {
    const students = await MembershipHistory.find().sort({ date: -1 });
    res.status(200).json(students);
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json("Internal Server Error");
  }
});
router.get("/renew", authenticateToken, async (req, res) => {
  try {
    const students = await Student.find({ renew: "Pending" });
    res.status(200).json(students);
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json("Internal Server Error");
  }
});

router.get("/membershipRequest", authenticateToken, async (req, res) => {
  try {
    const students = await Student.find({ membership: "Pending" });
    res.status(200).json(students);
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json("Internal Server Error");
  }
});

router.get("/get-students-count", authenticateToken, async (req, res) => {
  try {
    const [all, request, renew, deleted, history] = await Promise.all([
      Student.countDocuments({
        status: "True",
        $or: [
          { renew: "Accepted" },
          { renew: { $exists: false } },
          { renew: "" },
          { renew: "Pending" },
        ],
      }),
      Student.countDocuments({ membership: "Pending" }),
      Student.countDocuments({ renew: "Pending" }),
      Student.countDocuments({ status: "False" }),
      MembershipHistory.countDocuments(),
    ]);

    res.status(200).json({ all, request, renew, deleted, history });
  } catch (error) {
    console.error(error);
  }
});

router.get("/merchandise-created", authenticateToken, async (req, res) => {
  const count = await Merch.countDocuments();
  return res.json({ message: count });
});
router.get("/placed-orders", authenticateToken, async (req, res) => {
  const count = await Order.countDocuments({ order_status: "Pending" });
  return res.json({ message: count });
});
router.get("/dashboard-stats", authenticateToken, async (req, res) => {
  try {
    const [
      bsitCount,
      bscsCount,
      actCount,
      year1Count,
      year2Count,
      year3Count,
      year4Count,
    ] = await Promise.all([
      Student.countDocuments({ course: "BSIT" }),
      Student.countDocuments({ course: "BSCS" }),
      Student.countDocuments({ course: "ACT" }),
      Student.countDocuments({ year: "1" }),
      Student.countDocuments({ year: "2" }),
      Student.countDocuments({ year: "3" }),
      Student.countDocuments({ year: "4" }),
    ]);

    return res.json({
      courses: {
        BSIT: bsitCount,
        BSCS: bscsCount,
        ACT: actCount,
      },
      years: {
        year1: year1Count,
        year2: year2Count,
        year3: year3Count,
        year4: year4Count,
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "An error occurred while fetching statistics." });
  }
});

router.get("/get-order-date", authenticateToken, async (req, res) => {
  try {
    const currentDate = new Date();
    const startOfDayDate = startOfDay(currentDate);
    const endOfDayDate = endOfDay(currentDate);

    const result = await Order.aggregate([
      {
        $match: {
          transaction_date: {
            $gte: startOfDayDate,
            $lte: endOfDayDate,
          },
          order_status: "Paid",
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product_name",
          totalQuantity: { $sum: "$items.quantity" },
          totalSubtotal: { $sum: "$items.sub_total" },
        },
      },
      {
        $project: {
          product_name: "$_id",
          totalQuantity: 1,
          totalSubtotal: 1,
          _id: 0,
        },
      },
    ]);

    res.json(result);
  } catch (error) {
    console.error("Error fetching orders by date:", error);
    res.status(500).json({ error: "An error occurred while fetching orders" });
  }
});

//get all officers
router.get("/get-all-officers", async (req, res) => {
  try {
    const officers = await Admin.find({ status: "Active" });

    const users = officers.map((officer) => ({
      id_number: officer.id_number,
      email: officer.email,
      name: officer.name,
      course: officer.course,
      year: officer.year,
      position: officer.position,
      campus: officer.campus,
    }));

    res.status(200).json({ data: users });
  } catch (error) {
    console.error("Error fetching officers:", error);
    res.status(500).json({ error: "Failed to fetch officers" });
  }
});
//get all developers
router.get("/get-all-developers", async (req, res) => {
	try {
		const developers = await Student.find({
			role: "developer",
			isRequest: false,
		});

		const users = developers.map((developer) => ({
			id_number: developer.id_number,
			email: developer.email,
			name:
				developer.first_name +
				" " +
				developer.middle_name +
				" " +
				developer.last_name,
			course: developer.course,
			year: developer.year,
			role: developer.role,
			status: developer.status,
		}));

		res.status(200).json({ data: users });
	} catch (error) {
		console.error("Error fetching officers:", error);
		res.status(500).json({ error: "Failed to fetch officers" });
	}
});
//get all media
router.get("/get-all-media", async (req, res) => {
	try {
		const media = await Student.find({ role: "media", isRequest: false });

		const users = media.map((med) => ({
			id_number: med.id_number,
			email: med.email,
			name: med.first_name + " " + med.middle_name + " " + med.last_name,
			course: med.course,
			year: med.year,
			role: med.role,
			status: med.status,
		}));

		res.status(200).json({ data: users });
	} catch (error) {
		console.error("Error fetching officers:", error);
		res.status(500).json({ error: "Failed to fetch officers" });
	}
});
//get all volunteers
router.get("/get-all-volunteers", async (req, res) => {
	try {
		const volunteers = await Student.find({
			role: "volunteers",
			isRequest: false,
		});

		const users = volunteers.map((volunteer) => ({
			id_number: volunteer.id_number,
			email: volunteer.email,
			name:
				volunteer.first_name +
				" " +
				volunteer.middle_name +
				" " +
				volunteer.last_name,
			course: volunteer.course,
			year: volunteer.year,
			role: volunteer.role,
			status: volunteer.status,
		}));

		res.status(200).json({ data: users });
	} catch (error) {
		console.error("Error fetching officers:", error);
		res.status(500).json({ error: "Failed to fetch officers" });
	}
});
//get-all-student-officers
router.get("/get-all-student-officers", async (req, res) => {
	try {
		const officer = await Student.find({
			role: "officers",
			isRequest: false,
		});

		const users = officer.map((officers) => ({
			id_number: officers.id_number,
			email: officers.email,
			name:
				officers.first_name +
				" " +
				officers.middle_name +
				" " +
				officers.last_name,
			course: officers.course,
			year: officers.year,
			role: officers.role,
			status: officers.status,
		}));

		res.status(200).json({ data: users });
	} catch (error) {
		console.error("Error fetching officers:", error);
		res.status(500).json({ error: "Failed to fetch officers" });
	}
});
router.get("/get-suspend-officers", authenticateToken, async (req, res) => {
	try {
		const officers = await Admin.find({ status: "Suspend" });

		const users = officers.map((officer) => ({
			id_number: officer.id_number,
			email: officer.email,
			name: officer.name,
			course: officer.course,
			year: officer.year,
			position: officer.position,
		}));

		res.status(200).json({ data: users });
	} catch (error) {
		console.error("Error fetching officers:", error);
		res.status(500).json({ error: "Failed to fetch officers" });
	}
});

router.post("/editOfficer", authenticateToken, async (req, res) => {
	const { id_number, name, position, email, course, year, campus } = req.body;

	try {
		const getAdmin = await Admin.findOne({
			id_number: req.body.id_number,
		});

		const adminResult = await Admin.updateOne(
			{ id_number: id_number },
			{
				$set: {
					name: name,
					position: position,
					campus: campus,
					email: email,
					course: course,
					year: year,
				},
			}
		);

		if (adminResult.modifiedCount > 0) {
			// Log the edit admin action
			const log = new Log({
				admin: req.user.name,
				admin_id: req.user._id,
				action: "Edited Admin",
				target: `${id_number} - ${name}`,
				target_id: getAdmin._id,
				target_model: "Admin",
			});

			await log.save();

			res.status(200).json({ message: "Officer updated successfully" });
		} else {
			res.status(404).json({ error: "No officer found with the provided ID" });
		}
	} catch (error) {
		console.error("Error updating officer:", error);
		res.status(500).json({ error: "Failed to update officer" });
	}
});

router.post(
	"/admin/change-password-officer",
	authenticateToken,
	async (req, res) => {
		try {
			const getAdmin = await Admin.findOne({
				id_number: req.body.id_number,
			});

			if (!getAdmin) {
				return res.status(404).json({ message: "Admin not found" });
			}

			const hashedPassword = await bcrypt.hash(req.body.password, 10);
			getAdmin.password = hashedPassword;
			await getAdmin.save();

			// Log the password change action
			const log = new Log({
				admin: req.user.name,
				admin_id: req.user._id,
				action: "Changed Admin Password",
				target: `${getAdmin.id_number} - ${getAdmin.name}`,
				target_id: getAdmin._id,
				target_model: "Admin",
			});

			await log.save();

			res.status(200).json({ message: "Password changed successfully" });
		} catch (error) {
			res
				.status(500)
				.json({ message: "An error occurred", error: error.message });
		}
	}
);
router.put("/admin/suspend", authenticateToken, async (req, res) => {
	const { id_number } = req.body;

	try {
		const updatedAdmin = await Admin.updateOne(
			{ id_number },
			{
				$set: {
					status: "Suspend",
				},
			}
		);

		if (updatedAdmin.modifiedCount > 0) {
			res.status(200).json({ message: "Admin status updated to Suspend" });
		} else {
			res.status(404).json({ message: "Admin not found or already suspended" });
		}
	} catch (error) {
		console.error("Error suspending admin:", error);
		res
			.status(500)
			.json({ message: "An error occurred", error: error.message });
	}
});

//TODO: REMOVE ROLE FROM ADMIN
router.put("/admin/role-remove", authenticateToken, async (req, res) => {
	const { id_number } = req.body;

	try {
		const updatedStudent = await Student.updateOne(
			{ id_number },
			{
				$set: {
					role: "all",
				},
			}
		);

		const updatedStudentOrder = await Order.updateMany(
			{
				id_number,
			},
			{
				$set: {
					role: "all",
				},
			}
		);

		if (updatedStudent.modifiedCount > 0) {
			res.status(200).json({ message: "Role removed successfully" });
		} else {
			res.status(404).json({ message: "Student not found" });
		}
	} catch (error) {
		console.error("Error removing role from admin:", error);
		res
			.status(500)
			.json({ message: "An error occurred", error: error.message });
	}
});

router.put("/admin/restore-officer", authenticateToken, async (req, res) => {
	const { id_number } = req.body;

	try {
		const getAdmin = await Admin.findOne({
			id_number: req.body.id_number,
		});

		const updatedAdmin = await Admin.updateOne(
			{ id_number },
			{
				$set: {
					status: "Active",
				},
			}
		);

		if (updatedAdmin.modifiedCount > 0) {
			// Log the restore officer action
			const log = new Log({
				admin: req.user.name,
				admin_id: req.user._id,
				action: "Restored Suspended Admin",
				target: `${id_number} - ${getAdmin.name}`,
				target_id: getAdmin._id,
				target_model: "Admin",
			});

			await log.save();

			res.status(200).json({ message: "Admin status updated to Active" });
		} else {
			res.status(404).json({ message: "Admin not found or already active" });
		}
	} catch (error) {
		console.error("Error activating admin:", error);
		res
			.status(500)
			.json({ message: "An error occurred", error: error.message });
	}
});
router.get(
	"/admin/search-student/:id_number",
	authenticateToken,
	async (req, res) => {
		const { id_number } = req.params;

		try {
			const student = await Student.findOne({
				id_number,
				role: "all",
			});
			if (!student) {
				res.status(404).json({
					message: "Student not found or Student is already added a role",
				});
			} else {
				res.status(200).json({ data: student });
			}
		} catch (error) {
			console.error(error);
			res
				.status(500)
				.json({ message: "An error occurred", error: error.message });
		}
	}
);
router.put("/admin/request-role", authenticateToken, async (req, res) => {
	const { id_number, role, admin } = req.body;

	try {
		const student = await Student.findOne({ id_number: id_number });
		const updatedRole = await Student.updateOne(
			{ id_number },
			{
				$set: {
					role: role,
					isRequest: true,
					adminRequest: admin,
				},
			}
		);
		const updatedStudentOrder = await Order.updateMany(
			{ id_number },
			{
				$set: {
					role: role,
				},
			}
		);
		await new Log({
			admin: admin,
			action:
				"Request Role for " + student.first_name + " " + student.last_name,
			target: role + " request",
			target_model: "Student",
		}).save();

		if (updatedRole.modifiedCount > 0) {
			res.status(200).json({ message: "Role updated successfully" });
		} else {
			res.status(404).json({ message: "Student not found" });
		}
	} catch (error) {
		console.error("Error updating student role:", error);
		res
			.status(500)
			.json({ message: "An error occurred", error: error.message });
	}
});

router.get("/admin/get-request-role", authenticateToken, async (req, res) => {
  try {
    const students = await Student.find({ isRequest: true });
    const users = students.map((student) => ({
      id_number: student.id_number,
      email: student.email,
      name:
        student.first_name +
        " " +
        student.middle_name +
        " " +
        student.last_name,
      course: student.course,
      year: student.year,
      role: student.role,
      isRequest: student.isRequest,
      adminRequest: student.adminRequest,
    }));
    res.status(200).json({ data: users });
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json("Internal Server Error");
  }
});

router.get("/admin/get-request-admin", authenticateToken, async (req, res) => {
  try {
    const admin = await Admin.find({ status: "Request" });
    const users = admin.map((admins) => ({
      id_number: admins.id_number,
      email: admins.email,
      name: admins.name,
      course: admins.course,
      year: admins.year,
      role: admins.position,
      status: admins.status,
    }));
    res.status(200).json({ data: users });
  } catch (error) {
    console.error("Error fetching admins:", error);
    res.status(500).json("Internal Server Error");
  }
});
router.put("/admin/approve-role", authenticateToken, async (req, res) => {
  const { id_number } = req.body;

  try {
    const updatedRole = await Student.updateOne(
      { id_number },
      {
        $set: {
          isRequest: false,
        },
      }
    );

    if (updatedRole.modifiedCount > 0) {
      res.status(200).json({ message: "Role approved successfully" });
    } else {
      res.status(404).json({ message: "Student not found" });
    }
  } catch (error) {
    console.error("Error updating student role:", error);
    res
      .status(500)
      .json({ message: "An error occurred", error: error.message });
  }
});

router.put("/admin/decline-role", authenticateToken, async (req, res) => {
  const { id_number } = req.body;

  try {
    const updatedRole = await Student.updateOne(
      { id_number },
      {
        $set: {
          role: "all",
          isRequest: false,
        },
      }
    );

    if (updatedRole.modifiedCount > 0) {
      res.status(200).json({ message: "Role approved successfully" });
    } else {
      res.status(404).json({ message: "Student not found" });
    }
  } catch (error) {
    console.error("Error updating student role:", error);
    res
      .status(500)
      .json({ message: "An error occurred", error: error.message });
  }
});

router.post("/admin/add-officer", authenticateToken, async (req, res) => {
  const {
    id_number,
    name,
    password,
    email,
    position,
    course,
    year,
    campus,
    status,
  } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = new Admin({
      id_number,
      name,
      password: hashedPassword,
      email,
      position,
      course,
      year,
      campus,
      status,
    });
    await newAdmin.save();

    res.status(200).json({ message: "Account Creation successful" });
  } catch (error) {
    console.error(error);
  }
});

//admin/approve-admin-account

router.put(
  "/admin/approve-admin-account",
  authenticateToken,
  async (req, res) => {
    const { id_number } = req.body;

    try {
      const updatedRole = await Admin.updateOne(
        { id_number },
        {
          $set: {
            status: "Active",
          },
        }
      );

      if (updatedRole.modifiedCount > 0) {
        res
          .status(200)
          .json({ message: "Admin Account approved successfully" });
      } else {
        res.status(404).json({ message: "Admin not found" });
      }
    } catch (error) {
      console.error("Error updating admin account:", error);
      res
        .status(500)
        .json({ message: "An error occurred", error: error.message });
    }
  }
);
router.put(
  "/admin/decline-admin-account",
  authenticateToken,
  async (req, res) => {
    const { id_number } = req.body;

    try {
      const deletedAdmin = await Admin.deleteOne({ id_number });

      if (deletedAdmin.deletedCount > 0) {
        res.status(200).json({ message: "Admin account deleted successfully" });
      } else {
        res.status(404).json({ message: "Admin not found" });
      }
    } catch (error) {
      console.error("Error deleting admin account:", error);
      res
        .status(500)
        .json({ message: "An error occurred", error: error.message });
    }
  }
);

module.exports = router;
