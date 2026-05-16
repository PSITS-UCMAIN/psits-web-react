import { describe, it, expect, vi, beforeEach } from "vitest";
import { Types } from "mongoose";
import {
  addEligibleCertificates,
  removeEligibleCertificates,
  getEligibleCertificatesByEvent,
  bulkCheckEligibility,
  importEligibleCertificatesFromCSV,
} from "../../src/controllers/eligibleCertificate.controller";

// Mock Mongoose models - EligibleCertificate must be a vi.fn() constructor
// because the controller does `new EligibleCertificate({...})`
const mockSave = vi.fn();
const mockEligibleCertificateConstructor = vi.fn(() => ({
  save: mockSave,
})) as any;

mockEligibleCertificateConstructor.find = vi.fn();
mockEligibleCertificateConstructor.findOne = vi.fn();
mockEligibleCertificateConstructor.deleteMany = vi.fn();

vi.mock("../../src/models/eligibleCertificate.model", () => ({
  EligibleCertificate: mockEligibleCertificateConstructor,
}));

vi.mock("../../src/models/student.model", () => ({
  Student: {
    findById: vi.fn(),
    findOne: vi.fn(),
  },
}));

vi.mock("../../src/models/attendee.model", () => ({
  Attendee: {
    findOne: vi.fn(),
  },
}));

const mockedEligibleCertificateFind = vi.mocked(
  mockEligibleCertificateConstructor.find
);
const mockedEligibleCertificateFindOne = vi.mocked(
  mockEligibleCertificateConstructor.findOne
);
const mockedEligibleCertificateDeleteMany = vi.mocked(
  mockEligibleCertificateConstructor.deleteMany
);
import { Student } from "../../src/models/student.model";
import { Attendee } from "../../src/models/attendee.model";

const mockedStudent = vi.mocked(Student);
const mockedAttendee = vi.mocked(Attendee);

