import mongoose from "mongoose";
import { Event } from "../models/event.model";
import { Student } from "../models/student.model";
import { hydrateAttendeesAttendance } from "./attendance.service";
import { campus_type } from "../enums/campus.enums";

export class EventV2Service {
  /**
   * Fetch all raw events with certificate and key details.
   */
  static async getAllEventsRaw() {
    return await Event.find(
      {},
      "eventId eventName eventImage eventDate eventDescription isGenerateCertificate eligibleStudentsForCertificate eventVenue eventTheme eventVenueSpecific eventStartTime eventEndTime -_id"
    ).lean();
  }

  /**
   * Update details of an existing event.
   */
  static async updateEvent(eventId: string, updateFields: any) {
    const updatedEvent = await Event.findOneAndUpdate(
      { eventId },
      { $set: updateFields },
      { new: true, runValidators: true }
    );
    return updatedEvent;
  }

  /**
   * Business logic for getting event attendees.
   */
  static async getEventAttendees(eventId: string) {
    const query = mongoose.isValidObjectId(eventId)
      ? {
          $or: [
            { _id: new mongoose.Types.ObjectId(eventId) },
            { eventId: eventId },
          ],
        }
      : { eventId: eventId };
    const event = await Event.findOne(query).select("_id attendees eventId").lean();

    if (!event) {
      throw new Error("Event not found");
    }

    const attendeeList = Array.isArray(event.attendees)
      ? event.attendees
      : [];

    const hydratedAttendees = await hydrateAttendeesAttendance(
      event._id,
      attendeeList as any
    );

    return hydratedAttendees;
  }

  /**
   * Add a student as an attendee to an event.
   */
  static async addAttendee(
    eventId: string,
    idNumber: string
  ): Promise<{ message: string; event_id: string; id_number: string }> {
    const query = mongoose.isValidObjectId(eventId)
      ? {
          $or: [
            { _id: new mongoose.Types.ObjectId(eventId) },
            { eventId: eventId },
          ],
        }
      : { eventId };
    const event = await Event.findOne(query);
    if (!event) {
      throw new Error("Event not found");
    }
    const attendees = event.attendees as Array<{ id_number: string }>;
    const existing = attendees.find((a) => a.id_number === idNumber);
    if (existing) {
      return { message: "Attendee already registered", event_id: eventId, id_number: idNumber };
    }
    const student = await Student.findOne({ id_number: idNumber });
    const attendeeData = student
      ? {
          id_number: student.id_number,
          name: `${student.first_name} ${student.last_name}`,
          course: student.course,
          year: student.year,
          campus: student.campus ?? "",
        }
      : {
          id_number: idNumber,
          name: "Unknown",
          course: "Unknown",
          year: 0,
          campus: "Unknown",
        };
    (event.attendees as unknown as Array<Record<string, unknown>>).push(
      attendeeData
    );
    await event.save();
    return { message: "Attendee added", event_id: eventId, id_number: idNumber };
  }

  /**
   * Remove a student from an event by id_number.
   */
  static async removeAttendee(
    eventId: string,
    idNumber: string
  ): Promise<{ message: string; event_id: string; id_number: string }> {
    const event = await Event.findById(new mongoose.Types.ObjectId(eventId));
    if (!event) {
      throw new Error("Event not found");
    }
    const attendees = event.attendees as unknown as Array<Record<string, unknown>>;
    const idx = attendees.findIndex(
      (a) => (a as { id_number: string }).id_number === idNumber
    );
    if (idx === -1) {
      throw new Error("Attendee not found in event");
    }
    attendees.splice(idx, 1);
    await event.save();
    return { message: "Attendee removed", event_id: eventId, id_number: idNumber };
  }
}
