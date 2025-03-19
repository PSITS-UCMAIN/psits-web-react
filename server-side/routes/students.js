const express = require("express");
const bcrypt = require("bcryptjs");
const Student = require("../models/StudentModel");
const Admin = require("../models/AdminModel");
const Orders = require("../models/OrdersModel");
const Log = require("../models/LogModel");
const { format } = require("date-fns");
const authenticateToken = require("../middlewares/authenticateToken");

const router = express.Router();

// GET list of accepted students
router.get("/students", authenticateToken, async (req, res) => {
  try {
    const students = await Student.find({
      status: "True",
      $or: [
        { renew: "Accepted" },
        { renew: "Pending" },
        { renew: "None" },
        { renew: { $exists: false } },
        { renew: "" },
      ],
    });
    res.status(200).json(students);
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json("Internal Server Error");
  }
});

router.put("/students/request", authenticateToken, async (req, res) => {
  try {
    const { id_number } = req.body;

    const studentFind = await Student.findOne({ id_number: id_number });

    if (studentFind.renew === "None") {
      await Student.updateOne(
        { id_number: id_number },
        {
          $set: {
            renew: "Pending",
            renewedOn: format(new Date(), "MMMM d, yyyy h:mm:ss a"),
          },
        }
      );
    } else {
      await Student.updateOne(
        { id_number: id_number },
        {
          $set: {
            membership: "Pending",
          },
        }
      );
    }

    res.status(200).json({ message: "Request submitted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error submitting request", error: error.message });
  }
});

router.get(
  "/students/deleted-students",
  authenticateToken,
  async (req, res) => {
    try {
      const students = await Student.find({
        status: "False",
      });
      res.status(200).json(students);
    } catch (error) {
      console.error("Error fetching students:", error);
      res.status(500).json("Internal Server Error");
    }
  }
);

router.get(
  "/students/get-membership-status",
  authenticateToken,
  async (req, res) => {
    const { id_number } = req.query;
    try {
      const student = await Student.findOne({ id_number });
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      const studentStatus = {
        membership: student.membership,
        renew: student.renew,
      };

      res.status(200).json(studentStatus);
    } catch (error) {
      console.error("Error fetching student:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
);

// SOFT DELETE student by id_number
router.put("/students/softdelete", authenticateToken, async (req, res) => {
  const { id_number, name } = req.body;

  try {
    // Find and delete the student by id_number
    const deletedStudent = await Student.updateOne(
      { id_number: id_number },
      {
        $set: {
          status: "False",
          deletedBy: name,
          deletedDate: format(new Date(), "MMMM d, yyyy h:mm:ss a"),
        },
      }
    );

    if (!deletedStudent) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.status(200).json({ message: "Student deleted successfully" });
  } catch (error) {
    console.error("Error deleting student:", error);
    res.status(500).json("Internal Server Error");
  }
});

router.put("/students/restore", authenticateToken, async (req, res) => {
  const { id_number } = req.body;

  try {
    const restore = await Student.updateOne(
      { id_number: id_number },
      {
        $set: {
          status: "True",
        },
      }
    );

    if (!restore) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.status(200).json({ message: "Student deleted successfully" });
  } catch (error) {
    console.error("Error deleting student:", error);
    res.status(500).json("Internal Server Error");
  }
});

// HARD DELETE student by id_number
router.put(
  "/students/cancel/:id_number",
  authenticateToken,
  async (req, res) => {
    const id_number = req.params.id_number;

    try {
      const cancel = await Student.updateOne(
        { id_number: id_number },
        {
          $set: {
            membership: "None",
          },
        }
      );

      if (!cancel) {
        return res.status(404).json({ message: "Student not found" });
      }

      res
        .status(200)
        .json({ message: "Student cancel membership successfully" });
    } catch (error) {
      console.error("Error deleting student:", error);
      res.status(500).json("Internal Server Error");
    }
  }
);

router.post("/editedStudent", authenticateToken, async (req, res) => {
  const {
    id_number,
    rfid,
    first_name,
    middle_name,
    last_name,
    email,
    course,
    year,
  } = req.body;

  try {
    // Fetch the student document by id_number to get the _id
    const student = await Student.findOne({ id_number: id_number });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Update the student's information
    const studentResult = await Student.updateOne(
      { id_number: id_number },
      {
        $set: {
          rfid: rfid,
          first_name: first_name,
          middle_name: middle_name,
          last_name: last_name,
          email: email,
          course: course,
          year: year,
        },
      }
    );

    // Update related orders with the new student details
    await Orders.updateMany(
      { id_number: id_number },
      {
        $set: {
          student_name: `${first_name} ${middle_name} ${last_name}`,
          course: course,
          year: year,
          rfid: rfid,
        },
      }
    );

    // Log the editing action
    const log = new Log({
      admin: req.user.name,
      admin_id: req.user._id,
      action: "Edited Student",
      target: `${id_number} - ${first_name} ${middle_name} ${last_name}`,
      target_id: student._id,
      target_model: "Student",
    });

    await log.save();
    //console.log("Action logged successfully.");

    res
      .status(200)
      .json({ message: "Student and related orders updated successfully" });
  } catch (error) {
    console.error("Error updating student and orders:", error);
    res.status(500).json("Internal Server Error");
  }
});

//Edit Profile Side

router.post("/edit", authenticateToken, async (req, res) => {
  const { id_number, name, email, course, year, role } = req.body;
  try {
    if (role === "Admin") {
      const result = await Admin.updateOne(
        { id_number: id_number },
        {
          $set: {
            name: name,
            course: course,
            year: year,
          },
        }
      );
    } else {
      const result = await Student.updateOne(
        { id_number: id_number },
        {
          $set: {
            email: email,
            course: course,
            year: year,
          },
        }
      );
    }
    const user =
      role === "Student"
        ? await Student.findOne({ id_number })
        : await Admin.findOne({ id_number });
    const retrieveData =
      role === "Student"
        ? {
            data: user.email,
            course: user.course,
            year: user.year,
          }
        : {
            data: user.name,
            course: user.course,
            year: user.year,
          };

    res
      .status(200)
      .json({ student: retrieveData, message: role + " updated successfully" });
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json("Internal Server Error");
  }
});

router.post(
  "/students/change-password-admin",
  authenticateToken,
  async (req, res) => {
    try {
      const getStudent = await Student.findOne({
        id_number: req.body.id_number,
      });

      if (!getStudent) {
        return res.status(404).json({ message: "Student not found" });
      }

      const hashedPassword = await bcrypt.hash(req.body.password, 10);
      getStudent.password = hashedPassword;
      await getStudent.save();

      // Log the password change action
      const log = new Log({
        admin: req.user.name,
        admin_id: req.user._id,
        action: "Changed Student Password",
        target: `${getStudent.id_number} - ${getStudent.first_name} ${getStudent.middle_name} ${getStudent.last_name}`,
        target_id: getStudent._id,
        target_model: "Student",
      });

      await log.save();
      //console.log("Action logged successfully.");

      res.status(200).json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Error changing student password:", error);
      res
        .status(500)
        .json({ message: "An error occurred", error: error.message });
    }
  }
);

router.get(
	"/fetch-specific-student/:id_number",
	authenticateToken,
	async (req, res) => {
		const { id_number } = req.params;

		try {
			const student = await Student.findOne({ id_number });
			if (!student) {
				res.status(404).json({ message: "Student not found" });
			} else {
				const user = {
					isRequest: student.isRequest,
					role: student.role,
				};
				res.status(200).json({ data: user });
			}
		} catch (error) {
			console.error(error);
		}
	}
);

module.exports = router;