describe("EligibleCertificate controller (admin endpoints)", () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: any;

  beforeEach(() => {
    vi.clearAllMocks();
    // Re-apply default implementations since vi.clearAllMocks() clears them
    mockEligibleCertificateConstructor.mockImplementation(() => ({
      save: vi.fn(),
    }));

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
  });

  describe("addEligibleCertificates", () => {
    it("returns 400 when eventId or attendeeIds is missing", async () => {
      mockReq = { body: {} };

      await addEligibleCertificates(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "eventId and attendeeIds array are required",
      });
    });

    it("returns 400 when attendeeIds is not an array", async () => {
      mockReq = { body: { eventId: "evt1", attendeeIds: "not-array" } };

      await addEligibleCertificates(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it("skips invalid ObjectIds and reports errors", async () => {
      mockReq = {
        body: {
          eventId: new Types.ObjectId().toString(),
          attendeeIds: ["invalid-id", new Types.ObjectId().toString()],
        },
      };

      mockedStudent.findById.mockResolvedValue(null);

      await addEligibleCertificates(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          results: expect.objectContaining({
            errors: expect.arrayContaining([
              expect.objectContaining({
                attendeeId: "invalid-id",
                reason: "Invalid ObjectId format",
              }),
            ]),
          }),
        })
      );
    });

    it("skips students not found in database", async () => {
      const validId = new Types.ObjectId().toString();
      mockReq = {
        body: {
          eventId: new Types.ObjectId().toString(),
          attendeeIds: [validId],
          createdBy: "admin",
        },
      };

      mockedStudent.findById.mockResolvedValue(null);

      await addEligibleCertificates(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          results: expect.objectContaining({
            errors: expect.arrayContaining([
              expect.objectContaining({
                attendeeId: validId,
                reason: "Student not found",
              }),
            ]),
          }),
        })
      );
    });

    it("adds eligible certificate for valid student", async () => {
      const validId = new Types.ObjectId().toString();
      const eventId = new Types.ObjectId().toString();
      mockReq = {
        body: {
          eventId,
          attendeeIds: [validId],
          createdBy: "admin",
        },
      };

      mockedStudent.findById.mockResolvedValue({
        _id: validId,
        studentId: "2024-0001",
        name: "Test Student",
      } as any);

      const testSave = vi.fn().mockResolvedValue({ _id: "new-cert" });
      mockEligibleCertificateConstructor.mockImplementationOnce(() => ({
        save: testSave,
      }));

      await addEligibleCertificates(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          results: expect.objectContaining({
            added: [validId],
          }),
        })
      );
    });

    it("handles duplicate key errors gracefully", async () => {
      const validId = new Types.ObjectId().toString();
      mockReq = {
        body: {
          eventId: new Types.ObjectId().toString(),
          attendeeIds: [validId],
        },
      };

      mockedStudent.findById.mockResolvedValue({
        _id: validId,
        studentId: "2024-0001",
      } as any);

      const duplicateError = new Error("Duplicate key") as any;
      duplicateError.code = 11000;

      const errorSave = vi.fn().mockRejectedValue(duplicateError);
      mockEligibleCertificateConstructor.mockImplementationOnce(() => ({
        save: errorSave,
      }));

      await addEligibleCertificates(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          results: expect.objectContaining({
            duplicates: [validId],
          }),
        })
      );
    });

    it("calls next with error on exception", async () => {
      mockReq = {
        body: {
          eventId: new Types.ObjectId().toString(),
          attendeeIds: [new Types.ObjectId().toString()],
        },
      };
      const testError = new Error("Database error");

      mockedStudent.findById.mockRejectedValue(testError);

      await addEligibleCertificates(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(testError);
    });
  });

  describe("removeEligibleCertificates", () => {
    it("returns 400 when eventId or attendeeIds is missing", async () => {
      mockReq = { body: {} };

      await removeEligibleCertificates(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it("deletes eligible certificates and returns deleted count", async () => {
      const eventId = new Types.ObjectId().toString();
      const attendeeId = new Types.ObjectId().toString();
      mockReq = {
        body: { eventId, attendeeIds: [attendeeId] },
      };

      mockedEligibleCertificateDeleteMany.mockResolvedValue({
        deletedCount: 1,
      } as any);

      await removeEligibleCertificates(mockReq, mockRes, mockNext);

      expect(mockedEligibleCertificateDeleteMany).toHaveBeenCalledWith({
        eventId: expect.any(Types.ObjectId),
        attendeeId: { $in: [expect.any(Types.ObjectId)] },
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: "Removed 1 eligible certificates",
        deletedCount: 1,
      });
    });

    it("returns zero count when nothing deleted", async () => {
      mockReq = {
        body: {
          eventId: new Types.ObjectId().toString(),
          attendeeIds: [new Types.ObjectId().toString()],
        },
      };

      mockedEligibleCertificateDeleteMany.mockResolvedValue({
        deletedCount: 0,
      } as any);

      await removeEligibleCertificates(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ deletedCount: 0 })
      );
    });
  });

  describe("getEligibleCertificatesByEvent", () => {
    it("returns 400 when eventId is missing or invalid", async () => {
      mockReq = { params: {} };

      await getEligibleCertificatesByEvent(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);

      mockReq = { params: { eventId: "invalid" } };

      await getEligibleCertificatesByEvent(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it("populates attendee data and returns results", async () => {
      const eventId = new Types.ObjectId().toString();
      mockReq = { params: { eventId } };

      const mockCerts = [
        {
          _id: "cert1",
          eventId,
          attendeeId: { name: "Test", email: "test@test.com" },
        },
      ];

      mockedEligibleCertificateFind.mockReturnValue({
        populate: vi.fn().mockResolvedValue(mockCerts),
      } as any);

      await getEligibleCertificatesByEvent(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        count: 1,
        data: mockCerts,
      });
    });

    it("returns empty array when no certificates found", async () => {
      mockReq = {
        params: { eventId: new Types.ObjectId().toString() },
      };

      mockedEligibleCertificateFind.mockReturnValue({
        populate: vi.fn().mockResolvedValue([]),
      } as any);

      await getEligibleCertificatesByEvent(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        count: 0,
        data: [],
      });
    });
  });

  describe("bulkCheckEligibility", () => {
    it("returns 400 when required fields are missing", async () => {
      mockReq = { body: {} };

      await bulkCheckEligibility(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);

      mockReq = { body: { eventId: "evt1", studentIdNumbers: [] } };

      await bulkCheckEligibility(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it("marks students not found in system as invalid", async () => {
      mockReq = {
        body: {
          eventId: new Types.ObjectId().toString(),
          studentIdNumbers: ["2024-9999"],
        },
      };

      mockedStudent.findOne.mockResolvedValue(null);

      await bulkCheckEligibility(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          results: expect.objectContaining({
            invalid: [
              {
                studentId: "2024-9999",
                reason: "Student ID not found in system",
              },
            ],
          }),
        })
      );
    });

    it("marks students who did not attend as invalid", async () => {
      const eventId = new Types.ObjectId().toString();
      mockReq = {
        body: { eventId, studentIdNumbers: ["2024-0001"] },
      };

      mockedStudent.findOne.mockResolvedValue({
        _id: "student1",
        studentId: "2024-0001",
        name: "Test Student",
      } as any);
      mockedAttendee.findOne.mockResolvedValue(null);

      await bulkCheckEligibility(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          results: expect.objectContaining({
            invalid: [
              {
                studentId: "2024-0001",
                reason: "Student did not attend this event",
              },
            ],
          }),
        })
      );
    });

    it("marks students already eligible as duplicates", async () => {
      const eventId = new Types.ObjectId().toString();
      mockReq = {
        body: { eventId, studentIdNumbers: ["2024-0001"] },
      };

      mockedStudent.findOne.mockResolvedValue({
        _id: "student1",
        studentId: "2024-0001",
        name: "Test Student",
      } as any);
      mockedAttendee.findOne.mockResolvedValue({
        _id: "attendee1",
      } as any);
      mockedEligibleCertificateFindOne.mockResolvedValue({
        _id: "existing-cert",
      } as any);

      await bulkCheckEligibility(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          results: expect.objectContaining({
            duplicates: [
              {
                studentId: "2024-0001",
                attendeeId: "student1",
              },
            ],
          }),
        })
      );
    });

    it("marks valid students as valid", async () => {
      const eventId = new Types.ObjectId().toString();
      mockReq = {
        body: { eventId, studentIdNumbers: ["2024-0001"] },
      };

      mockedStudent.findOne.mockResolvedValue({
        _id: "student1",
        studentId: "2024-0001",
        name: "Test Student",
      } as any);
      mockedAttendee.findOne.mockResolvedValue({
        _id: "attendee1",
      } as any);
      mockedEligibleCertificateFindOne.mockResolvedValue(null);

      await bulkCheckEligibility(mockReq, mockRes, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          results: expect.objectContaining({
            valid: [
              {
                studentId: "2024-0001",
                attendeeId: "student1",
                name: "Test Student",
              },
            ],
          }),
        })
      );
    });
  });

  describe("importEligibleCertificatesFromCSV", () => {
    it("returns 400 when eventId is missing", async () => {
      mockReq = { body: {}, file: { buffer: Buffer.from("data") } };

      await importEligibleCertificatesFromCSV(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "eventId is required",
      });
    });

    it("returns 400 when no file is provided", async () => {
      mockReq = {
        body: { eventId: new Types.ObjectId().toString() },
        file: null,
      };

      await importEligibleCertificatesFromCSV(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "CSV file is required",
      });
    });

    it("returns 400 when CSV file is empty", async () => {
      mockReq = {
        body: { eventId: new Types.ObjectId().toString() },
        file: { buffer: Buffer.from("") },
      };

      await importEligibleCertificatesFromCSV(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: "CSV file is empty or invalid",
      });
    });

    it("parses CSV and validates each student ID", async () => {
      const eventId = new Types.ObjectId().toString();
      mockReq = {
        body: { eventId },
        file: {
          buffer: Buffer.from("2024-0001\n2024-0002"),
        },
      };

      mockedStudent.findOne
        .mockResolvedValueOnce({
          _id: "student1",
          studentId: "2024-0001",
          name: "Student One",
        } as any)
        .mockResolvedValueOnce({
          _id: "student2",
          studentId: "2024-0002",
          name: "Student Two",
        } as any);

      mockedAttendee.findOne.mockResolvedValue({
        _id: "attendee1",
      } as any);
      mockedEligibleCertificateFindOne.mockResolvedValue(null);

      await importEligibleCertificatesFromCSV(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });
});
