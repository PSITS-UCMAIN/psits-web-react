import { Request, Response, NextFunction } from "express";
import { EligibleCertificate } from "../models/eligibleCertificate.model";
import { Student } from "../models/student.model";
import { Attendee } from "../models/attendee.model";
import { Event } from "../models/event.model";
import { Types } from "mongoose";

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const findStudentByIdNumber = async (rawIdNumber: string) => {
  const normalized = String(rawIdNumber ?? "").trim().toLowerCase();
  const baseIdNumber = normalized.split("-")[0]?.trim() ?? "";

  // Try exact matches first against both possible fields (studentId and id_number)
  let student = await Student.findOne({ studentId: normalized });
  if (!student) {
    student = await Student.findOne({ id_number: normalized });
  }

  // If exact not found, try matching by base (digits before any dash)
  if (!student && baseIdNumber) {
    const regex = new RegExp(`^${escapeRegex(baseIdNumber)}(?:-.*)?$`, "i");
    student = await Student.findOne({ studentId: regex }) || (await Student.findOne({ id_number: regex }));
  }

  return student;
};

/**
 * Add one or multiple eligible certificates
 * Body: { eventId: string, attendeeIds: string[], createdBy?: string }
 */
export const addEligibleCertificates = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { eventId, attendeeIds, createdBy } = req.body;

    if (!eventId || !attendeeIds || !Array.isArray(attendeeIds)) {
      return res.status(400).json({
        success: false,
        message: "eventId and attendeeIds array are required",
      });
    }

    const results = {
      added: [] as string[],
      duplicates: [] as string[],
      errors: [] as { attendeeId: string; reason: string }[],
    };

    for (const attendeeId of attendeeIds) {
      try {
        // attendeeId may be either a Student._id (preferred) or an Event.attendees._id (embedded attendee id).
        if (!Types.ObjectId.isValid(attendeeId)) {
          results.errors.push({
            attendeeId,
            reason: "Invalid ObjectId format",
          });
          continue;
        }

        // Try finding a Student document by this id first
        let student = await Student.findById(attendeeId);
        let resolvedStudentId = null as null | typeof student;

        if (student) {
          resolvedStudentId = student;
        } else {
          // If not a Student._id, try to resolve it as an Event.attendees._id -> find attendee subdoc to get id_number
          const eventDoc = await Event.findOne(
            { _id: new Types.ObjectId(eventId), "attendees._id": new Types.ObjectId(attendeeId) },
            { "attendees.$": 1 }
          );

          if (eventDoc && eventDoc.attendees && eventDoc.attendees.length > 0) {
            const attendeeSub = (eventDoc.attendees as any)[0];
            const idNumber = attendeeSub.id_number;
            if (idNumber) {
              student = await findStudentByIdNumber(idNumber);
              if (student) resolvedStudentId = student;
            }
          }
        }

        if (!resolvedStudentId) {
          results.errors.push({
            attendeeId,
            reason: "Student not found",
          });
          continue;
        }

        const finalStudent = resolvedStudentId as any;
        const studentObjectId = finalStudent._id.toString();

        // Create eligible certificate record using the Student._id as attendeeId
        const eligibleCert = new EligibleCertificate({
          evaluationId: `${eventId}-${studentObjectId}`,
          eventId: new Types.ObjectId(eventId),
          attendeeId: new Types.ObjectId(studentObjectId),
          studentIdNumber: finalStudent.id_number,
          createdBy: createdBy || "admin",
        });

        await eligibleCert.save();
        results.added.push(studentObjectId);
      } catch (error: any) {
        if (error.code === 11000) {
          // Duplicate key error
          results.duplicates.push(attendeeId);
        } else {
          results.errors.push({
            attendeeId,
            reason: error.message || "Unknown error",
          });
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: `Added ${results.added.length} eligible certificates`,
      results,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove eligible certificates
 * Body: { eventId: string, attendeeIds: string[] }
 */
export const removeEligibleCertificates = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { eventId, attendeeIds } = req.body;

    if (!eventId || !attendeeIds || !Array.isArray(attendeeIds)) {
      return res.status(400).json({
        success: false,
        message: "eventId and attendeeIds array are required",
      });
    }

    // Resolve provided attendeeIds to Student._id values when possible.
    const resolvedStudentIds: any[] = [];
    const notFound: string[] = [];

    for (const id of attendeeIds) {
      if (!Types.ObjectId.isValid(id)) {
        notFound.push(id);
        continue;
      }
      // Try as Student._id first
      const student = await Student.findById(id);
      if (student) {
        resolvedStudentIds.push(student._id);
        continue;
      }

      // Otherwise try to find attendee subdoc in event and map by id_number
      const eventDoc = await Event.findOne(
        { _id: new Types.ObjectId(eventId), "attendees._id": new Types.ObjectId(id) },
        { "attendees.$": 1 }
      );
      if (eventDoc && eventDoc.attendees && eventDoc.attendees.length > 0) {
        const attendeeSub = (eventDoc.attendees as any)[0];
        const idNumber = attendeeSub.id_number;
        if (idNumber) {
          const studentByNum = await findStudentByIdNumber(idNumber);
          if (studentByNum) {
            resolvedStudentIds.push(studentByNum._id);
            continue;
          }
        }
      }

      notFound.push(id);
    }

    if (resolvedStudentIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: `Removed 0 eligible certificates`,
        deletedCount: 0,
        notFound,
      });
    }

    const objectIdAttendees = resolvedStudentIds.map((id) => new Types.ObjectId(id));
    const result = await EligibleCertificate.deleteMany({
      eventId: new Types.ObjectId(eventId),
      attendeeId: { $in: objectIdAttendees },
    });
    return res.status(200).json({
      success: true,
      message: `Removed ${result.deletedCount} eligible certificates`,
      deletedCount: result.deletedCount,
      notFound,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all eligible certificates for an event (with populated student data)
 * Params: eventId
 */
export const getEligibleCertificatesByEvent = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { eventId } = req.params;

    if (!eventId || !Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Valid eventId is required",
      });
    }

    const eligibleCerts = await EligibleCertificate.find({
      eventId: new Types.ObjectId(eventId),
    }).populate("attendeeId", "name email studentId");

    return res.status(200).json({
      success: true,
      count: eligibleCerts.length,
      data: eligibleCerts,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk check eligibility before adding
 * Body: { eventId: string, studentIdNumbers: string[] }
 * Returns: { valid: [], invalid: [], duplicates: [] }
 */
export const bulkCheckEligibility = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { eventId, studentIdNumbers } = req.body;

    if (
      !eventId ||
      !studentIdNumbers ||
      !Array.isArray(studentIdNumbers) ||
      studentIdNumbers.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "eventId and studentIdNumbers array are required",
      });
    }

    const results = {
      valid: [] as {
        studentId: string;
        attendeeId: string;
        name: string;
      }[],
      invalid: [] as { studentId: string; reason: string }[],
      duplicates: [] as { studentId: string; attendeeId: string }[],
    };

    // Helper to keep only digits from input (removes commas and other chars)
    const sanitizeStudentId = (s: unknown): string => String(s ?? "").replace(/\D/g, "").trim();

    for (const studentIdRaw of studentIdNumbers) {
      const studentId = sanitizeStudentId(studentIdRaw);
      if (!studentId) {
        results.invalid.push({
          studentId: String(studentIdRaw),
          reason: "Invalid student ID format",
        });
        continue;
      }

      try {
        // Find student by sanitized student ID number
        const student = await findStudentByIdNumber(studentId);
        if (!student) {
          results.invalid.push({
            studentId,
            reason: "Student ID not found in system",
          });
          continue;
        }

        // Check if student attended the event — attendees are embedded in Event.attendees
        const idNumberToMatch = String((student as any).id_number ?? "").trim();
        const attendee = await Event.findOne({
          _id: new Types.ObjectId(eventId),
          attendees: { $elemMatch: { id_number: new RegExp(`^${escapeRegex(idNumberToMatch)}$`, "i") } },
        });

        if (!attendee) {
          results.invalid.push({
            studentId,
            reason: "Student did not attend this event",
          });
          continue;
        }

        // Check if already eligible
        const existingEligible = await EligibleCertificate.findOne({
          eventId: new Types.ObjectId(eventId),
          attendeeId: student._id,
        });

        if (existingEligible) {
          results.duplicates.push({
            studentId,
            attendeeId: student._id.toString(),
          });
          continue;
        }

        // Valid student
        results.valid.push({
          studentId,
          attendeeId: student._id.toString(),
          name: (student as any).first_name + ' ' + (student as any).last_name,
        });
      } catch (error: any) {
        results.invalid.push({
          studentId,
          reason: error.message || "Unknown error",
        });
      }
    }

    return res.status(200).json({
      success: true,
      results,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Import eligible certificates from CSV
 * Body: FormData with 'file' field and 'eventId' field
 */
export const importEligibleCertificatesFromCSV = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const logPrefix = "[eligibleCertificate][csv-import]";
    const { eventId } = req.body;
    const file = req.file;

    if (!eventId) {
    return res.status(400).json({
      success: false,
      message: "eventId is required",
    });
    }

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "CSV file is required",
      });
    }


    // Parse CSV content
    const csvContent = file.buffer.toString("utf-8");
    const lines = csvContent.split(/\r?\n/).filter((line) => line.trim());

    // Extract and sanitize student ID numbers (allow optional suffix like -ucmn, -ucpt, -uclm, -ucb)
    const sanitizeStudentId = (s: string): string => {
      const raw = String(s ?? "").trim();
      if (!raw) return "";
      // remove surrounding quotes, whitespace and stray commas
      const cleaned = raw.replace(/^["'\s]+|["'\s]+$|,/g, "").trim();
      const m = cleaned.match(/^(\d+)(?:-([A-Za-z]+))?$/);
      if (!m) {
        // fallback: extract leading digits only
        const d = cleaned.match(/(\d+)/);
        return d ? d[1] : "";
      }
      const digits = m[1];
      const suffix = m[2] ? `-${m[2].toLowerCase()}` : "";
      // allow only known campus suffixes, otherwise drop suffix
      const allowed = new Set(["ucmn", "ucpt", "uclm", "ucb"]);
      return suffix && !allowed.has(m[2].toLowerCase()) ? digits : digits + suffix;
    };

    const studentIdNumbers = lines
      .map((line) => sanitizeStudentId(line))
      .filter(Boolean);


    if (studentIdNumbers.length === 0) {
      return res.status(400).json({
        success: false,
        message: "CSV file is empty or invalid",
      });
    }

    // Run bulk check validation
    const validationResults = {
      valid: [] as {
        studentId: string;
        attendeeId: string;
        name: string;
      }[],
      invalid: [] as { studentId: string; reason: string }[],
      duplicates: [] as { studentId: string; attendeeId: string }[],
    };

    for (const studentId of studentIdNumbers) {
      try {
        const student = await findStudentByIdNumber(studentId);
        if (!student) {

          validationResults.invalid.push({
            studentId,
            reason: "Student ID not found in system",
          });
          continue;
        }

        // Attendees are stored as subdocuments in Event.attendees; check there for a matching id_number
        const idNumberToMatch = String((student as any).id_number ?? "").trim();
        const attendee = await Event.findOne({
          _id: new Types.ObjectId(eventId),
          attendees: { $elemMatch: { id_number: new RegExp(`^${escapeRegex(idNumberToMatch)}$`, "i") } },
        });

        if (!attendee) {
          validationResults.invalid.push({
            studentId,
            reason: "Student did not attend this event",
          });
          continue;
        }

        const existingEligible = await EligibleCertificate.findOne({
          eventId: new Types.ObjectId(eventId),
          attendeeId: student._id,
        });

        if (existingEligible) {
          validationResults.duplicates.push({
            studentId,
            attendeeId: student._id.toString(),
          });
          continue;
        }

        validationResults.valid.push({
          studentId,
          attendeeId: student._id.toString(),
          name: (student as any).first_name + ' ' + (student as any).last_name,
        });
      } catch (error: any) {
        validationResults.invalid.push({
          studentId,
          reason: error.message || "Unknown error",
        });
      }
    }


    // Import valid students
    const importResults = {
      imported: 0,
      errors: [] as { studentId: string; reason: string }[],
    };

    for (const validStudent of validationResults.valid) {
      try {
        const eligibleCert = new EligibleCertificate({
          evaluationId: `${eventId}-${validStudent.attendeeId}`,
          eventId: new Types.ObjectId(eventId),
          attendeeId: new Types.ObjectId(validStudent.attendeeId),
          studentIdNumber: validStudent.studentId,
          createdBy: "csv-import",
        });

        await eligibleCert.save();
        importResults.imported++;
      } catch (error: any) {
        importResults.errors.push({
          studentId: validStudent.studentId,
          reason: error.message || "Failed to save",
        });
      }
    }


    return res.status(200).json({
      success: true,
      message: `Successfully imported ${importResults.imported} eligible certificates`,
      results: {
        imported: importResults.imported,
        invalid: validationResults.invalid,
        duplicates: validationResults.duplicates,
        errors: importResults.errors,
      },
    });
  } catch (error) {
    next(error);
  }
};
