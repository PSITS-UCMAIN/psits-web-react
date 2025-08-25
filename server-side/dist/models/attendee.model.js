"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attendeeSchema = void 0;
const mongoose_1 = require("mongoose");
const attendanceSessionSchema = new mongoose_1.Schema({
    attended: { type: Boolean, default: false },
    timestamp: { type: Date },
}, { _id: false });
exports.attendeeSchema = new mongoose_1.Schema({
    id_number: {
        type: String,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    course: {
        type: String,
        required: true,
    },
    year: {
        type: Number,
        required: true,
    },
    campus: {
        type: String,
        required: true,
    },
    attendance: {
        type: new mongoose_1.Schema({
            morning: attendanceSessionSchema,
            afternoon: attendanceSessionSchema,
            evening: attendanceSessionSchema,
        }, { _id: false }),
        required: false,
    },
    confirmedBy: {
        type: String,
    },
    shirtSize: {
        type: String,
    },
    shirtPrice: {
        type: Number,
    },
    raffleIsRemoved: {
        type: Boolean,
        default: false,
    },
    raffleIsWinner: {
        type: Boolean,
        default: false,
    },
    transactBy: {
        type: String,
    },
    transactDate: {
        type: Date,
    },
});
