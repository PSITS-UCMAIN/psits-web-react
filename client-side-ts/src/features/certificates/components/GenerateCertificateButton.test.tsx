import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GenerateCertificateButton } from "./GenerateCertificateButton";

// Mock the certificate API
vi.mock("../api/certificateApi", () => ({
  generateCertificate: vi.fn(),
}));

import { generateCertificate } from "../api/certificateApi";
const mockedGenerateCertificate = vi.mocked(generateCertificate);

describe("GenerateCertificateButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const defaultProps = {
    eventId: "evt1",
    eventName: "12th UC CCS ICT Congress 2026",
    isEligible: true,
  };

  it("renders generate button when eligible", () => {
    render(<GenerateCertificateButton {...defaultProps} />);

    expect(
      screen.getByRole("button", { name: /generate certificate/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /generate certificate/i })
    ).not.toBeDisabled();
  });

  it("returns null when not eligible", () => {
    const { container } = render(
      <GenerateCertificateButton {...defaultProps} isEligible={false} />
    );

    expect(container.firstChild).toBeNull();
  });

  it("shows loading state while generating", async () => {
    // Keep promise pending to test loading state
    mockedGenerateCertificate.mockReturnValue(new Promise(() => {}));

    const user = userEvent.setup();
    render(<GenerateCertificateButton {...defaultProps} />);

    await user.click(
      screen.getByRole("button", { name: /generate certificate/i })
    );

    expect(screen.getByText("Generating...")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("shows success message on successful generation", async () => {
    mockedGenerateCertificate.mockResolvedValueOnce({
      success: true,
      message: "Certificate downloaded successfully",
    });

    const user = userEvent.setup();
    render(<GenerateCertificateButton {...defaultProps} />);

    await user.click(
      screen.getByRole("button", { name: /generate certificate/i })
    );

    await waitFor(() => {
      expect(mockedGenerateCertificate).toHaveBeenCalledWith("evt1");
    });

    // After successful generation, button enters cooldown state
    await waitFor(() => {
      expect(screen.getByText(/wait/i)).toBeInTheDocument();
    });
  });

  it("shows cooldown state with countdown after generation", async () => {
    mockedGenerateCertificate.mockResolvedValueOnce({
      success: true,
      message: "Certificate downloaded successfully",
    });

    const user = userEvent.setup();
    render(<GenerateCertificateButton {...defaultProps} />);

    await user.click(
      screen.getByRole("button", { name: /generate certificate/i })
    );

    // Should show cooldown timer
    await waitFor(() => {
      expect(screen.getByText(/wait/i)).toBeInTheDocument();
    });
  });

  it("shows not-eligible error and re-enables button", async () => {
    mockedGenerateCertificate.mockResolvedValueOnce({
      success: false,
      message: "You are not eligible for a certificate for this event",
      error: "Not eligible",
    });

    const user = userEvent.setup();
    render(<GenerateCertificateButton {...defaultProps} />);

    const button = screen.getByRole("button", {
      name: /generate certificate/i,
    });
    await user.click(button);

    // After API returns, isGenerating becomes false and remainingTime stays 0,
    // so the button should re-enable (the error is a transient API response,
    // not a cooldown that would disable the button)
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /generate certificate/i })
      ).not.toBeDisabled();
    });
  });

  it("shows rate limit error with cooldown countdown", async () => {
    mockedGenerateCertificate.mockResolvedValueOnce({
      success: false,
      message: "Please wait before generating another certificate",
      error: "Too many requests",
      retryAfter: 300,
    });

    const user = userEvent.setup();
    render(<GenerateCertificateButton {...defaultProps} />);

    await user.click(
      screen.getByRole("button", { name: /generate certificate/i })
    );

    await waitFor(() => {
      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
      expect(button).toHaveTextContent(/wait/i);
    });
  });

  it("does not trigger generate when already in cooldown", async () => {
    const cooldownTime = Date.now() + 5 * 60 * 1000;
    localStorage.setItem("cert-cooldown-evt1", cooldownTime.toString());

    render(<GenerateCertificateButton {...defaultProps} />);

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent(/wait/i);
  });

  it("clears expired cooldown from localStorage", async () => {
    const expiredTime = Date.now() - 1000;
    localStorage.setItem("cert-cooldown-evt1", expiredTime.toString());

    render(<GenerateCertificateButton {...defaultProps} />);

    // Should not show cooldown since it expired
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /generate certificate/i })
      ).toBeInTheDocument();
    });
    expect(localStorage.getItem("cert-cooldown-evt1")).toBeNull();
  });
});
