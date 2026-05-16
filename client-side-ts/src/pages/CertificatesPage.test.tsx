import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CertificatesPage from "./CertificatesPage";

// The page imports CertificateEventList which is tested separately
// This test focuses on the page shell / layout

describe("CertificatesPage", () => {
  it("renders the page title and description", () => {
    render(<CertificatesPage />);

    expect(
      screen.getByRole("heading", { name: /my certificates/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /view and download your certificates/i
      )
    ).toBeInTheDocument();
  });

  it("renders within a max-width container", () => {
    const { container } = render(<CertificatesPage />);

    const mainDiv = container.firstChild as HTMLElement;
    expect(mainDiv.className).toContain("max-w-4xl");
  });

  it("renders the CertificateEventList component", () => {
    render(<CertificatesPage />);

    // CertificateEventList shows loading state initially
    expect(screen.getByText("Loading certificates...")).toBeInTheDocument();
  });
});
