import { http, HttpResponse } from "msw";

export const handlers = [
  http.post("*/api/v2/auth/login", async () => {
    return HttpResponse.json({
      message: "Signed in successfully",
      accessToken: "test-access-token",
      user: {
        id: "student-1",
        idNumber: "2024-0001",
        role: "Student",
        campus: "UC-Main",
        name: "Test Student",
      },
    });
  }),
  http.post("*/api/v2/auth/refresh", async () => {
    return HttpResponse.json({
      message: "Token refreshed successfully",
      accessToken: "refreshed-access-token",
      user: {
        id: "student-1",
        idNumber: "2024-0001",
        role: "Student",
        campus: "UC-Main",
      },
    });
  }),
  http.post("*/api/v2/auth/logout", async () => {
    return HttpResponse.json({ message: "Logged out successfully" });
  }),
];
