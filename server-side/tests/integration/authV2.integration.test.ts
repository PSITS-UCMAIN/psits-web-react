import bcrypt from "bcryptjs";
import request from "supertest";
import { createApp } from "../../src/app";
import { Student } from "../../src/models/student.model";
import {
  clearTestDatabase,
  connectTestDatabase,
  disconnectTestDatabase,
} from "../utils/mongoTestServer";

describe("Auth V2 API integration", () => {
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

  it("logs in a student and returns auth payload", async () => {
    const password = await bcrypt.hash("secret-password", 10);

    await Student.create({
      id_number: "2024-0001",
      rfid: "RFID-0001",
      password,
      first_name: "Test",
      middle_name: "U",
      last_name: "Student",
      email: "test.student@sample.com",
      course: "BSIT",
      year: 2,
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
      id_number: "2024-0001",
      password: "secret-password",
    });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Signed in successfully");
    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.user).toMatchObject({
      role: "Student",
      idNumber: "2024-0001",
      campus: "UC-Main",
    });
    expect(response.headers["set-cookie"]?.join(";")).toContain("rtid=");
  });
});
