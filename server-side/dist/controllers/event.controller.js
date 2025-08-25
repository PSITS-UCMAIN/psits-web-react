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
exports.removeAttendanceController = exports.removeEventController = exports.getEventStatisticsController = exports.addAttendeeController = exports.removeAttendeeInRaffleController = exports.setAttendeeAsRaffleWinnerController = exports.getEligibleAttendeesRaffleController = exports.updateLimitSettingsController = exports.checkLimitPerCampusController = exports.updateAttendancePerSessionController = exports.getAllEventsAndAttendeesController = exports.getAllEventsController = exports.createManualEventController = void 0;
const event_model_1 = require("../models/event.model");
const merch_model_1 = require("../models/merch.model");
const mongoose_1 = __importStar(require("mongoose"));
const date_formatter_1 = require("../custom_function/date.formatter");
const createManualEventController = async (req, res) => {
    try {
        const { name, eventDate, description, sessionConfig } = req.body;
        const imageUrl = req.files?.map((file) => file.location) || [];
        let parsedSessionConfig;
        try {
            parsedSessionConfig =
                typeof sessionConfig === "string"
                    ? JSON.parse(sessionConfig)
                    : sessionConfig || {};
        }
        catch (error) {
            console.error("Error parsing sessionConfig:", error);
            return res.status(400).json({
                message: "Invalid session configuration format",
                error: error,
            });
        }
        const { isMorningEnabled = true, morningTime = "", isAfternoonEnabled = false, afternoonTime = "", isEveningEnabled = false, eveningTime = "", } = parsedSessionConfig;
        const hasValidSession = (isMorningEnabled && morningTime) ||
            (isAfternoonEnabled && afternoonTime) ||
            (isEveningEnabled && eveningTime);
        if (!hasValidSession) {
            return res.status(400).json({
                message: "At least one session must be enabled with a time range",
            });
        }
        // Helper: parse "HH:MM - HH:MM" into { start: Date, end: Date }
        const parseRange = (rangeStr, baseDate, sessionName) => {
            const [startStr, endStr] = rangeStr.split(" - ");
            const [sh, sm] = startStr.split(":").map(Number);
            const [eh, em] = endStr.split(":").map(Number);
            const start = new Date(baseDate);
            start.setHours(sh, sm, 0, 0);
            const end = new Date(baseDate);
            end.setHours(eh, em, 0, 0);
            if (end <= start) {
                throw new Error(`Invalid time range for ${sessionName} session: "To" time must be later than "From" time.`);
            }
            return { start, end };
        };
        const enabledSessions = [];
        if (isMorningEnabled && morningTime) {
            enabledSessions.push({
                name: "morning",
                ...parseRange(morningTime, eventDate, "morning"),
            });
        }
        if (isAfternoonEnabled && afternoonTime) {
            enabledSessions.push({
                name: "afternoon",
                ...parseRange(afternoonTime, eventDate, "afternoon"),
            });
        }
        if (isEveningEnabled && eveningTime) {
            enabledSessions.push({
                name: "evening",
                ...parseRange(eveningTime, eventDate, "evening"),
            });
        }
        // Check for time overlaps
        for (let i = 0; i < enabledSessions.length; i++) {
            for (let j = i + 1; j < enabledSessions.length; j++) {
                const a = enabledSessions[i];
                const b = enabledSessions[j];
                if (a.start < b.end && b.start < a.end) {
                    res.status(400).json({
                        message: `Session time ranges overlap between ${a.name} and ${b.name}. Please fix them.`,
                    });
                    return;
                }
            }
        }
        const newEvent = new event_model_1.Event({
            eventId: new mongoose_1.default.Types.ObjectId(),
            eventName: name, // Use 'name' from frontend
            eventImage: imageUrl,
            eventDate: eventDate,
            eventDescription: description,
            status: "Ongoing",
            attendanceType: "open",
            sessionConfig: {
                morning: {
                    enabled: isMorningEnabled,
                    timeRange: morningTime,
                },
                afternoon: {
                    enabled: isAfternoonEnabled,
                    timeRange: afternoonTime,
                },
                evening: {
                    enabled: isEveningEnabled,
                    timeRange: eveningTime,
                },
            },
            attendees: [],
            createdBy: req.admin.name,
        });
        await newEvent.save();
        res.status(201).json({
            message: "Event created successfully",
            event: newEvent,
        });
    }
    catch (error) {
        console.error("Error creating event:", error);
        res.status(500).json({
            message: "Failed to create event",
            error: error,
        });
    }
};
exports.createManualEventController = createManualEventController;
const getAllEventsController = async (req, res) => {
    try {
        const events = await event_model_1.Event.find();
        if (!events) {
            res.status(400).json({ message: "No event found" });
        }
        return res.status(200).json({ data: events });
    }
    catch (error) {
        console.error(error);
    }
};
exports.getAllEventsController = getAllEventsController;
const getAllEventsAndAttendeesController = async (req, res) => {
    const { id } = req.params;
    try {
        const eventId = new mongoose_1.Types.ObjectId(id);
        const merchData = await merch_model_1.Merch.findById({ _id: eventId });
        const attendees = await event_model_1.Event.find({ eventId });
        if (attendees) {
            res
                .status(200)
                .json({ data: attendees, merch_data: merchData ? merchData : {} });
        }
        else {
            res.status(500).json({ message: "No attendees" });
        }
    }
    catch (error) {
        console.error(error);
    }
};
exports.getAllEventsAndAttendeesController = getAllEventsAndAttendeesController;
const updateAttendancePerSessionController = async (req, res) => {
    const { event_id, id_number } = req.params;
    const { campus, attendeeName, course, year } = req.body;
    try {
        const event = await event_model_1.Event.findOne({ eventId: event_id });
        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }
        const now = (0, date_formatter_1.getSgDate)();
        const matchedSessions = [];
        const sessions = [
            "morning",
            "afternoon",
            "evening",
        ];
        for (const session of sessions) {
            const config = event.sessionConfig?.[session];
            if (!config?.enabled || !config.timeRange)
                continue;
            const [startStr, endStr] = config.timeRange.split(" - ");
            const [sh, sm] = startStr.split(":").map(Number);
            const [eh, em] = endStr.split(":").map(Number);
            const eventDate = new Date(event.eventDate);
            const today = new Date();
            if (today.toDateString() !== eventDate.toDateString()) {
                return res.status(400).json({
                    message: "Attendance can only be recorded on the event date.",
                });
            }
            const sessionStart = new Date(event.eventDate);
            sessionStart.setHours(sh, sm, 0, 0);
            const sessionEnd = new Date(event.eventDate);
            sessionEnd.setHours(eh, em, 0, 0);
            if (now >= sessionStart && now <= sessionEnd) {
                matchedSessions.push(session);
            }
        }
        if (matchedSessions.length === 0) {
            return res.status(400).json({
                message: "Current time does not fall within any active session.",
            });
        }
        if (matchedSessions.length > 1) {
            return res.status(400).json({
                message: `Ambiguous session time: current time matches multiple sessions (${matchedSessions.join(", ")})`,
            });
        }
        const session = matchedSessions[0];
        let attendee;
        let isNewAttendee = false;
        if (event.attendanceType === "open") {
            attendee = event.attendees.find((existingAttendee) => existingAttendee.id_number === id_number);
            if (!attendee) {
                const newAttendee = {
                    id_number,
                    name: attendeeName,
                    course: course || "Unknown",
                    year: year || 1,
                    campus,
                    attendance: {
                        morning: { attended: false, timestamp: null },
                        afternoon: { attended: false, timestamp: null },
                        evening: { attended: false, timestamp: null },
                    },
                    confirmedBy: "",
                    shirtPrice: 0,
                    shirtSize: "",
                    raffleIsRemoved: false,
                    raffleIsWinner: false,
                    transactBy: "",
                    transactDate: null,
                };
                attendee = newAttendee;
                isNewAttendee = true;
            }
        }
        else {
            attendee = event.attendees.find((existingAttendee) => existingAttendee.id_number === id_number &&
                existingAttendee.name === attendeeName &&
                (existingAttendee.campus === campus || campus === "UC-Main"));
            if (!attendee) {
                return res
                    .status(404)
                    .json({ message: "Attendee not found in this event" });
            }
        }
        const currentSession = attendee.attendance?.[session];
        if (currentSession?.attended) {
            return res
                .status(400)
                .json({ message: `Attendance already recorded for ${session}` });
        }
        if (!attendee.attendance) {
            attendee.attendance = {
                morning: { attended: false, timestamp: null },
                afternoon: { attended: false, timestamp: null },
                evening: { attended: false, timestamp: null },
            };
        }
        if (!attendee.attendance[session]) {
            attendee.attendance[session] = { attended: false, timestamp: null };
        }
        attendee.attendance[session] = {
            attended: true,
            timestamp: now,
        };
        attendee.confirmedBy = req.admin.name;
        if (isNewAttendee) {
            event.attendees.push(attendee);
        }
        event.markModified("attendees");
        await event.save();
        res.status(200).json({
            message: `Attendance for ${session} successfully recorded`,
            session,
            data: attendee,
        });
    }
    catch (error) {
        console.error("Error marking attendance:", error);
        res.status(500).json({
            message: "An error occurred while recording attendance",
            error: error,
        });
    }
};
exports.updateAttendancePerSessionController = updateAttendancePerSessionController;
const checkLimitPerCampusController = async (req, res) => {
    const { eventId } = req.params;
    const event_id = new mongoose_1.Types.ObjectId(eventId);
    try {
        const event = await event_model_1.Event.findOne({ eventId: event_id });
        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }
        res.status(200).json({ data: event });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.checkLimitPerCampusController = checkLimitPerCampusController;
const updateLimitSettingsController = async (req, res) => {
    const { banilad, pt, lm, cs } = req.body;
    const event_id = new mongoose_1.Types.ObjectId(req.params.eventId);
    try {
        const response = await event_model_1.Event.findOneAndUpdate({ eventId: event_id }, {
            $set: {
                limit: [
                    { campus: "UC-Banilad", limit: banilad },
                    { campus: "UC-PT", limit: pt },
                    { campus: "UC-LM", limit: lm },
                    { campus: "UC-CS", limit: cs },
                ],
            },
        }, { new: true });
        if (!response) {
            return res.status(404).json({ message: "Event not found" });
        }
        res
            .status(200)
            .json({ message: "Settings updated successfully", data: response });
    }
    catch (error) {
        console.error(error);
        res
            .status(500)
            .json({ message: "An error occurred while updating settings" });
    }
};
exports.updateLimitSettingsController = updateLimitSettingsController;
const getEligibleAttendeesRaffleController = async (req, res) => {
    const { eventId } = req.params;
    try {
        const event_id = new mongoose_1.Types.ObjectId(eventId);
        const event = await event_model_1.Event.findOne({ eventId: event_id });
        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }
        // Filter eligible attendees
        const eligibleAttendees = event.attendees.filter((attendee) => !attendee.raffleIsWinner && !attendee.raffleIsRemoved);
        const winners = event.attendees.filter((attendee) => attendee.raffleIsWinner);
        res.status(200).json({ attendees: eligibleAttendees, winners: winners });
    }
    catch (error) {
        console.error("Error fetching eligible attendees:", error);
        res
            .status(500)
            .json({ message: "An error occurred while fetching attendees" });
    }
};
exports.getEligibleAttendeesRaffleController = getEligibleAttendeesRaffleController;
const setAttendeeAsRaffleWinnerController = async (req, res) => {
    const { eventId, attendeeId } = req.params;
    const { attendeeName } = req.body;
    try {
        const event_id = new mongoose_1.Types.ObjectId(eventId);
        const event = await event_model_1.Event.findOne({ eventId: event_id });
        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }
        const attendee = event.attendees.find((att) => att.id_number === attendeeId && att.name === attendeeName);
        if (!attendee) {
            return res
                .status(404)
                .json({ message: "Attendee not found in this event" });
        }
        if (attendee.raffleIsWinner) {
            return res.status(400).json({ message: "Attendee is already a winner" });
        }
        attendee.raffleIsWinner = true;
        await event.save();
        res.status(200).json({
            message: "Attendee marked as raffle winner successfully",
            attendee: {
                id_number: attendee.id_number,
                name: attendee.name,
                campus: attendee.campus,
            },
        });
    }
    catch (error) {
        console.error("Error marking attendee as raffle winner:", error);
        res.status(500).json({
            message: "An error occurred while marking the attendee as winner",
        });
    }
};
exports.setAttendeeAsRaffleWinnerController = setAttendeeAsRaffleWinnerController;
const removeAttendeeInRaffleController = async (req, res) => {
    const { eventId, attendeeId } = req.params;
    const { attendeeName } = req.body;
    try {
        const event_id = new mongoose_1.Types.ObjectId(eventId);
        const event = await event_model_1.Event.findOne({ eventId: event_id });
        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }
        const attendee = event.attendees.find((att) => att.id_number === attendeeId && att.name === attendeeName);
        if (!attendee) {
            return res
                .status(404)
                .json({ message: "Attendee not found in this event" });
        }
        // Update attendee raffle status
        attendee.raffleIsWinner = false;
        attendee.raffleIsRemoved = true;
        await event.save();
        res.status(200).json({
            message: "Attendee removed from raffle successfully",
            attendee: {
                id_number: attendee.id_number,
                name: attendee.name,
                campus: attendee.campus,
            },
        });
    }
    catch (error) {
        console.error("Error removing attendee from raffle:", error);
        res.status(500).json({
            message: "An error occurred while removing the attendee from the raffle",
        });
    }
};
exports.removeAttendeeInRaffleController = removeAttendeeInRaffleController;
const addAttendeeController = async (req, res) => {
    try {
        const { id_number, first_name, middle_name, last_name, course, year, campus, email, shirt_size, shirt_price, applied, admin, merchId, } = req.body;
        const event = await event_model_1.Event.findOne({ eventId: merchId });
        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }
        const campusData = event.sales_data.find((s) => s.campus === campus);
        if (!campusData) {
            return res.status(400).json({ message: "Invalid campus" });
        }
        // Check if id_number already exists
        const existingAttendee = event.attendees.find((attendee) => attendee.id_number === id_number && attendee.campus === campus);
        if (existingAttendee) {
            return res.status(400).json({ message: "Attendee already registered" });
        }
        if (shirt_price !== "0") {
            campusData.unitsSold += 1;
            campusData.totalRevenue += Number.parseInt(shirt_price);
            event.totalUnitsSold += 1;
            event.totalRevenueAll += Number.parseInt(shirt_price);
        }
        event.attendees.push({
            id_number,
            name: `${first_name} ${middle_name} ${last_name}`,
            course,
            year,
            campus,
            shirtSize: shirt_size,
            shirtPrice: shirt_price,
            transactBy: admin,
            transactDate: new Date(),
            attendance: {
                morning: {
                    attended: false,
                    timestamp: null,
                },
                afternoon: {
                    attended: false,
                    timestamp: null,
                },
                evening: {
                    attended: false,
                    timestamp: null,
                },
            },
            confirmedBy: "",
            raffleIsRemoved: false,
            raffleIsWinner: false,
        });
        await event.save();
        res.json({ message: "Attendee added successfully" });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.addAttendeeController = addAttendeeController;
const getEventStatisticsController = async (req, res) => {
    try {
        const { eventId } = req.params;
        const event_id = new mongoose_1.Types.ObjectId(eventId);
        const event = await event_model_1.Event.findOne({ eventId: event_id });
        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }
        const salesData = event.sales_data;
        const totalRevenue = event.totalRevenueAll;
        const attendees = event.attendees;
        const totalAttendees = attendees.filter((attendee) => attendee.shirtPrice !== 0).length;
        const yearLevels = [1, 2, 3, 4].reduce((acc, year) => {
            const yearWord = ["First", "Second", "Third", "Fourth"][year - 1];
            acc[yearWord] = attendees.filter((attendee) => attendee.year === year && attendee.shirtPrice !== 0).length;
            return acc;
        }, {});
        const yearLevelsAttended = [1, 2, 3, 4].reduce((acc, year) => {
            const yearWord = ["First", "Second", "Third", "Fourth"][year - 1];
            acc[yearWord] = attendees.filter((attendee) => attendee.year === year && attendee.shirtPrice !== 0).length;
            return acc;
        }, {});
        const yearLevelsByCampus = [
            "UC-Main",
            "UC-Banilad",
            "UC-LM",
            "UC-PT",
            "UC-CS",
        ].map((campus) => {
            const campusWord = campus.split("-")[1];
            return {
                campus: campusWord,
                yearLevels: [1, 2, 3, 4].reduce((acc, year) => {
                    const yearWord = ["First", "Second", "Third", "Fourth"][year - 1];
                    acc[yearWord] = attendees.filter((attendee) => attendee.year === year &&
                        attendee.campus === campus &&
                        attendee.shirtPrice !== 0).length;
                    return acc;
                }, { First: 0, Second: 0, Third: 0, Fourth: 0 }),
            };
        });
        const campuses = [
            "UC-Main",
            "UC-Banilad",
            "UC-LM",
            "UC-PT",
            "UC-CS",
        ].reduce((acc, campus) => {
            const campusWord = campus.split("-")[1];
            acc[campusWord] = attendees.filter((attendee) => attendee.campus === campus && attendee.shirtPrice !== 0).length;
            return acc;
        }, {});
        const campusesAttended = [
            "UC-Main",
            "UC-Banilad",
            "UC-LM",
            "UC-PT",
            "UC-CS",
        ].reduce((acc, campus) => {
            const campusWord = campus.split("-")[1];
            acc[campusWord] = attendees.filter((attendee) => attendee.campus === campus && attendee.shirtPrice !== 0).length;
            return acc;
        }, {});
        const courses = ["BSIT", "BSCS"].reduce((acc, course) => {
            acc[course] = attendees.filter((attendee) => attendee.course === course && attendee.shirtPrice !== 0).length;
            return acc;
        }, {});
        res.status(200).json({
            yearLevels,
            campuses,
            courses,
            totalAttendees,
            yearLevelsByCampus,
            yearLevelsAttended,
            campusesAttended,
            totalRevenue,
            salesData,
        });
    }
    catch (error) {
        console.error("Error fetching statistics:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.getEventStatisticsController = getEventStatisticsController;
const removeEventController = async (req, res) => {
    try {
        const { eventId } = req.body;
        const eventDeleted = await event_model_1.Event.findOneAndDelete({ eventId });
        if (eventDeleted) {
            return res.status(200).json({ message: "Event Successfully Deleted" });
        }
    }
    catch (error) {
        console.error("Error Delete an Event", error);
    }
};
exports.removeEventController = removeEventController;
const removeAttendanceController = async (req, res) => {
    try {
        const { id_number, merchId } = req.body;
        const event = await event_model_1.Event.findOne({ eventId: merchId });
        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }
        const attendeeIndex = event.attendees.findIndex((a) => a.id_number === id_number);
        if (attendeeIndex === -1) {
            return res.status(404).json({ message: "Attendee not found" });
        }
        const { campus, shirtPrice } = event.attendees[attendeeIndex];
        if (shirtPrice !== 0) {
            const campusData = event.sales_data.find((s) => s.campus === campus);
            if (campusData) {
                campusData.unitsSold -= 1;
                campusData.totalRevenue -= shirtPrice;
                event.totalUnitsSold -= 1;
                event.totalRevenueAll -= shirtPrice;
                event.attendees.splice(attendeeIndex, 1);
            }
        }
        await event.save();
        res.json({ message: "Attendee removed successfully" });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.removeAttendanceController = removeAttendanceController;
