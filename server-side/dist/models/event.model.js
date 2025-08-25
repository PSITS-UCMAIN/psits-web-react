"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Event = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const attendee_model_1 = require("./attendee.model");
const salesDataSchema = new mongoose_1.Schema({
    campus: {
        type: String,
        enum: ["UC-Main", "UC-Banilad", "UC-LM", "UC-PT", "UC-CS"],
        required: true,
    },
    unitsSold: {
        type: Number,
        default: 0,
    },
    totalRevenue: {
        type: Number,
        default: 0,
    },
});
const sessionConfigTypeSchema = new mongoose_1.Schema({
    enabled: { type: Boolean },
    timeRange: { type: String },
}, { _id: false });
const eventSchema = new mongoose_1.Schema({
    eventId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Merch",
        required: true,
    },
    eventName: {
        type: String,
        required: true,
    },
    eventImage: {
        type: Array,
    },
    eventDate: {
        type: Date,
    },
    eventDescription: {
        type: String,
        required: true,
    },
    attendanceType: {
        type: String,
        enum: ["ticketed", "open"],
        default: "ticketed",
    },
    sessionConfig: {
        type: new mongoose_1.Schema({
            morning: { type: sessionConfigTypeSchema, required: true },
            afternoon: { type: sessionConfigTypeSchema, required: true },
            evening: { type: sessionConfigTypeSchema, required: true },
        }, { _id: false }),
        default: {
            morning: { enabled: true, timeRange: "" },
            afternoon: { enabled: false, timeRange: "" },
            evening: { enabled: false, timeRange: "" },
        },
    },
    createdBy: { type: String, required: true },
    attendees: {
        type: [attendee_model_1.attendeeSchema],
        default: [],
    },
    status: {
        type: String,
        required: true,
    },
    limit: {
        type: [
            {
                campus: {
                    type: String,
                    enum: ["UC-Main", "UC-Banilad", "UC-LM", "UC-PT", "UC-CS"],
                    required: true,
                },
                limit: {
                    type: Number,
                    required: true,
                },
            },
        ],
        default: [
            { campus: "UC-Main", limit: 0 },
            { campus: "UC-Banilad", limit: 0 },
            { campus: "UC-LM", limit: 0 },
            { campus: "UC-PT", limit: 0 },
            { campus: "UC-CS", limit: 0 },
        ],
    },
    sales_data: {
        type: [salesDataSchema],
        default: [
            { campus: "UC-Main", unitsSold: 0, totalRevenue: 0 },
            { campus: "UC-Banilad", unitsSold: 0, totalRevenue: 0 },
            { campus: "UC-LM", unitsSold: 0, totalRevenue: 0 },
            { campus: "UC-PT", unitsSold: 0, totalRevenue: 0 },
            { campus: "UC-CS", unitsSold: 0, totalRevenue: 0 },
        ],
    },
    totalUnitsSold: {
        type: Number,
        default: 0,
    },
    totalRevenueAll: {
        type: Number,
        default: 0,
    },
});
exports.Event = mongoose_1.default.model("event", eventSchema);
