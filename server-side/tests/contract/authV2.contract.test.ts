import bcrypt from "bcryptjs";
import request from "supertest";
import { createApp } from "../../src/app";
import { Student } from "../../src/models/student.model";
import {
  clearTestDatabase,
  connectTestDatabase,
  disconnectTestDatabase,
} from "../utils/mongoTestServer";

describe("Auth V2 contract tests", () => {
  const app = createApp();

  beforeAll(async () => {
    await connectTestDatabase();
  });

  afterEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("returns login success payload shape", async () => {
    const password = await bcrypt.hash("secret-password", 10);

    await Student.create({
      id_number: "2024-0002",
      rfid: "RFID-0002",
      password,
      first_name: "Contract",
      middle_name: "T",
      last_name: "Student",
      email: "contract.student@sample.com",
      course: "BSIT",
      year: 3,
      status: "True",
      campus: "UC-Main",
      role: "Student",
      isYearUpdated: false,
      membershipStatus: "NOT_APPLIED",
      deletedBy: "",
      deletedDate: "",
      isFirstApplication: true,
      isRequest: false,
      adminRequest: "",
      cart: [],
    });

    const response = await request(app).post("/api/v2/auth/login").send({
      id_number: "2024-0002",
      password: "secret-password",
    });

    expect(response.status).toBe(200);
    expect(Object.keys(response.body).sort()).toEqual([
      "accessToken",
      "message",
      "user",
    ]);
    expect(response.body.user).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        idNumber: expect.any(String),
        role: expect.stringMatching(/Admin|Student/),
        campus: expect.any(String),
      })
    );
  });

  it("returns auth error payload shape for invalid credentials", async () => {
    const response = await request(app).post("/api/v2/auth/login").send({
      id_number: "missing-user",
      password: "wrong-pass",
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      code: "AUTH_001",
      message: "Invalid ID number or password.",
    });
  });
});
