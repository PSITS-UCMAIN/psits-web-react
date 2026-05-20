import api from "@/api/axios";
import type {
  EligibleCertificate,
  GenerateCertificateResponse,
} from "../types";
import type { CertificateSearchError } from "@/types/api";

/**
 * Get all eligible certificates for the authenticated student
 */
export const getEligibleCertificates = async (): Promise<
  EligibleCertificate[]
> => {
  try {
    const response = await api.get("/api/certificates/eligible");

    if (response.data?.success) {
      return response.data.data || [];
    }

    throw new Error(response.data?.message || "Failed to fetch certificates");
  } catch (error: unknown) {
    console.error("Error fetching eligible certificates:", error);
    throw error;
  }
};

/**
 * Generate and download certificate for a specific event
 * @param eventId - The event ID to generate certificate for
 * @returns Promise with success status and optional error details
 */
export const generateCertificate = async (
  eventId: string
): Promise<GenerateCertificateResponse> => {
  try {
    const response = await api.post(
      "/api/certificates/generate",
      { eventId },
      {
        responseType: "blob", // Important for PDF download
      }
    );

    // Success - response.data should be a Blob (PDF)
    const blob = new Blob([response.data], { type: "application/pdf" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ICT_Congress_2026_Certificate.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    return {
      success: true,
      message: "Certificate downloaded successfully",
    };
  } catch (error: unknown) {
    console.error("Error generating certificate:", error);

    if (error instanceof Error && "response" in error) {
      const axiosError = error as {
        response?: {
          status?: number;
          data?:
            | Blob
            | { message?: string; retryAfter?: number; error?: string };
        };
      };
      const status = axiosError.response?.status;

      // For error responses, the blob needs to be parsed as JSON
      if (axiosError.response?.data instanceof Blob) {
        try {
          const text = await axiosError.response.data.text();
          const errorData: CertificateSearchError = JSON.parse(text);

          return {
            success: false,
            message: errorData.message || "Failed to generate certificate",
            error: errorData.error,
            retryAfter: errorData.retryAfter,
          };
        } catch {
          return {
            success: false,
            message: "Failed to generate certificate",
          };
        }
      }

      if (status === 429) {
        return {
          success: false,
          message: "Please wait before generating another certificate",
          error: "Too many requests",
          retryAfter: axiosError.response?.data?.retryAfter || 300,
        };
      }

      if (status === 403) {
        return {
          success: false,
          message: "You are not eligible for a certificate for this event",
          error: "Not eligible",
        };
      }

      if (status === 404) {
        return {
          success: false,
          message: "Event not found",
          error: "Not found",
        };
      }

      return {
        success: false,
        message:
          axiosError.response?.data?.message ||
          "Failed to generate certificate",
      };
    }

    // Network or other errors
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to generate certificate",
    };
  }
};
