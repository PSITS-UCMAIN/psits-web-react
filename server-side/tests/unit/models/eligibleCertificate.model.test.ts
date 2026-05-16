import mongoose from "mongoose";
import { EligibleCertificate } from "../../../src/models/eligibleCertificate.model";
import {
  clearTestDatabase,
  connectTestDatabase,
  disconnectTestDatabase,
} from "../../utils/mongoTestServer";

describe("EligibleCertificate model", () => {
  beforeAll(async () => {
    await connectTestDatabase();
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  const validCertData = {
    evaluationId: "event123-student456",
    eventId: new mongoose.Types.ObjectId(),
    attendeeId: new mongoose.Types.ObjectId(),
    studentIdNumber: "2024-0001",
    createdBy: "admin",
  };

  it("creates a valid eligible certificate", async () => {
    const cert = await EligibleCertificate.create(validCertData);

    expect(cert._id).toBeDefined();
    expect(cert.evaluationId).toBe("event123-student456");
    expect(cert.eventId.toString()).toBe(validCertData.eventId.toString());
    expect(cert.attendeeId.toString()).toBe(validCertData.attendeeId.toString());
    expect(cert.studentIdNumber).toBe("2024-0001");
    expect(cert.createdBy).toBe("admin");
    expect(cert.createdAt).toBeInstanceOf(Date);
  });

  it("rejects duplicate eventId + attendeeId combination", async () => {
    await EligibleCertificate.create(validCertData);

    const duplicate = new EligibleCertificate({
      evaluationId: "different-id",
      eventId: validCertData.eventId,
      attendeeId: validCertData.attendeeId,
    });

    await expect(duplicate.save()).rejects.toThrow();
  });

  it("allows different attendeeIds for the same event", async () => {
    await EligibleCertificate.create(validCertData);

    const secondCert = await EligibleCertificate.create({
      evaluationId: "event123-student789",
      eventId: validCertData.eventId,
      attendeeId: new mongoose.Types.ObjectId(),
      studentIdNumber: "2024-0002",
    });

    expect(secondCert._id).toBeDefined();
  });

  it("sets default createdAt when not provided", async () => {
    const cert = await EligibleCertificate.create({
      evaluationId: "event123-student456",
      eventId: new mongoose.Types.ObjectId(),
      attendeeId: new mongoose.Types.ObjectId(),
    });

    expect(cert.createdAt).toBeInstanceOf(Date);
    const now = Date.now();
    expect(cert.createdAt.getTime()).toBeCloseTo(now, -3);
  });

  it("requires evaluationId", async () => {
    const cert = new EligibleCertificate({
      eventId: new mongoose.Types.ObjectId(),
      attendeeId: new mongoose.Types.ObjectId(),
    });

    await expect(cert.validate()).rejects.toThrow(/evaluationId/);
  });

  it("requires eventId", async () => {
    const cert = new EligibleCertificate({
      evaluationId: "test-id",
      attendeeId: new mongoose.Types.ObjectId(),
    });

    await expect(cert.validate()).rejects.toThrow(/eventId/);
  });

  it("requires attendeeId", async () => {
    const cert = new EligibleCertificate({
      evaluationId: "test-id",
      eventId: new mongoose.Types.ObjectId(),
    });

    await expect(cert.validate()).rejects.toThrow(/attendeeId/);
  });
});
