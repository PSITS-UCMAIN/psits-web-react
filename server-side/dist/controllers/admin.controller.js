"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setNewAdminAccessController = exports.declineAdminAccountController = exports.approveAdminAccountController = exports.addNewAdminAccountController = exports.setDeclineMemberRoleController = exports.approveRoleMemberController = exports.getAllRequestAdminAccountController = exports.getAllRequestMemberController = exports.setAdminRequestRoleController = exports.setRestoreAdminAccountController = exports.setMemberRoleRemoveController = exports.setSuspendAdminAccountController = exports.changeAdminPasswordController = exports.editAdminAccountController = exports.getAllSuspendAdminAccountController = exports.getAllAdminMembersController = exports.getAllAdminAccountsController = exports.getDailySalesController = exports.getStudentDashboardCountController = exports.getOrderPlacedCountController = exports.getPublishMerchandiseCountController = exports.getActiveMembershipCountController = exports.getStudentsCountController = exports.getMembershipRequestController = exports.getMembershipHistoryController = exports.revokeAllMembershipController = exports.approveMembershipController = exports.getSearchStudentByIdController = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const student_model_1 = require("../models/student.model");
const admin_model_1 = require("../models/admin.model");
const merch_model_1 = require("../models/merch.model");
const orders_model_1 = require("../models/orders.model");
const log_model_1 = require("../models/log.model");
const history_model_1 = require("../models/history.model");
const date_fns_1 = require("date-fns");
const model_data_1 = require("../model_template/model_data");
const mail_template_1 = require("../mail_template/mail.template");
const getSearchStudentByIdController = async (req, res) => {
    const { id_number } = req.params;
    try {
        const student = await student_model_1.Student.findOne({
            id_number,
        });
        if (!student) {
            res.status(404).json({
                message: "Student not found!",
            });
        }
        else {
            res.status(200).json({ data: student });
        }
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "An error occurred", error: error });
    }
};
exports.getSearchStudentByIdController = getSearchStudentByIdController;
const approveMembershipController = async (req, res) => {
    const { reference_code, id_number, type, admin, rfid, date, cash, total } = req.body;
    const session = await mongoose_1.default.startSession();
    session.startTransaction();
    try {
        const student = await student_model_1.Student.findOne({
            id_number,
        }).session(session);
        if (!student) {
            console.error(`Student with id_number ${id_number} not found.`);
            return res.status(404).json({ message: "Student not found" });
        }
        let updateQuery = {};
        if (student.isFirstApplication) {
            updateQuery = {
                membershipStatus: "ACTIVE",
                rfid: rfid,
                isFirstApplication: false,
            };
        }
        else {
            updateQuery = {
                membershipStatus: "RENEWED",
            };
        }
        await student_model_1.Student.updateOne({ id_number }, { $set: updateQuery }).session(session);
        const history = new history_model_1.MembershipHistory({
            id_number,
            rfid,
            reference_code,
            type: student.isFirstApplication ? "Membership" : "Renewal",
            name: `${student.first_name} ${student.middle_name} ${student.last_name}`,
            year: student.year,
            course: student.course,
            date: new Date(),
            admin: admin ? admin : req.admin.name,
        });
        const savedHistory = await history.save();
        if (!savedHistory) {
            console.error("Failed to save membership history.");
            return res
                .status(500)
                .json({ message: "Failed to save membership history" });
        }
        await session.commitTransaction();
        session.endSession();
        const data = {
            name: `${student.first_name} ${student.middle_name} ${student.last_name}`,
            reference_code,
            cash: cash ?? 50,
            total: cash ?? 50,
            course: student.course,
            year: student.year,
            admin: admin ?? req.admin.name,
            date: (0, date_fns_1.format)(new Date(), "MMMM d, yyyy"),
            change: (cash ?? 50) - (cash ?? 50),
        };
        // Call the reusable receipt function
        await (0, mail_template_1.membershipRequestReceipt)(data, student?.email ?? "");
        return res
            .status(200)
            .json({ message: "Membership approved successfully" });
    }
    catch (error) {
        console.error("Internal server error:", error);
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ message: "Internal server error", error: error });
    }
};
exports.approveMembershipController = approveMembershipController;
const revokeAllMembershipController = async (req, res) => {
    try {
        const revokeMembership = await student_model_1.Student.updateMany({
            membershipStatus: "NOT_APPLIED",
        });
        if (!revokeMembership) {
            return res.status(404).json({ message: "Student not found" });
        }
        res.status(200).json({
            message: "All Student Membership has been revoked  successfully",
        });
    }
    catch (error) {
        console.error("Error revoking membership student:", error);
        res.status(500).json("Internal Server Error");
    }
};
exports.revokeAllMembershipController = revokeAllMembershipController;
const getMembershipHistoryController = async (req, res) => {
    try {
        const history = await history_model_1.MembershipHistory.find().sort({
            date: -1,
        });
        if (!history) {
            res.status(401).json({ message: "No History" });
        }
        res.status(200).json(history);
    }
    catch (error) {
        console.error("Error fetching membership history:", error);
        res.status(500).json("Internal Server Error");
    }
};
exports.getMembershipHistoryController = getMembershipHistoryController;
const getMembershipRequestController = async (req, res) => {
    try {
        const students = await student_model_1.Student.find({
            membershipStatus: "PENDING",
        });
        if (!students) {
            res.status(401).json({ message: "No students request" });
        }
        res.status(200).json(students);
    }
    catch (error) {
        console.error("Error fetching students:", error);
        res.status(500).json("Internal Server Error");
    }
};
exports.getMembershipRequestController = getMembershipRequestController;
const getStudentsCountController = async (req, res) => {
    try {
        const [all, request, deleted] = await Promise.all([
            student_model_1.Student.countDocuments({
                status: "True",
            }),
            student_model_1.Student.countDocuments({ membershipStatus: "PENDING" }),
            student_model_1.Student.countDocuments({ status: "False" }),
        ]);
        res.status(200).json({ all, request, deleted });
    }
    catch (error) {
        console.error(error);
    }
};
exports.getStudentsCountController = getStudentsCountController;
const getActiveMembershipCountController = async (req, res) => {
    try {
        const count = await student_model_1.Student.countDocuments({
            status: "True",
            $or: [{ membershipStatus: "ACTIVE" }, { membershipStatus: "RENEWED" }],
        });
        res.status(200).json({ message: count });
    }
    catch (error) {
        console.error("Error fetching active membership count:", error);
        res.status(500).json({ error: "Failed to fetch count" });
    }
};
exports.getActiveMembershipCountController = getActiveMembershipCountController;
const getPublishMerchandiseCountController = async (req, res) => {
    const now = new Date();
    const count = await merch_model_1.Merch.countDocuments({
        is_active: true,
        start_date: { $lte: now },
        end_date: { $gte: now },
    });
    return res.json({ message: count });
};
exports.getPublishMerchandiseCountController = getPublishMerchandiseCountController;
const getOrderPlacedCountController = async (req, res) => {
    const count = await orders_model_1.Orders.countDocuments({ order_status: "Pending" });
    return res.json({ message: count });
};
exports.getOrderPlacedCountController = getOrderPlacedCountController;
const getStudentDashboardCountController = async (req, res) => {
    try {
        const [bsitCount, bscsCount, actCount, year1Count, year2Count, year3Count, year4Count,] = await Promise.all([
            student_model_1.Student.countDocuments({ course: "BSIT" }),
            student_model_1.Student.countDocuments({ course: "BSCS" }),
            student_model_1.Student.countDocuments({ course: "ACT" }),
            student_model_1.Student.countDocuments({ year: "1" }),
            student_model_1.Student.countDocuments({ year: "2" }),
            student_model_1.Student.countDocuments({ year: "3" }),
            student_model_1.Student.countDocuments({ year: "4" }),
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
    }
    catch (error) {
        return res
            .status(500)
            .json({ error: "An error occurred while fetching statistics." });
    }
};
exports.getStudentDashboardCountController = getStudentDashboardCountController;
const getDailySalesController = async (req, res) => {
    try {
        const currentDate = new Date();
        const startOfDayDate = (0, date_fns_1.startOfDay)(currentDate);
        const endOfDayDate = (0, date_fns_1.endOfDay)(currentDate);
        const result = await orders_model_1.Orders.aggregate([
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
    }
    catch (error) {
        console.error("Error fetching orders by date:", error);
        res.status(500).json({ error: "An error occurred while fetching orders" });
    }
};
exports.getDailySalesController = getDailySalesController;
const getAllAdminAccountsController = async (req, res) => {
    try {
        const officers = await admin_model_1.Admin.find({ status: "Active" });
        const users = officers.map((officer) => (0, model_data_1.admin_model)(officer));
        res.status(200).json({ data: users });
    }
    catch (error) {
        console.error("Error fetching officers:", error);
        res.status(500).json({ error: "Failed to fetch officers" });
    }
};
exports.getAllAdminAccountsController = getAllAdminAccountsController;
const getAllAdminMembersController = async (req, res) => {
    try {
        const rolesToFind = ["developer", "officers", "media", "volunteer"];
        const members = await student_model_1.Student.find({
            role: { $in: rolesToFind },
            isRequest: false,
        });
        const users = members.map((member) => (0, model_data_1.role_model)(member));
        res.status(200).json({ data: users });
    }
    catch (error) {
        console.error("Error fetching officers:", error);
        res.status(500).json({ error: "Failed to fetch officers" });
    }
};
exports.getAllAdminMembersController = getAllAdminMembersController;
const getAllSuspendAdminAccountController = async (req, res) => {
    try {
        const officers = await admin_model_1.Admin.find({ status: "Suspend" });
        const users = officers.map((officer) => (0, model_data_1.admin_model)(officer));
        res.status(200).json({ data: users });
    }
    catch (error) {
        console.error("Error fetching officers:", error);
        res.status(500).json({ error: "Failed to fetch officers" });
    }
};
exports.getAllSuspendAdminAccountController = getAllSuspendAdminAccountController;
const editAdminAccountController = async (req, res) => {
    const { id_number, name, position, email, course, year, campus } = req.body;
    try {
        const getAdmin = await admin_model_1.Admin.findOne({
            id_number: req.body.id_number,
        });
        if (!getAdmin) {
            res.status(400).json({ message: "No Admin Found!" });
        }
        const adminResult = await admin_model_1.Admin.updateOne({ id_number: id_number }, {
            $set: {
                name: name,
                position: position,
                campus: campus,
                email: email,
                course: course,
                year: year,
            },
        });
        if (adminResult.modifiedCount > 0) {
            const log = new log_model_1.Log({
                admin: req.admin.name,
                admin_id: req.admin._id,
                action: "Edited Admin",
                target: `${id_number} - ${name}`,
                target_id: getAdmin?._id,
                target_model: "Admin",
            });
            await log.save();
            res.status(200).json({ message: "Officer updated successfully" });
        }
        else {
            res.status(404).json({ error: "No officer found with the provided ID" });
        }
    }
    catch (error) {
        console.error("Error updating officer:", error);
        res.status(500).json({ error: "Failed to update officer" });
    }
};
exports.editAdminAccountController = editAdminAccountController;
const changeAdminPasswordController = async (req, res) => {
    try {
        const getAdmin = await admin_model_1.Admin.findOne({
            id_number: req.body.id_number,
        });
        if (!getAdmin) {
            return res.status(404).json({ message: "Admin not found" });
        }
        const hashedPassword = await bcryptjs_1.default.hash(req.body.password, 10);
        getAdmin.password = hashedPassword;
        await getAdmin.save();
        // Log the password change action
        const log = new log_model_1.Log({
            admin: req.admin.name,
            admin_id: req.admin._id,
            action: "Changed Admin Password",
            target: `${getAdmin.id_number} - ${getAdmin.name}`,
            target_id: getAdmin._id,
            target_model: "Admin",
        });
        await log.save();
        res.status(200).json({ message: "Password changed successfully" });
    }
    catch (error) {
        res.status(500).json({ message: "An error occurred", error: error });
    }
};
exports.changeAdminPasswordController = changeAdminPasswordController;
const setSuspendAdminAccountController = async (req, res) => {
    const { id_number } = req.body;
    try {
        const updatedAdmin = await admin_model_1.Admin.updateOne({ id_number }, {
            $set: {
                status: "Suspend",
            },
        });
        if (updatedAdmin.modifiedCount > 0) {
            res.status(200).json({ message: "Admin status updated to Suspend" });
        }
        else {
            res.status(404).json({ message: "Admin not found or already suspended" });
        }
    }
    catch (error) {
        console.error("Error suspending admin:", error);
        res.status(500).json({ message: "An error occurred", error: error });
    }
};
exports.setSuspendAdminAccountController = setSuspendAdminAccountController;
const setMemberRoleRemoveController = async (req, res) => {
    const { id_number } = req.body;
    try {
        const updatedStudent = await student_model_1.Student.updateOne({ id_number }, {
            $set: {
                role: "all",
            },
        });
        const updatedStudentOrder = await orders_model_1.Orders.updateMany({
            id_number,
        }, {
            $set: {
                role: "all",
            },
        });
        if (updatedStudent.modifiedCount > 0) {
            res.status(200).json({ message: "Role removed successfully" });
        }
        else {
            res.status(404).json({ message: "Student not found" });
        }
    }
    catch (error) {
        console.error("Error removing role from admin:", error);
        res.status(500).json({ message: "An error occurred", error: error });
    }
};
exports.setMemberRoleRemoveController = setMemberRoleRemoveController;
const setRestoreAdminAccountController = async (req, res) => {
    const { id_number } = req.body;
    try {
        const getAdmin = await admin_model_1.Admin.findOne({
            id_number: req.body.id_number,
        });
        if (!getAdmin) {
            return res.status(400).json({ message: "No Admin Found!" });
        }
        const updatedAdmin = await admin_model_1.Admin.updateOne({ id_number }, {
            $set: {
                status: "Active",
            },
        });
        if (updatedAdmin.modifiedCount > 0) {
            // Log the restore officer action
            const log = new log_model_1.Log({
                admin: req.admin.name,
                admin_id: req.admin._id,
                action: "Restored Suspended Admin",
                target: `${id_number} - ${getAdmin?.name}`,
                target_id: getAdmin?._id,
                target_model: "Admin",
            });
            await log.save();
            res.status(200).json({ message: "Admin status updated to Active" });
        }
        else {
            res.status(404).json({ message: "Admin not found or already active" });
        }
    }
    catch (error) {
        console.error("Error activating admin:", error);
        res.status(500).json({ message: "An error occurred", error: error });
    }
};
exports.setRestoreAdminAccountController = setRestoreAdminAccountController;
const setAdminRequestRoleController = async (req, res) => {
    const { id_number, role, admin } = req.body;
    try {
        const student = await student_model_1.Student.findOne({
            id_number: id_number,
        });
        const updatedRole = await student_model_1.Student.updateOne({ id_number }, {
            $set: {
                role: role,
                isRequest: true,
                adminRequest: admin,
            },
        });
        const updatedStudentOrder = await orders_model_1.Orders.updateMany({ id_number }, {
            $set: {
                role: role,
            },
        });
        await new log_model_1.Log({
            admin: admin,
            action: "Request Role for " + student?.first_name + " " + student?.last_name,
            target: role + " request",
            target_model: "Student",
        }).save();
        if (updatedRole.modifiedCount > 0) {
            res.status(200).json({ message: "Role updated successfully" });
        }
        else {
            res.status(404).json({ message: "Student not found" });
        }
    }
    catch (error) {
        console.error("Error updating student role:", error);
        res.status(500).json({ message: "An error occurred", error: error });
    }
};
exports.setAdminRequestRoleController = setAdminRequestRoleController;
const getAllRequestMemberController = async (req, res) => {
    try {
        const students = await student_model_1.Student.find({ isRequest: true });
        const user = students.map((student) => (0, model_data_1.role_model)(student));
        res.status(200).json({ data: user });
    }
    catch (error) {
        console.error("Error fetching students:", error);
        res.status(500).json("Internal Server Error");
    }
};
exports.getAllRequestMemberController = getAllRequestMemberController;
const getAllRequestAdminAccountController = async (req, res) => {
    try {
        const admin = await admin_model_1.Admin.find({ status: "Request" });
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
    }
    catch (error) {
        console.error("Error fetching admins:", error);
        res.status(500).json("Internal Server Error");
    }
};
exports.getAllRequestAdminAccountController = getAllRequestAdminAccountController;
const approveRoleMemberController = async (req, res) => {
    const { id_number } = req.body;
    try {
        const updatedRole = await student_model_1.Student.updateOne({ id_number }, {
            $set: {
                isRequest: false,
            },
        });
        if (updatedRole.modifiedCount > 0) {
            res.status(200).json({ message: "Role approved successfully" });
        }
        else {
            res.status(404).json({ message: "Student not found" });
        }
    }
    catch (error) {
        console.error("Error updating student role:", error);
        res.status(500).json({ message: "An error occurred", error: error });
    }
};
exports.approveRoleMemberController = approveRoleMemberController;
const setDeclineMemberRoleController = async (req, res) => {
    const { id_number } = req.body;
    try {
        const updatedRole = await student_model_1.Student.updateOne({ id_number }, {
            $set: {
                role: "all",
                isRequest: false,
            },
        });
        if (updatedRole.modifiedCount > 0) {
            res.status(200).json({ message: "Role approved successfully" });
        }
        else {
            res.status(404).json({ message: "Student not found" });
        }
    }
    catch (error) {
        console.error("Error updating student role:", error);
        res.status(500).json({ message: "An error occurred", error: error });
    }
};
exports.setDeclineMemberRoleController = setDeclineMemberRoleController;
const addNewAdminAccountController = async (req, res) => {
    const { id_number, name, password, email, position, course, year, campus, status, } = req.body;
    try {
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const newAdmin = new admin_model_1.Admin({
            id_number,
            name,
            password: hashedPassword,
            email,
            position,
            course,
            year,
            campus,
            status,
            access: "standard",
        });
        await newAdmin.save();
        res.status(200).json({ message: "Account Creation successful" });
    }
    catch (error) {
        console.error(error);
    }
};
exports.addNewAdminAccountController = addNewAdminAccountController;
const approveAdminAccountController = async (req, res) => {
    const { id_number } = req.body;
    try {
        const updatedRole = await admin_model_1.Admin.updateOne({ id_number }, {
            $set: {
                status: "Active",
            },
        });
        if (updatedRole.modifiedCount > 0) {
            res.status(200).json({ message: "Admin Account approved successfully" });
        }
        else {
            res.status(404).json({ message: "Admin not found" });
        }
    }
    catch (error) {
        console.error("Error updating admin account:", error);
        res.status(500).json({ message: "An error occurred", error: error });
    }
};
exports.approveAdminAccountController = approveAdminAccountController;
const declineAdminAccountController = async (req, res) => {
    const { id_number } = req.body;
    try {
        const deletedAdmin = await admin_model_1.Admin.deleteOne({ id_number });
        if (deletedAdmin.deletedCount > 0) {
            res.status(200).json({ message: "Admin account deleted successfully" });
        }
        else {
            res.status(404).json({ message: "Admin not found" });
        }
    }
    catch (error) {
        console.error("Error deleting admin account:", error);
        res.status(500).json({ message: "An error occurred", error: error });
    }
};
exports.declineAdminAccountController = declineAdminAccountController;
const setNewAdminAccessController = async (req, res) => {
    const { id_number, newAccess } = req.body;
    if (!id_number || !newAccess) {
        return res
            .status(400)
            .json({ message: "id_number and newAccess are required" });
    }
    try {
        const adminToUpdate = await admin_model_1.Admin.findOne({
            id_number,
        });
        if (!adminToUpdate) {
            return res.status(404).json({ message: "Admin not found" });
        }
        adminToUpdate.access = newAccess;
        await adminToUpdate.save();
        await new log_model_1.Log({
            admin: req.admin.name,
            action: `Change Access for ${adminToUpdate.name} to ${newAccess}`,
            target: "Change Access",
            target_model: "Admin",
        }).save();
        res.status(200).json({ message: "Access updated successfully" });
    }
    catch (error) {
        console.error("Error updating access account:", error);
        res.status(500).json({ message: "An error occurred", error: error });
    }
};
exports.setNewAdminAccessController = setNewAdminAccessController;
