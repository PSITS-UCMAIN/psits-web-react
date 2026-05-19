import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { CertificateEventList } from "./CertificateEventList";

// Mock the certificate API
vi.mock("../api/certificateApi", () => ({
  getEligibleCertificates: vi.fn(),
}));

import { getEligibleCertificates } from "../api/certificateApi";
const mockedGetEligibleCertificates = vi.mocked(getEligibleCertificates);

describe("CertificateEventList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state initially", () => {
    mockedGetEligibleCertificates.mockReturnValue(new Promise(() => {}));

    render(<CertificateEventList />);

    expect(screen.getByText("Loading certificates...")).toBeInTheDocument();
  });

  it("shows error state when fetch fails", async () => {
    mockedGetEligibleCertificates.mockRejectedValueOnce(
      new Error("Failed to load certificates")
    );

    render(<CertificateEventList />);

    await waitFor(() => {
      expect(screen.getByText("Error")).toBeInTheDocument();
      expect(
        screen.getByText("Failed to load certificates")
      ).toBeInTheDocument();
    });
  });

  it("shows empty state when no certificates available", async () => {
    mockedGetEligibleCertificates.mockResolvedValueOnce([]);

    render(<CertificateEventList />);

    await waitFor(() => {
      expect(
        screen.getByText("No Certificates Available")
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Certificates will appear here/)
    ).toBeInTheDocument();
  });

  it("renders certificate cards with event details", async () => {
    mockedGetEligibleCertificates.mockResolvedValueOnce([
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
    ]);

    render(<CertificateEventList />);

    await waitFor(() => {
      expect(
        screen.getByText("12th UC CCS ICT Congress 2026")
      ).toBeInTheDocument();
    });

    expect(screen.getByText("2 Certificates")).toBeInTheDocument();
    expect(screen.getByText("Eligible")).toBeInTheDocument();
    expect(screen.getByText("April 22, 2026")).toBeInTheDocument();
    expect(
      screen.getByText(/New Cebu Colosseum/)
    ).toBeInTheDocument();
  });

  it("renders singular badge label when one certificate", async () => {
    mockedGetEligibleCertificates.mockResolvedValueOnce([
      {
        _id: "cert1",
        evaluationId: "evt1-stud1",
        eventId: "evt1",
        attendeeId: "stud1",
        createdAt: "2026-04-22T00:00:00Z",
      },
    ]);

    render(<CertificateEventList />);

    await waitFor(() => {
      expect(screen.getByText("1 Certificate")).toBeInTheDocument();
    });
  });

  it("renders GenerateCertificateButton for each certificate", async () => {
    mockedGetEligibleCertificates.mockResolvedValueOnce([
      {
        _id: "cert1",
        evaluationId: "evt1-stud1",
        eventId: "evt1",
        attendeeId: "stud1",
        createdAt: "2026-04-22T00:00:00Z",
      },
    ]);

    render(<CertificateEventList />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /generate certificate/i })
      ).toBeInTheDocument();
    });
  });
});
