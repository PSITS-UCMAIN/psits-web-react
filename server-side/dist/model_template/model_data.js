"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.role_model = exports.user_model = exports.admin_model = void 0;
const admin_model = (admin) => {
    return {
        _id: admin._id,
        id_number: admin.id_number,
        name: admin.name,
        email: admin.email,
        course: admin.course,
        year: admin.year,
        role: "Admin",
        position: admin.position,
        campus: admin.campus ?? "",
        access: admin.access,
        status: admin.status ?? "True",
    };
};
exports.admin_model = admin_model;
const user_model = (user) => {
    return {
        id_number: user.id_number,
        name: user.first_name + " " + user.middle_name + " " + user.last_name,
        email: user.email,
        course: user.course,
        year: user.year,
        role: "Student",
        position: "Student",
        campus: user.campus,
        status: user.status,
    };
};
exports.user_model = user_model;
const role_model = (user) => {
    return {
        id_number: user.id_number,
        name: user.first_name + " " + user.middle_name + " " + user.last_name,
        email: user.email,
        course: user.course,
        year: user.year,
        role: user.role,
        position: "Student",
        status: user.status,
        campus: user.campus,
        isRequest: user.isRequest,
        adminRequest: user.adminRequest,
    };
};
exports.role_model = role_model;
