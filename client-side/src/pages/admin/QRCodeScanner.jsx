import React, { useEffect, useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { showToast } from "../../utils/alertHelper";

export const QRCodeScanner = () => {
  const [cameraState, setCameraState] = useState(null);

  const checkCameraPermission = async () => {
    try {
      const permission = await navigator.permissions.query({ name: "camera" });

      setCameraState(permission.state);

      permission.onchange = () => {
        setCameraState(permission.state);
      };
    } catch (error) {
      console.error("Permission check error:", error);
    }
  };

  useEffect(() => {
    checkCameraPermission();
  }, []);

  const validateQRCode = (url) => {
    const regex =
      /^\/admin\/attendance\/[a-zA-Z0-9]+\/.+\/markAsPresent\/[0-9]+\/.+$/;
    return regex.test(url);
  };

  const handleScan = (detectedCodes) => {
    if (detectedCodes.length > 0) {
      const scannedURL = detectedCodes[0].rawValue;
      if (validateQRCode(scannedURL)) {
        showToast("success", "QR Code scanned successfully!");
        window.location.href = window.location.origin + scannedURL;
      } else {
        showToast(
          "error",
          "Invalid QR Code detected. Refresh the page and retry."
        );
      }
    }
  };

  return (
    <div className="flex flex-col items-center p-4">
      <h2 className="text-lg font-semibold">Scan Here</h2>

      {cameraState === "denied" || cameraState === "prompt" ? (
        <div
          className={`${
            cameraState === "denied"
              ? "bg-red-100 text-red-700 border-red-400"
              : "bg-yellow-100 text-yellow-700 border-yellow-400"
          } p-4 rounded-lg text-center mt-4 shadow-lg border`}
        >
          <p className="text-lg font-semibold flex items-center justify-center gap-2">
            📸{" "}
            {cameraState === "denied"
              ? "Camera Access Blocked"
              : "Camera Permission Needed"}
          </p>
          <p className="mt-2 text-sm">
            {cameraState === "denied"
              ? "We need access to your camera to scan QR codes. Please enable camera permission in your browser settings."
              : "Camera permission is needed to scan QR codes. Please allow camera access when prompted."}
          </p>
        </div>
      ) : (
        <div className="w-full max-w-xs mt-4">
          <Scanner
            onScan={handleScan}
            onError={(error) => console.error("QR Scan Error:", error)}
            constraints={{ facingMode: "environment" }}
            allowMultiple={false}
            scanDelay={500}
          />
        </div>
      )}
    </div>
  );
};
