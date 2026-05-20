import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Award, Loader2 } from "lucide-react";
import { getEligibleCertificates } from "../api/certificateApi";
import type { EligibleCertificate } from "../types";
import { GenerateCertificateButton } from "./GenerateCertificateButton";
import { showToast } from "@/utils/alertHelper";

export const CertificateEventList = () => {
  const [eligibleCerts, setEligibleCerts] = useState<EligibleCertificate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEligibleCertificates();
  }, []);

  const fetchEligibleCertificates = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const certs = await getEligibleCertificates();
      setEligibleCerts(certs);
    } catch (err: unknown) {
      console.error("Error fetching eligible certificates:", err);
      const error = err as {
        message?: string;
        response?: { status?: number; data?: { message?: string } };
      };
      setError(error.message || "Failed to load certificates");
      if (error?.response?.status === 403) {
        showToast(
          "error",
          error.response?.data?.message ||
            "Access Denied. Please login or contact the administrator."
        );
      } else {
        showToast(
          "error",
          error?.message || "Failed to load eligible certificates"
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
        <span className="text-muted-foreground ml-2">
          Loading certificates...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Error</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (eligibleCerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Certificates Available</CardTitle>
          <CardDescription>
            You don't have any certificates available yet. Certificates will
            appear here after you attend eligible events.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <div className="text-muted-foreground text-center">
            <Award className="mx-auto mb-4 h-16 w-16 opacity-50" />
            <p>Check back after attending events!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // For ICT Congress 2026, we have hardcoded event details
  // In the future, this would fetch event details from the API
  const eventDetails = {
    name: "12th UC CCS ICT Congress 2026",
    date: "April 22, 2026",
    venue: "New Cebu Colosseum, Sanciangko St., Cebu City",
    theme:
      "Innovating the Future: Empowering Society Through Intelligent Technologies",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">My Certificates</h2>
        <Badge variant="secondary" className="text-sm">
          {eligibleCerts.length}{" "}
          {eligibleCerts.length === 1 ? "Certificate" : "Certificates"}
        </Badge>
      </div>

      {eligibleCerts.map((cert) => (
        <Card key={cert._id} className="transition-shadow hover:shadow-md">
          <CardHeader className="pt-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-1">
                <CardTitle className="text-xl">{eventDetails.name}</CardTitle>
                <CardDescription className="text-sm italic">
                  {eventDetails.theme}
                </CardDescription>
              </div>
              <Badge variant="default" className="ml-4">
                <Award className="mr-1 h-3 w-3" />
                Eligible
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 text-sm">
              <div className="text-muted-foreground flex items-center">
                <Calendar className="mr-2 h-4 w-4" />
                <span>{eventDetails.date}</span>
              </div>
              <div className="text-muted-foreground flex items-center">
                <MapPin className="mr-2 h-4 w-4" />
                <span>{eventDetails.venue}</span>
              </div>
            </div>

            <div className="border-t pt-4">
              <GenerateCertificateButton
                eventId={
                  typeof cert.eventId === "string"
                    ? cert.eventId
                    : cert.eventId?._id
                }
                eventName={eventDetails.name}
                isEligible={true}
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
