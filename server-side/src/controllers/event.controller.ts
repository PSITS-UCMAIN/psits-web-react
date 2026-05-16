import { Request, Response } from "express";
import { Event } from "../models/event.model";
import { Merch } from "../models/merch.model";
import mongoose, { Types } from "mongoose";
import { IEvent } from "../models/event.interface";
import { IAttendee } from "../models/attendee.interface";
import { Attendance } from "../models/attendance.model";
import {
  AttendanceError,
  hydrateEventsAttendance,
  markAttendance,
} from "../services/attendance.service";

export const createManualEventController = async (
  req: Request,
  res: Response
) => {
  try {
    const { name, eventDate, description, sessionConfig } = req.body;

    const imageUrl =
      (req.files as Express.MulterS3.File[] | undefined)?.map(
        (file) => file.location
      ) || [];

    let parsedSessionConfig;
    try {
      parsedSessionConfig =
        typeof sessionConfig === "string"
          ? JSON.parse(sessionConfig)
          : sessionConfig || {};
    } catch (error) {
      console.error("Error parsing sessionConfig:", error);
      return res.status(400).json({
        message: "Invalid session configuration format",
        error: error,
      });
    }

    const {
      isMorningEnabled = true,
      morningTime = "",
      isAfternoonEnabled = false,
      afternoonTime = "",
      isEveningEnabled = false,
      eveningTime = "",
    } = parsedSessionConfig;

    const hasValidSession =
      (isMorningEnabled && morningTime) ||
      (isAfternoonEnabled && afternoonTime) ||
      (isEveningEnabled && eveningTime);

    if (!hasValidSession) {
      return res.status(400).json({
        message: "At least one session must be enabled with a time range",
      });
    }

    // Helper: parse "HH:MM - HH:MM" into { start: Date, end: Date }
    const parseRange = (
      rangeStr: string,
      baseDate: Date,
      sessionName: string
    ) => {
      const [startStr, endStr] = rangeStr.split(" - ");
      const [sh, sm] = startStr.split(":").map(Number);
      const [eh, em] = endStr.split(":").map(Number);

      const start = new Date(baseDate);
      start.setHours(sh, sm, 0, 0);

      const end = new Date(baseDate);
      end.setHours(eh, em, 0, 0);

      if (end <= start) {
        throw new Error(
          `Invalid time range for ${sessionName} session: "To" time must be later than "From" time.`
        );
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

    const newEvent = new Event({
      eventId: new mongoose.Types.ObjectId(),
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
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(500).json({
      message: "Failed to create event",
      error: error,
    });
  }
};

export const getAllEventsController = async (req: Request, res: Response) => {
  try {
    const events: IEvent[] = await Event.find();
    if (!events) {
      res.status(400).json({ message: "No event found" });
    }
    return res.status(200).json({ data: events });
  } catch (error) {
    console.error(error);
  }
};

// GET an event and all of its attendees
export const getAllEventsAndAttendeesController = async (
  req: Request,
  res: Response
) => {
  const { id } = req.params;

  try {
    // Try to find the Event by its _id first (frontend should pass event._id)
    let eventDoc = await Event.findById(id).lean();

    // Defensive fallback: if not found, the client may have sent a different id (e.g., EligibleCertificate._id or event.eventId). Try to resolve.
    if (!eventDoc) {
      // If id looks like an ObjectId, try to resolve as EligibleCertificate._id -> derive eventId
      if (Types.ObjectId.isValid(id)) {
        try {
          const eligible = await (await import('../models/eligibleCertificate.model')).EligibleCertificate.findById(id).lean();
          if (eligible && eligible.eventId) {
            eventDoc = await Event.findById(eligible.eventId).lean();
          }
        } catch (e) {
          // ignore and proceed to next fallback
        }
      }
    }

    // Final fallback: maybe the client passed event.eventId (custom field). Try finding by eventId field.
    if (!eventDoc) {
      try {
        if (Types.ObjectId.isValid(id)) {
          eventDoc = await Event.findOne({ eventId: new Types.ObjectId(id) }).lean();
        }
      } catch (e) {
        // ignore
      }
    }

    if (!eventDoc) {
      return res.status(404).json({ message: "Event not found" });
    }

    // merchData references the merch by eventDoc.eventId (if present)
    let merchData = null;
    if (eventDoc.eventId) {
      try {
        merchData = await Merch.findById(eventDoc.eventId);
      } catch (e) {
        merchData = null;
      }
    }

    // hydrate attendance for a single event
    const hydratedEvents = await hydrateEventsAttendance([eventDoc]);

    return res.status(200).json({ data: hydratedEvents, merch_data: merchData ? merchData : {} });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching event attendees" });
  }
};

export const updateAttendancePerSessionController = async (
  req: Request,
  res: Response
) => {
  const { event_id, id_number } = req.params;
  const { campus, attendeeName, course, year } = req.body;

  try {
    const result = await markAttendance({
      eventId: event_id,
      attendeeIdNumber: id_number,
      attendeeName,
      campus,
      course: course || "Unknown",
      year: Number(year) || 1,
      confirmedByAdminName: req.admin.name,
    });

    res.status(200).json({
      message: `Attendance for ${result.session} successfully recorded`,
      session: result.session,
      data: result.attendee,
    });
  } catch (error) {
    if (error instanceof AttendanceError) {
      const status =
        error.code === "EVENT_NOT_FOUND" || error.code === "ATTENDEE_NOT_FOUND"
          ? 404
          : 400;
      return res.status(status).json({ message: error.message });
    }
    console.error("Error marking attendance:", error);
    res.status(500).json({
      message: "An error occurred while recording attendance",
      error: error,
    });
  }
};

export const checkLimitPerCampusController = async (
  req: Request,
  res: Response
) => {
  const { eventId } = req.params;

  const event_id = new Types.ObjectId(eventId);
  try {
    const event = await Event.findOne({ eventId: event_id });
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    res.status(200).json({ data: event });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateLimitSettingsController = async (
  req: Request,
  res: Response
) => {
  const { banilad, pt, lm, cs } = req.body;
  const event_id = new Types.ObjectId(req.params.eventId);

  try {
    const response = await Event.findOneAndUpdate(
      { eventId: event_id },
      {
        $set: {
          limit: [
            { campus: "UC-Banilad", limit: banilad },
            { campus: "UC-PT", limit: pt },
            { campus: "UC-LM", limit: lm },
            { campus: "UC-CS", limit: cs },
          ],
        },
      },
      { new: true }
    );

    if (!response) {
      return res.status(404).json({ message: "Event not found" });
    }

    res
      .status(200)
      .json({ message: "Settings updated successfully", data: response });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "An error occurred while updating settings" });
  }
};

export const getEligibleAttendeesRaffleController = async (
  req: Request,
  res: Response
) => {
  const { eventId } = req.params;

  try {
    const event_id = new Types.ObjectId(eventId);
    const event = await Event.findOne({ eventId: event_id });

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // Filter eligible attendees
    const eligibleAttendees = event.attendees.filter(
      (attendee) => !attendee.raffleIsWinner && !attendee.raffleIsRemoved
    );

    const winners = event.attendees.filter(
      (attendee) => attendee.raffleIsWinner
    );

    res.status(200).json({ attendees: eligibleAttendees, winners: winners });
  } catch (error) {
    console.error("Error fetching eligible attendees:", error);
    res
      .status(500)
      .json({ message: "An error occurred while fetching attendees" });
  }
};

export const setAttendeeAsRaffleWinnerController = async (
  req: Request,
  res: Response
) => {
  const { eventId, attendeeId } = req.params;
  const { attendeeName } = req.body;

  try {
    const event_id = new Types.ObjectId(eventId);
    const event = await Event.findOne({ eventId: event_id });

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const attendee = event.attendees.find(
      (att) => att.id_number === attendeeId && att.name === attendeeName
    );

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
  } catch (error) {
    console.error("Error marking attendee as raffle winner:", error);
    res.status(500).json({
      message: "An error occurred while marking the attendee as winner",
    });
  }
};

export const removeAttendeeInRaffleController = async (
  req: Request,
  res: Response
) => {
  const { eventId, attendeeId } = req.params;
  const { attendeeName } = req.body;

  try {
    const event_id = new Types.ObjectId(eventId);
    const event = await Event.findOne({ eventId: event_id });

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const attendee = event.attendees.find(
      (att: IAttendee) =>
        att.id_number === attendeeId && att.name === attendeeName
    );

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
  } catch (error) {
    console.error("Error removing attendee from raffle:", error);
    res.status(500).json({
      message: "An error occurred while removing the attendee from the raffle",
    });
  }
};

export const addAttendeeController = async (req: Request, res: Response) => {
  try {
    const {
      id_number,
      first_name,
      middle_name,
      last_name,
      course,
      year,
      campus,
      email,
      shirt_size,
      shirt_price,
      applied,
      admin,
      merchId,
    } = req.body;

    const event = await Event.findOne({ eventId: merchId });
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const campusData = event.sales_data.find((s) => s.campus === campus);
    if (!campusData) {
      return res.status(400).json({ message: "Invalid campus" });
    }

    // Check if id_number already exists
    const existingAttendee = event.attendees.find(
      (attendee) =>
        attendee.id_number === id_number && attendee.campus === campus
    );
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
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getEventStatisticsController = async (
  req: Request,
  res: Response
) => {
  try {
    const { eventId } = req.params;
    const event_id = new Types.ObjectId(eventId);
    const event = await Event.findOne({ eventId: event_id });
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const salesData = event.sales_data;

    const totalRevenue = event.totalRevenueAll;

    const attendees = event.attendees;

    const totalAttendees = attendees.filter(
      (attendee) => attendee.shirtPrice !== 0
    ).length;

    const yearLevels = [1, 2, 3, 4].reduce<Record<string, number>>(
      (acc, year) => {
        const yearWord = ["First", "Second", "Third", "Fourth"][year - 1];
        acc[yearWord] = attendees.filter(
          (attendee) => attendee.year === year && attendee.shirtPrice !== 0
        ).length;
        return acc;
      },
      {}
    );

    const yearLevelsAttended = [1, 2, 3, 4].reduce<Record<string, number>>(
      (acc, year) => {
        const yearWord = ["First", "Second", "Third", "Fourth"][year - 1];
        acc[yearWord] = attendees.filter(
          (attendee) => attendee.year === year && attendee.shirtPrice !== 0
        ).length;
        return acc;
      },
      {}
    );

    type YearLevels = {
      First: number;
      Second: number;
      Third: number;
      Fourth: number;
    };

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
        yearLevels: [1, 2, 3, 4].reduce<YearLevels>(
          (acc, year) => {
            const yearWord = ["First", "Second", "Third", "Fourth"][
              year - 1
            ] as keyof YearLevels;
            acc[yearWord] = attendees.filter(
              (attendee) =>
                attendee.year === year &&
                attendee.campus === campus &&
                attendee.shirtPrice !== 0
            ).length;
            return acc;
          },
          { First: 0, Second: 0, Third: 0, Fourth: 0 }
        ),
      };
    });

    const campuses = [
      "UC-Main",
      "UC-Banilad",
      "UC-LM",
      "UC-PT",
      "UC-CS",
    ].reduce<Record<string, number>>((acc, campus) => {
      const campusWord = campus.split("-")[1];
      acc[campusWord] = attendees.filter(
        (attendee) => attendee.campus === campus && attendee.shirtPrice !== 0
      ).length;
      return acc;
    }, {});

    const campusesAttended = [
      "UC-Main",
      "UC-Banilad",
      "UC-LM",
      "UC-PT",
      "UC-CS",
    ].reduce<Record<string, number>>((acc, campus) => {
      const campusWord = campus.split("-")[1];
      acc[campusWord] = attendees.filter(
        (attendee) => attendee.campus === campus && attendee.shirtPrice !== 0
      ).length;
      return acc;
    }, {});

    const courses = ["BSIT", "BSCS"].reduce<Record<string, number>>(
      (acc, course) => {
        acc[course] = attendees.filter(
          (attendee) => attendee.course === course && attendee.shirtPrice !== 0
        ).length;
        return acc;
      },
      {}
    );

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
  } catch (error) {
    console.error("Error fetching statistics:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const removeEventController = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();

  try {
    const { eventId } = req.body;
    session.startTransaction();

    const eventDeleted = await Event.findOneAndDelete({ eventId }).session(
      session
    );
    if (eventDeleted) {
      await Attendance.deleteMany({ event: eventDeleted._id }).session(session);
      await session.commitTransaction();
      session.endSession();
      return res.status(200).json({ message: "Event Successfully Deleted" });
    }
    await session.abortTransaction();
    session.endSession();
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    console.error("Error Delete an Event", error);
  }
};

export const removeAttendanceController = async (
  req: Request,
  res: Response
) => {
  const session = await mongoose.startSession();

  try {
    const { id_number, merchId } = req.body;
    session.startTransaction();

    const event = await Event.findOne({ eventId: merchId }).session(session);
    if (!event) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Event not found" });
    }

    const attendeeIndex = event.attendees.findIndex(
      (a) => a.id_number === id_number
    );
    if (attendeeIndex === -1) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Attendee not found" });
    }

    const { campus, shirtPrice, _id } = event.attendees[
      attendeeIndex
    ] as IAttendee & { _id?: Types.ObjectId };
    let removedAttendanceRef: Types.ObjectId | null = null;

    if (shirtPrice !== 0) {
      const campusData = event.sales_data.find((s) => s.campus === campus);

      if (campusData) {
        campusData.unitsSold -= 1;
        campusData.totalRevenue -= shirtPrice;
        event.totalUnitsSold -= 1;
        event.totalRevenueAll -= shirtPrice;
        event.attendees.splice(attendeeIndex, 1);
        removedAttendanceRef = _id ?? null;
      }
    }
    await event.save({ session });
    if (removedAttendanceRef) {
      await Attendance.deleteOne({
        event: event._id,
        attendeeRef: removedAttendanceRef,
      }).session(session);
    }
    await session.commitTransaction();
    session.endSession();

    res.json({ message: "Attendee removed successfully" });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
