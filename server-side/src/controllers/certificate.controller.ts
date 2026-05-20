import { Request, Response, NextFunction } from "express";
import { EligibleCertificate } from "../models/eligibleCertificate.model";
import { Student } from "../models/student.model";
import { Event } from "../models/event.model";
import { Types } from "mongoose";
import { generatePDFFromEJS } from "../mail_template/utils/generate-pdf-from-ejs";
import { TCertificateData } from "../mail_template/mail.interface";

// In-memory cooldown store: Map<studentId, timestamp>
const cooldownStore = new Map<string, number>();
const COOLDOWN_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
const CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minutes in milliseconds

// Cleanup old entries periodically to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  const cutoff = now - CLEANUP_INTERVAL;

  for (const [studentId, timestamp] of cooldownStore.entries()) {
    if (timestamp < cutoff) {
      cooldownStore.delete(studentId);
    }
  }
}, CLEANUP_INTERVAL);

/**
 * Get all eligible certificates for authenticated student
 * GET /api/certificates/eligible
 * Requires student authentication
 * Also returns the student's id_number as `studentIdNumber`
 */
export const getEligibleCertificatesForStudent = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Read student identity from authV2 middleware (req.userV2)
    const studentId = (req as any).userV2?.sub;
    const studentIdNumber = (req as any).userV2?.idNumber || null;

    if (!studentId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Fetch all eligible certificates for this student
    const eligibleCerts = await EligibleCertificate.find({
      attendeeId: new Types.ObjectId(studentId),
    }).populate("eventId", "name date venue");

    return res.status(200).json({
      success: true,
      count: eligibleCerts.length,
      studentIdNumber,
      data: eligibleCerts,
    });
  } catch (error) {
    console.error("Error fetching eligible certificates:", error);
    next(error);
  }
};

/**
 * Generate certificate for authenticated student
 * POST /api/certificates/generate
 * Body: { eventId: string }
 * Requires student authentication
 */
export const generateCertificate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Extract student ID from authV2 middleware (req.userV2)
    const studentId = (req as any).userV2?.sub;

    if (!studentId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { eventId } = req.body;

    if (!eventId || !Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Valid eventId is required",
      });
    }

    // Check cooldown
    const studentIdStr = studentId.toString();
    const lastGeneration = cooldownStore.get(studentIdStr);
    const now = Date.now();

    if (lastGeneration) {
      const timeSinceLastGeneration = now - lastGeneration;
      if (timeSinceLastGeneration < COOLDOWN_DURATION) {
        const remainingTime = Math.ceil(
          (COOLDOWN_DURATION - timeSinceLastGeneration) / 1000
        );
        return res.status(429).json({
          success: false,
          error: "Too many requests",
          message: "Please wait before generating another certificate",
          retryAfter: remainingTime,
        });
      }
    }

    // Check if student is eligible for certificate
    const eligibleCert = await EligibleCertificate.findOne({
      eventId: new Types.ObjectId(eventId),
      attendeeId: new Types.ObjectId(studentId),
    });

    if (!eligibleCert) {
      return res.status(403).json({
        success: false,
        message: "You are not eligible for a certificate for this event",
      });
    }

    // Fetch student details
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Construct certificate data with hardcoded ICT Congress 2026 details
    // TODO: Future enhancement - Make this generic by pulling event details from database
    // This implementation is ICT Congress 2026-specific as per initial requirements
    const certificateData: TCertificateData = {
      student_name: (student as any).first_name + ' ' + (student as any).last_name,
      event_name: "12th UC CCS ICT Congress 2026",
      event_theme:
        "Innovating the Future: Empowering Society Through Intelligent Technologies",
      event_date: "April 22, 2026",
      event_start_time: "12:00 PM",
      event_end_time: "6:00 PM",
      event_venue_specific: "New Cebu Coliseum",
      event_venue: "Sanciangko St., Cebu City",
      images: {
        main_logo: "images/etc/top-logos.png",
        bottom_logos: "images/logos/logos-bottom.png",
        esig_basabe: "images/etc/neil_basabbe-removebg-preview.png",
        esig_tanquis: "images/etc/janette_tanquis-removebg-preview.png",
        esig_ortega: "images/etc/eric_ortega-removebg-preview.png",
        esig_petalver: "images/etc/carlo_petalver-removebg-preview.png",
      },
      fonts: {
        alexbrush: "ejs/fonts/AlexBrush-Regular.ttf",
        cinzel: "ejs/fonts/Cinzel-VariableFont_wght.ttf",
        montserrat: "ejs/fonts/Montserrat-VariableFont_wght.ttf",
      },
      signees: [
        {
          name: "Neil A. Basabe, MIT",
          designation: "Dean, UC-Main College of Computer Studies",
          e_sig: "esig_basabe",
        },
        {
          name: "Dr. Janette Tanquis",
          designation: "Dean, UC-LM College of Computer Studies",
          e_sig: "esig_tanquis",
        },
        {
          name: "Eric Ortega",
          designation: "Dean, UC-Banilad College of Computer Studies",
          e_sig: "esig_ortega",
        },
        {
          name: "Carlo D. Petalver, MIT",
          designation: "Dean, UC-PT College of Computer Studies",
          e_sig: "esig_petalver",
        },
      ],
    };

    // Generate PDF
    const pdfBuffer = await generatePDFFromEJS(
      "ejs/pdf-ejs/certificate.ejs",
      certificateData
    );

    // Update cooldown timestamp
    cooldownStore.set(studentIdStr, now);

    // Generate filename
    const fileName = ((student as any).first_name + ' ' + (student as any).last_name).replace(/\s+/g, '_') + '_ICT_Congress_2026_Certificate.pdf';

    // Send PDF as downloadable file
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Length", pdfBuffer.length);

    return res.send(Buffer.from(pdfBuffer));
  } catch (error) {
    console.error("Error generating certificate:", error);
    next(error);
  }
};
