import { Request, Response, NextFunction } from "express";
import { EligibleCertificate } from "../models/eligibleCertificate.model";
import { Student } from "../models/student.model";
import { Attendee } from "../models/attendee.model";
import { Types } from "mongoose";

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
        // Validate ObjectId format
        if (!Types.ObjectId.isValid(attendeeId)) {
          results.errors.push({
            attendeeId,
            reason: "Invalid ObjectId format",
          });
          continue;
        }

        // Get student details for denormalization
        const student = await Student.findById(attendeeId);
        if (!student) {
          results.errors.push({
            attendeeId,
            reason: "Student not found",
          });
          continue;
        }

        // Create eligible certificate record
        const eligibleCert = new EligibleCertificate({
          evaluationId: `${eventId}-${attendeeId}`,
          eventId: new Types.ObjectId(eventId),
          attendeeId: new Types.ObjectId(attendeeId),
          studentIdNumber: (student as any).id_number,
          createdBy: createdBy || "admin",
        });

        await eligibleCert.save();
        results.added.push(attendeeId);
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

    const objectIdAttendees = attendeeIds.map((id) => new Types.ObjectId(id));

    const result = await EligibleCertificate.deleteMany({
      eventId: new Types.ObjectId(eventId),
      attendeeId: { $in: objectIdAttendees },
    });

    return res.status(200).json({
      success: true,
      message: `Removed ${result.deletedCount} eligible certificates`,
      deletedCount: result.deletedCount,
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

    for (const studentId of studentIdNumbers) {
      try {
        // Find student by student ID number
        const student = await Student.findOne({ studentId: studentId.trim() });
        if (!student) {
          results.invalid.push({
            studentId,
            reason: "Student ID not found in system",
          });
          continue;
        }

        // Check if student attended the event
        const attendee = await Attendee.findOne({
          eventId: new Types.ObjectId(eventId),
          studentId: student._id,
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

    // Extract student ID numbers (assuming single column, no header)
    const studentIdNumbers = lines.map((line) => line.trim()).filter(Boolean);

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
        const student = await Student.findOne({ studentId: studentId.trim() });
        if (!student) {
          validationResults.invalid.push({
            studentId,
            reason: "Student ID not found in system",
          });
          continue;
        }

        const attendee = await Attendee.findOne({
          eventId: new Types.ObjectId(eventId),
          studentId: student._id,
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
