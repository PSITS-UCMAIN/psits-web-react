"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.log_console = exports.log_console_admin = exports.role_authenticate = exports.both_authenticate = exports.student_authenticate = exports.admin_authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const token_key = process.env.JWT_SECRET ?? "";
const admin_model_1 = require("../models/admin.model");
const student_model_1 = require("../models/student.model");
const model_data_1 = require("../model_template/model_data");
const admin_authenticate = (req, res, next) => {
    const authHeader = req.headers["authorization"] || req.headers["Authorization"];
    let token;
    if (authHeader) {
        if (Array.isArray(authHeader)) {
            token = authHeader[0].split(" ")[1];
        }
        else {
            token = authHeader.split(" ")[1];
        }
    }
    if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    jsonwebtoken_1.default.verify(token, token_key, async (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: "Forbidden" });
        }
        try {
            const admin = await admin_model_1.Admin.findOne({ id_number: decoded.user.id_number });
            if (admin) {
                req.admin = (0, model_data_1.admin_model)(admin);
                (0, exports.log_console_admin)((0, model_data_1.admin_model)(admin), req);
                next();
            }
            else
                res.status(403).json({ message: "Access Denied" });
        }
        catch (error) {
            console.error(error);
        }
    });
};
exports.admin_authenticate = admin_authenticate;
const student_authenticate = (req, res, next) => {
    const authHeader = req.headers["authorization"] || req.headers["Authorization"];
    let token;
    if (authHeader) {
        if (Array.isArray(authHeader)) {
            token = authHeader[0].split(" ")[1];
        }
        else {
            token = authHeader.split(" ")[1];
        }
    }
    if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    jsonwebtoken_1.default.verify(token, token_key, async (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: "Forbidden" });
        }
        try {
            const student = await student_model_1.Student.findOne({
                id_number: decoded.user?.id_number,
            });
            if (student) {
                req.student = (0, model_data_1.user_model)(student);
                (0, exports.log_console)((0, model_data_1.user_model)(student), req);
                next();
            }
            else
                res.status(403).json({ message: "Access Denied" });
        }
        catch (error) {
            console.error(error);
        }
    });
};
exports.student_authenticate = student_authenticate;
const both_authenticate = (req, res, next) => {
    const authHeader = req.headers["authorization"] || req.headers["Authorization"];
    let token;
    if (authHeader) {
        if (Array.isArray(authHeader)) {
            token = authHeader[0].split(" ")[1];
        }
        else {
            token = authHeader.split(" ")[1];
        }
    }
    if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    jsonwebtoken_1.default.verify(token, token_key, async (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: "Forbidden" });
        }
        try {
            const student = await student_model_1.Student.findOne({
                id_number: decoded.user?.id_number,
            });
            if (!student) {
                const admin = await admin_model_1.Admin.findOne({
                    id_number: decoded.user?.id_number,
                });
                if (admin) {
                    req.both = (0, model_data_1.admin_model)(admin);
                    (0, exports.log_console_admin)((0, model_data_1.admin_model)(admin), req);
                    next();
                }
                else
                    res.status(403).json({ message: "Access Denied" });
            }
            else if (student) {
                req.both = (0, model_data_1.user_model)(student);
                (0, exports.log_console)((0, model_data_1.user_model)(student), req);
                next();
            }
            else
                res.status(403).json({ message: "Access Denied" });
        }
        catch (error) {
            console.error(error);
        }
    });
};
exports.both_authenticate = both_authenticate;
const role_authenticate = (access) => {
    return (req, res, next) => {
        try {
            if (access.includes(req.admin?.access ?? "")) {
                next();
            }
            else {
                res.status(403).json({ message: "Forbidden Path" });
            }
        }
        catch (error) {
            console.error(error);
            res.status(500).json({ message: error });
        }
    };
};
exports.role_authenticate = role_authenticate;
const log_console_admin = (user, request) => {
    console.log("*********************************\nAdmin Name: " +
        user.name +
        "\nAccess: " +
        user.access +
        "\nRequested Route: " +
        request.originalUrl +
        "\n*********************************");
};
exports.log_console_admin = log_console_admin;
const log_console = (user, request) => {
    console.log("*********************************\nStudent Name: " +
        user.name +
        "\nCourse & Year: " +
        user.course +
        "-" +
        user.year +
        "\nRequested Route: " +
        request.originalUrl +
        "\n*********************************");
};
exports.log_console = log_console;
