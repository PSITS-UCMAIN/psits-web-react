import { describe, it, expect, vi, beforeEach } from "vitest";
import { getEligibleCertificates, generateCertificate } from "./certificateApi";

// Mock axios before importing the module under test
vi.mock("axios", () => {
  const mockAxios = {
    get: vi.fn(),
    post: vi.fn(),
  };
  return { default: mockAxios };
});

// Import the mocked axios
import axios from "axios";

const mockedAxios = vi.mocked(axios);

describe("certificateApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  describe("getEligibleCertificates", () => {
    it("throws when no token is in sessionStorage", async () => {
      await expect(getEligibleCertificates()).rejects.toThrow(
        "Authentication required"
      );
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it("returns certificate data on successful fetch", async () => {
      sessionStorage.setItem("Token", "test-token");

      const mockData = {
        success: true,
        count: 2,
        data: [
          {
            _id: "cert1",
            evaluationId: "evt1-stud1",
            eventId: "evt1",
            attendeeId: "stud1",
            createdAt: "2026-04-22T00:00:00Z",
          },
          {
            _id: "cert2",
            evaluationId: "evt1-stud2",
            eventId: "evt1",
            attendeeId: "stud2",
            createdAt: "2026-04-22T00:00:00Z",
          },
        ],
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockData });

      const result = await getEligibleCertificates();

      expect(result).toEqual(mockData.data);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining("/api/certificates/eligible"),
        {
          headers: { Authorization: "Bearer test-token" },
        }
      );
    });

    it("throws when API returns success: false", async () => {
      sessionStorage.setItem("Token", "test-token");

      mockedAxios.get.mockResolvedValueOnce({
        data: { success: false, message: "No certificates found" },
      });

      await expect(getEligibleCertificates()).rejects.toThrow(
        "No certificates found"
      );
    });

    it("throws on network error", async () => {
      sessionStorage.setItem("Token", "test-token");

      mockedAxios.get.mockRejectedValueOnce(new Error("Network error"));

      await expect(getEligibleCertificates()).rejects.toThrow("Network error");
    });

    it("returns empty array when data is missing", async () => {
      sessionStorage.setItem("Token", "test-token");

      mockedAxios.get.mockResolvedValueOnce({
        data: { success: true, count: 0 },
      });

      const result = await getEligibleCertificates();
      expect(result).toEqual([]);
    });
  });

  describe("generateCertificate", () => {
    beforeEach(() => {
      // Mock window.URL methods
      window.URL.createObjectURL = vi.fn(() => "blob:url");
      window.URL.revokeObjectURL = vi.fn();
    });

    it("throws when no token is in sessionStorage", async () => {
      await expect(generateCertificate("evt1")).rejects.toThrow(
        "Authentication required"
      );
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it("returns success response on PDF download", async () => {
      sessionStorage.setItem("Token", "test-token");
      const mockBlob = new Blob(["pdf-content"], { type: "application/pdf" });
      mockedAxios.post.mockResolvedValueOnce({ data: mockBlob });

      const result = await generateCertificate("evt1");

      expect(result.success).toBe(true);
      expect(result.message).toBe("Certificate downloaded successfully");
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining("/api/certificates/generate"),
        { eventId: "evt1" },
        expect.objectContaining({
          responseType: "blob",
          headers: { Authorization: "Bearer test-token" },
        })
      );
    });

    it("handles 429 rate limit error", async () => {
      sessionStorage.setItem("Token", "test-token");

      const errorBlob = new Blob(
        [
          JSON.stringify({
            success: false,
            message: "Please wait before generating another certificate",
            error: "Too many requests",
            retryAfter: 300,
          }),
        ],
        { type: "application/json" }
      );

      const axiosError = new Error("Rate limited") as Error & {
        response: { status: number; data: Blob };
      };
      axiosError.response = {
        status: 429,
        data: errorBlob,
      };
      mockedAxios.post.mockRejectedValueOnce(axiosError);

      const result = await generateCertificate("evt1");

      expect(result.success).toBe(false);
      expect(result.message).toBe(
        "Please wait before generating another certificate"
      );
      expect(result.retryAfter).toBe(300);
    });

    it("handles 403 not eligible error", async () => {
      sessionStorage.setItem("Token", "test-token");

      const errorBlob = new Blob(
        [
          JSON.stringify({
            success: false,
            message: "You are not eligible for a certificate for this event",
            error: "Not eligible",
          }),
        ],
        { type: "application/json" }
      );

      const axiosError = new Error("Forbidden") as Error & {
        response: { status: number; data: Blob };
      };
      axiosError.response = {
        status: 403,
        data: errorBlob,
      };
      mockedAxios.post.mockRejectedValueOnce(axiosError);

      const result = await generateCertificate("evt1");

      expect(result.success).toBe(false);
      expect(result.message).toBe(
        "You are not eligible for a certificate for this event"
      );
    });

    it("handles 404 not found error", async () => {
      sessionStorage.setItem("Token", "test-token");

      const errorBlob = new Blob(
        [
          JSON.stringify({
            success: false,
            message: "Event not found",
            error: "Not found",
          }),
        ],
        { type: "application/json" }
      );

      const axiosError = new Error("Not found") as Error & {
        response: { status: number; data: Blob };
      };
      axiosError.response = {
        status: 404,
        data: errorBlob,
      };
      mockedAxios.post.mockRejectedValueOnce(axiosError);

      const result = await generateCertificate("evt1");

      expect(result.success).toBe(false);
      expect(result.message).toBe("Event not found");
    });

    it("handles network errors gracefully", async () => {
      sessionStorage.setItem("Token", "test-token");

      mockedAxios.post.mockRejectedValueOnce(new Error("Network error"));

      const result = await generateCertificate("evt1");

      expect(result.success).toBe(false);
      expect(result.message).toBe("Network error");
    });
  });
});
