"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchSpecificMembershipHistoryController = exports.fetchSpecificStudentController = exports.changeStudentPassword = exports.editStudentController = exports.cancelMembershipRequestController = exports.restoreDeletedStudentController = exports.softDeleteStudentController = exports.getMembershipStatusController = exports.getAllDeleteStudentController = exports.setStudentMembershipRequest = exports.getAllActiveStudentsController = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const student_model_1 = require("../models/student.model");
const orders_model_1 = require("../models/orders.model");
const log_model_1 = require("../models/log.model");
const history_model_1 = require("../models/history.model");
const date_fns_1 = require("date-fns");
const mongoose_1 = __importDefault(require("mongoose"));
const getAllActiveStudentsController = async (req, res) => {
    try {
        const students = await student_model_1.Student.find({
            status: "True",
        });
        if (!students) {
            res.status(400).json({ message: "No Students" });
        }
        res.status(200).json(students);
    }
    catch (error) {
        console.error("Error fetching students:", error);
        res.status(500).json("Internal Server Error");
    }
};
exports.getAllActiveStudentsController = getAllActiveStudentsController;
const setStudentMembershipRequest = async (req, res) => {
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const { id_number } = req.body;
        const studentFind = await student_model_1.Student.findOne({
            id_number: id_number,
        }).session(session);
        if (!studentFind) {
            return res.status(400).json({ message: "No student found" });
        }
        if (studentFind.membershipStatus !== "NOT_APPLIED") {
            return res
                .status(400)
                .json({ message: "You already have a pending request." });
        }
        await student_model_1.Student.updateOne({ id_number: id_number }, [
            {
                $set: {
                    membershipStatus: "PENDING",
                },
            },
        ]).session(session);
        await session.commitTransaction();
        session.endSession();
        res.status(200).json({ message: "Request submitted successfully" });
    }
    catch (error) {
        session.abortTransaction();
        session.endSession();
        res.status(500).json({ message: "Error submitting request", error: error });
    }
};
exports.setStudentMembershipRequest = setStudentMembershipRequest;
const getAllDeleteStudentController = async (req, res) => {
    try {
        const students = await student_model_1.Student.find({
            status: "False",
        });
        if (!students) {
            res.status(400).json({ message: "No Deleted Students" });
        }
        res.status(200).json(students);
    }
    catch (error) {
        console.error("Error fetching students:", error);
        res.status(500).json("Internal Server Error");
    }
};
exports.getAllDeleteStudentController = getAllDeleteStudentController;
const getMembershipStatusController = async (req, res) => {
    const { id } = req.params;
    try {
        const student = await student_model_1.Student.findOne({ id_number: id });
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }
        res.status(200).json({
            status: student.membershipStatus,
            isFirstApplication: student.isFirstApplication,
        });
    }
    catch (error) {
        console.error("Error fetching student:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.getMembershipStatusController = getMembershipStatusController;
const softDeleteStudentController = async (req, res) => {
    const { id_number, name } = req.body;
    try {
        // Find and delete the student by id_number
        const deletedStudent = await student_model_1.Student.updateOne({ id_number: id_number }, {
            $set: {
                status: "False",
                deletedBy: name,
                deletedDate: (0, date_fns_1.format)(new Date(), "MMMM d, yyyy h:mm:ss a"),
            },
        });
        if (!deletedStudent) {
            return res.status(404).json({ message: "Student not found" });
        }
        res.status(200).json({ message: "Student deleted successfully" });
    }
    catch (error) {
        console.error("Error deleting student:", error);
        res.status(500).json("Internal Server Error");
    }
};
exports.softDeleteStudentController = softDeleteStudentController;
const restoreDeletedStudentController = async (req, res) => {
    const { id_number } = req.body;
    try {
        const restore = await student_model_1.Student.updateOne({ id_number: id_number }, {
            $set: {
                status: "True",
            },
        });
        if (!restore) {
            return res.status(404).json({ message: "Student not found" });
        }
        res.status(200).json({ message: "Student retore successfully" });
    }
    catch (error) {
        console.error("Error deleting student:", error);
        res.status(500).json("Internal Server Error");
    }
};
exports.restoreDeletedStudentController = restoreDeletedStudentController;
const cancelMembershipRequestController = async (req, res) => {
    const { id_number } = req.body;
    try {
        const cancel = await student_model_1.Student.updateOne({ id_number: id_number }, {
            $set: {
                membershipStatus: "NOT_APPLIED",
            },
        });
        if (!cancel) {
            return res.status(404).json({ message: "Student not found" });
        }
        res.status(200).json({ message: "Student cancel membership successfully" });
    }
    catch (error) {
        console.error("Error deleting student:", error);
        res.status(500).json("Internal Server Error");
    }
};
exports.cancelMembershipRequestController = cancelMembershipRequestController;
const editStudentController = async (req, res) => {
    const { id_number, rfid, first_name, middle_name, last_name, email, course, year, } = req.body;
    try {
        // Fetch the student document by id_number to get the _id
        const student = await student_model_1.Student.findOne({
            id_number: id_number,
        });
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }
        // Update the student's information
        const studentResult = await student_model_1.Student.updateOne({ id_number: id_number }, {
            $set: {
                rfid: rfid,
                first_name: first_name,
                middle_name: middle_name,
                last_name: last_name,
                email: email,
                course: course,
                year: year,
            },
        });
        // Update related orders with the new student details
        await orders_model_1.Orders.updateMany({ id_number: id_number }, {
            $set: {
                student_name: `${first_name} ${middle_name} ${last_name}`,
                course: course,
                year: year,
                rfid: rfid,
            },
        });
        // Log the editing action
        const log = new log_model_1.Log({
            admin: req.admin.name,
            admin_id: req.admin._id,
            action: "Edited Student",
            target: `${id_number} - ${first_name} ${middle_name} ${last_name}`,
            target_id: student._id,
            target_model: "Student",
        });
        await log.save();
        res
            .status(200)
            .json({ message: "Student and related orders updated successfully" });
    }
    catch (error) {
        console.error("Error updating student and orders:", error);
        res.status(500).json("Internal Server Error");
    }
};
exports.editStudentController = editStudentController;
const changeStudentPassword = async (req, res) => {
    try {
        const getStudent = await student_model_1.Student.findOne({
            id_number: req.body.id_number,
        });
        if (!getStudent) {
            return res.status(404).json({ message: "Student not found" });
        }
        const hashedPassword = await bcryptjs_1.default.hash(req.body.password, 10);
        getStudent.password = hashedPassword;
        await getStudent.save();
        // Log the password change action
        const log = new log_model_1.Log({
            admin: req.admin.name,
            admin_id: req.admin._id,
            action: "Changed Student Password",
            target: `${getStudent.id_number} - ${getStudent.first_name} ${getStudent.middle_name} ${getStudent.last_name}`,
            target_id: getStudent._id,
            target_model: "Student",
        });
        await log.save();
        //console.log("Action logged successfully.");
        res.status(200).json({ message: "Password changed successfully" });
    }
    catch (error) {
        console.error("Error changing student password:", error);
        res.status(500).json({ message: "An error occurred", error: error });
    }
};
exports.changeStudentPassword = changeStudentPassword;
const fetchSpecificStudentController = async (req, res) => {
    const { id_number } = req.params;
    try {
        const student = await student_model_1.Student.findOne({ id_number });
        if (!student) {
            res.status(404).json({ message: "Student not found" });
        }
        else {
            const user = {
                isRequest: student.isRequest,
                role: student.role,
            };
            res.status(200).json({ data: user });
        }
    }
    catch (error) {
        console.error(error);
    }
};
exports.fetchSpecificStudentController = fetchSpecificStudentController;
const fetchSpecificMembershipHistoryController = async (req, res) => {
    const { id_number } = req.params;
    try {
        const membershipHistory = await history_model_1.MembershipHistory.find({
            id_number: id_number,
        }).sort({ date: -1 });
        if (!membershipHistory) {
            res.status(400).json({ message: "No Membership History" });
        }
        res.status(200).json({ data: membershipHistory });
    }
    catch (error) {
        console.error("Error fetching student membership history:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};
exports.fetchSpecificMembershipHistoryController = fetchSpecificMembershipHistoryController;
