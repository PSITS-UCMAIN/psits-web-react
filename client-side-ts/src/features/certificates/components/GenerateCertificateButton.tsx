import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Clock } from "lucide-react";
import { generateCertificate } from "../api/certificateApi";
import { showToast } from "@/utils/alertHelper";

interface GenerateCertificateButtonProps {
  eventId: string;
  eventName: string;
  isEligible: boolean;
}

export const GenerateCertificateButton = ({
  eventId,
  eventName,
  isEligible,
}: GenerateCertificateButtonProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [cooldownEnd, setCooldownEnd] = useState<number | null>(null);
  const [remainingTime, setRemainingTime] = useState(0);

  // Load cooldown from localStorage on mount
  useEffect(() => {
    const storedCooldown = localStorage.getItem(`cert-cooldown-${eventId}`);
    if (storedCooldown) {
      const cooldownTime = parseInt(storedCooldown, 10);
      if (cooldownTime > Date.now()) {
        setCooldownEnd(cooldownTime);
      } else {
        localStorage.removeItem(`cert-cooldown-${eventId}`);
      }
    }
  }, [eventId]);

  // Update remaining time countdown
  useEffect(() => {
    if (!cooldownEnd) {
      setRemainingTime(0);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((cooldownEnd - now) / 1000));
      setRemainingTime(remaining);

      if (remaining === 0) {
        setCooldownEnd(null);
        localStorage.removeItem(`cert-cooldown-${eventId}`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [cooldownEnd, eventId]);

  const handleGenerate = async () => {
    if (!isEligible || isGenerating || cooldownEnd) {
      return;
    }

    setIsGenerating(true);

    try {
      const result = await generateCertificate(eventId);

      if (result.success) {
        showToast("success", "Certificate downloaded successfully!");

        // Set cooldown (5 minutes from now)
        const cooldownTime = Date.now() + 5 * 60 * 1000;
        setCooldownEnd(cooldownTime);
        localStorage.setItem(
          `cert-cooldown-${eventId}`,
          cooldownTime.toString()
        );
      } else {
        if (result.retryAfter) {
          // Server returned cooldown time
          const cooldownTime = Date.now() + result.retryAfter * 1000;
          setCooldownEnd(cooldownTime);
          localStorage.setItem(
            `cert-cooldown-${eventId}`,
            cooldownTime.toString()
          );
          showToast(
            "error",
            result.message ||
              "Please wait before generating another certificate"
          );
        } else if (result.error === "Not eligible") {
          showToast(
            "error",
            "You are not eligible for a certificate for this event"
          );
        } else {
          showToast(
            "error",
            result.message || "Failed to generate certificate"
          );
        }
      }
    } catch (error: unknown) {
      console.error("Error generating certificate:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to generate certificate";
      showToast("error", errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isEligible) {
    return null;
  }

  const isDisabled = isGenerating || remainingTime > 0;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Button
      onClick={handleGenerate}
      disabled={isDisabled}
      title={eventName}
      className="w-full sm:w-auto"
      variant={remainingTime > 0 ? "outline" : "default"}
    >
      {isGenerating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating...
        </>
      ) : remainingTime > 0 ? (
        <>
          <Clock className="mr-2 h-4 w-4" />
          Wait {formatTime(remainingTime)}
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          Generate Certificate
        </>
      )}
    </Button>
  );
};
