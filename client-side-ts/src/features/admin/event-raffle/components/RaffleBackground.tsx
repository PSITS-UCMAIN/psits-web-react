import React, { useState } from "react";

interface RaffleBackgroundProps {
  showConfetti: boolean;
}

const confettiItems = Array.from({ length: 72 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  delay: Math.random() * 1.6,
  dur: 2.5 + Math.random() * 2,
  color: [
    "#2563eb",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#06b6d4",
    "#f97316",
    "#ec4899",
  ][i % 8],
  size: 5 + Math.random() * 8,
  isCircle: Math.random() > 0.5,
}));

export const RaffleBackground: React.FC<RaffleBackgroundProps> = ({
  showConfetti,
}) => {
  const [confetti] = useState(() => confettiItems);

  return (
    <>
      {/* Sunburst background */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
        <div
          style={{
            width: "200vmax",
            height: "200vmax",
            flexShrink: 0,
            background:
              "conic-gradient(from 0deg, rgba(37,99,235,0.12) 0deg, transparent 9deg, rgba(37,99,235,0.12) 18deg, transparent 27deg, rgba(37,99,235,0.12) 36deg, transparent 45deg, rgba(37,99,235,0.12) 54deg, transparent 63deg, rgba(37,99,235,0.12) 72deg, transparent 81deg, rgba(37,99,235,0.12) 90deg, transparent 99deg, rgba(37,99,235,0.12) 108deg, transparent 117deg, rgba(37,99,235,0.12) 126deg, transparent 135deg, rgba(37,99,235,0.12) 144deg, transparent 153deg, rgba(37,99,235,0.12) 162deg, transparent 171deg, rgba(37,99,235,0.12) 180deg, transparent 189deg, rgba(37,99,235,0.12) 198deg, transparent 207deg, rgba(37,99,235,0.12) 216deg, transparent 225deg, rgba(37,99,235,0.12) 234deg, transparent 243deg, rgba(37,99,235,0.12) 252deg, transparent 261deg, rgba(37,99,235,0.12) 270deg, transparent 279deg, rgba(37,99,235,0.12) 288deg, transparent 297deg, rgba(37,99,235,0.12) 306deg, transparent 315deg, rgba(37,99,235,0.12) 324deg, transparent 333deg, rgba(37,99,235,0.12) 342deg, transparent 351deg)",
            animation: "bgSpin 40s linear infinite",
            filter: "blur(2px)",
          }}
        />
      </div>

      {/* Soft center radial mask */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(240,244,255,0.3) 0%, transparent 100%)",
        }}
      />

      {/* Confetti */}
      {showConfetti && (
        <div className="pointer-events-none absolute inset-0 z-[100] overflow-hidden">
          {confetti.map((p) => (
            <div
              key={p.id}
              className="absolute"
              style={{
                left: `${p.x}%`,
                top: "-14px",
                width: p.size,
                height: p.size,
                background: p.color,
                borderRadius: p.isCircle ? "50%" : "2px",
                animation: `cfall ${p.dur}s ${p.delay * 0.4}s ease-in forwards`,
              }}
            />
          ))}
        </div>
      )}

      <style>{`
        @keyframes bgSpin {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
};
