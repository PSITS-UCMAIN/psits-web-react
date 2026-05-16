import axios from "axios";
import backendConnection from "@/api/backendApi";
import type { EligibleCertificate, GenerateCertificateResponse, CertificateApiError } from "../types";

const API_BASE = backendConnection();

/**
 * Get all eligible certificates for the authenticated student
 */
export const getEligibleCertificates = async (): Promise<
  EligibleCertificate[]
> => {
  try {
    const token = sessionStorage.getItem("Token");
    if (!token) {
      throw new Error("Authentication required");
    }

    const response = await axios.get(`${API_BASE}/api/certificates/eligible`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.data.success) {
      return response.data.data || [];
    }

    throw new Error(response.data.message || "Failed to fetch certificates");
  } catch (error: any) {
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
    const token = sessionStorage.getItem("Token");
    if (!token) {
      throw new Error("Authentication required");
    }

    const response = await axios.post(
      `${API_BASE}/api/certificates/generate`,
      { eventId },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: "blob", // Important for PDF download
      }
    );

    // Check if response is a blob (PDF) or JSON error
    if (response.data instanceof Blob) {
      // Success - trigger download
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
    }

    // If not a blob, it's an error response
    throw new Error("Unexpected response format");
  } catch (error: any) {
    console.error("Error generating certificate:", error);

    // Handle axios error responses
    if (error.response) {
      const status = error.response.status;

      // For error responses, the blob needs to be parsed as JSON
      if (error.response.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          const errorData: CertificateApiError = JSON.parse(text);

          return {
            success: false,
            message: errorData.message || "Failed to generate certificate",
            error: errorData.error,
            retryAfter: errorData.retryAfter,
          };
        } catch (parseError) {
          return {
            success: false,
            message: "Failed to generate certificate",
          };
        }
      }

      // Handle specific status codes
      if (status === 429) {
        return {
          success: false,
          message: "Please wait before generating another certificate",
          error: "Too many requests",
          retryAfter: error.response.data?.retryAfter || 300,
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
          error.response.data?.message || "Failed to generate certificate",
      };
    }

    // Network or other errors
    return {
      success: false,
      message: error.message || "Failed to generate certificate",
    };
  }
};
