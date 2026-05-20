import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import {
  getEligibleCertificatesForStudent,
  generateCertificate,
} from "../../src/controllers/certificate.controller";

// Mock Mongoose models
vi.mock("../../src/models/eligibleCertificate.model", () => ({
  EligibleCertificate: {
    find: vi.fn(),
    findOne: vi.fn(),
  },
}));

vi.mock("../../src/models/student.model", () => ({
  Student: {
    findById: vi.fn(),
  },
}));

vi.mock("../../src/models/event.model", () => ({
  Event: {},
}));

vi.mock("../../src/mail_template/utils/generate-pdf-from-ejs", () => ({
  generatePDFFromEJS: vi.fn(),
}));

import { EligibleCertificate } from "../../src/models/eligibleCertificate.model";
import { Student } from "../../src/models/student.model";
import { generatePDFFromEJS } from "../../src/mail_template/utils/generate-pdf-from-ejs";

const mockedEligibleCertificateFind = vi.mocked(EligibleCertificate.find);
const mockedEligibleCertificateFindOne = vi.mocked(
  EligibleCertificate.findOne
);
const mockedStudentFindById = vi.mocked(Student.findById);
const mockedGeneratePDFFromEJS = vi.mocked(generatePDFFromEJS);

describe("Certificate controller (student endpoints)", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
  });

  describe("getEligibleCertificatesForStudent", () => {
    it("returns 401 when no student ID is in request", async () => {
      mockReq = { userV2: {} };

      await getEligibleCertificatesForStudent(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "Authentication required",
      });
    });

    it("returns eligible certificates for authenticated student", async () => {
      const studentId = new Types.ObjectId().toString();
      mockReq = { userV2: { sub: studentId, idNumber: "2024-0001" } };

      const mockCerts = [
        {
          _id: "cert1",
          evaluationId: "evt1-stud1",
          eventId: "evt1",
          attendeeId: studentId,
        },
      ];

      mockedEligibleCertificateFind.mockReturnValue({
        populate: vi.fn().mockResolvedValue(mockCerts),
      } as any);

      await getEligibleCertificatesForStudent(mockReq, mockRes, mockNext);

      expect(mockedEligibleCertificateFind).toHaveBeenCalledWith({
        attendeeId: expect.any(Types.ObjectId),
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        count: 1,
        studentIdNumber: "2024-0001",
        data: mockCerts,
      });
    });

    it("returns empty array when no eligible certificates exist", async () => {
      const studentId = new Types.ObjectId().toString();
      mockReq = { userV2: { sub: studentId, idNumber: "2024-0001" } };

      mockedEligibleCertificateFind.mockReturnValue({
        populate: vi.fn().mockResolvedValue([]),
      } as any);

      await getEligibleCertificatesForStudent(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        count: 0,
        studentIdNumber: "2024-0001",
        data: [],
      });
    });

    it("calls next with error on exception", async () => {
      const studentId = new Types.ObjectId().toString();
      mockReq = { userV2: { sub: studentId } };
      const testError = new Error("Database error");

      mockedEligibleCertificateFind.mockReturnValue({
        populate: vi.fn().mockRejectedValue(testError),
      } as any);

      await getEligibleCertificatesForStudent(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(testError);
    });
  });

  describe("generateCertificate", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("returns 401 when no student ID is in request", async () => {
      mockReq = { userV2: {}, body: { eventId: "abc" } };

      await generateCertificate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "Authentication required",
      });
    });

    it("returns 400 when eventId is missing", async () => {
      mockReq = { userV2: { sub: "student1" }, body: {} };

      await generateCertificate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "Valid eventId is required",
      });
    });

    it("returns 400 when eventId is invalid ObjectId", async () => {
      mockReq = {
        userV2: { sub: "student1" },
        body: { eventId: "not-valid" },
      };

      await generateCertificate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it("returns 429 when cooldown is active", async () => {
      vi.advanceTimersByTime(1000);

      const validStudentId = new Types.ObjectId().toString();
      const validEventId = new Types.ObjectId().toString();

      mockReq = {
        userV2: { sub: validStudentId },
        body: { eventId: validEventId },
      };

      // First call succeeds
      mockedEligibleCertificateFindOne.mockResolvedValueOnce({
        _id: "elig1",
        eventId: validEventId,
        attendeeId: validStudentId,
      });
      mockedStudentFindById.mockResolvedValueOnce({
        _id: validStudentId,
        first_name: "Test",
        last_name: "Student",
      });
      mockedGeneratePDFFromEJS.mockResolvedValueOnce(Buffer.from("pdf"));

      await generateCertificate(mockReq, mockRes, mockNext);

      // First call should send PDF (res.send is called, not res.status(200))
      expect(mockRes.send).toHaveBeenCalled();

      // Second call should hit cooldown
      mockRes.status.mockClear();
      mockRes.json.mockClear();
      mockRes.setHeader.mockClear();
      mockRes.send.mockClear();

      await generateCertificate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: "Too many requests",
        })
      );
    });

    it("returns 403 when student is not eligible", async () => {
      const validStudentId = new Types.ObjectId().toString();
      const validEventId = new Types.ObjectId().toString();

      mockReq = {
        userV2: { sub: validStudentId },
        body: { eventId: validEventId },
      };

      mockedEligibleCertificateFindOne.mockResolvedValueOnce(null);

      await generateCertificate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message:
          "You are not eligible for a certificate for this event",
      });
    });

    it("returns 404 when student is not found", async () => {
      const validStudentId = new Types.ObjectId().toString();
      const validEventId = new Types.ObjectId().toString();

      mockReq = {
        userV2: { sub: validStudentId },
        body: { eventId: validEventId },
      };

      mockedEligibleCertificateFindOne.mockResolvedValueOnce({
        _id: "elig1",
      });
      mockedStudentFindById.mockResolvedValueOnce(null);

      await generateCertificate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "Student not found",
      });
    });

    it("generates and sends PDF on success", async () => {
      const validStudentId = new Types.ObjectId().toString();
      const validEventId = new Types.ObjectId().toString();

      mockReq = {
        userV2: { sub: validStudentId },
        body: { eventId: validEventId },
      };

      mockedEligibleCertificateFindOne.mockResolvedValueOnce({
        _id: "elig1",
      });
      mockedStudentFindById.mockResolvedValueOnce({
        _id: validStudentId,
        first_name: "Test",
        last_name: "Student",
      });
      mockedGeneratePDFFromEJS.mockResolvedValueOnce(
        Buffer.from("pdf-content")
      );

      await generateCertificate(mockReq, mockRes, mockNext);

      expect(mockedGeneratePDFFromEJS).toHaveBeenCalledWith(
        "ejs/pdf-ejs/certificate.ejs",
        expect.objectContaining({
          student_name: "Test Student",
          event_name: "12th UC CCS ICT Congress 2026",
        })
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "Content-Type",
        "application/pdf"
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        "Content-Disposition",
        expect.stringContaining("Test_Student_ICT_Congress_2026_Certificate.pdf")
      );
      expect(mockRes.send).toHaveBeenCalled();
    });

    it("calls next with error on exception", async () => {
      const validStudentId = new Types.ObjectId().toString();
      const validEventId = new Types.ObjectId().toString();

      mockReq = {
        userV2: { sub: validStudentId },
        body: { eventId: validEventId },
      };
      const testError = new Error("PDF generation failed");

      mockedEligibleCertificateFindOne.mockRejectedValueOnce(testError);

      await generateCertificate(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(testError);
    });
  });
});
