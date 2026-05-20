import React from "react";

const ITEM_HEIGHT = 96;
const VISIBLE = 5;
const WINNER_IDX = 80;

interface RaffleSlotMachineProps {
  reelRef: React.RefObject<HTMLDivElement | null>; // FIX 1 — replaces reelOffset
  reelItems: string[];
  isAnimating: boolean;
  winnerLit: boolean;
}

export const RaffleSlotMachine: React.FC<RaffleSlotMachineProps> = ({
  reelRef,
  reelItems,
  isAnimating,
  winnerLit,
}) => {
  const centerRow = Math.floor(VISIBLE / 2);

  return (
    <div style={{ width: "100%", position: "relative" }}>
      {/* Winner glow ring */}
      {winnerLit && (
        <div
          style={{
            position: "absolute",
            inset: "-3px",
            borderRadius: "23px",
            background: "linear-gradient(135deg, #2563eb, #06b6d4, #2563eb)",
            zIndex: 0,
            animation: "ringPulse 1.8s ease-in-out infinite",
          }}
        />
      )}

      {/* Machine outer frame */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          borderRadius: "20px",
          padding: "3px",
          background: winnerLit
            ? "transparent"
            : "linear-gradient(145deg, #e2e8f0, #ffffff, #e2e8f0)",
          boxShadow: winnerLit
            ? "0 0 80px rgba(37,99,235,0.4)"
            : "0 10px 40px rgba(0,0,0,0.1), 0 1px 10px rgba(0,0,0,0.05)",
        }}
      >
        {/* Reel viewport */}
        <div
          style={{
            borderRadius: "18px",
            overflow: "hidden",
            background: "#ffffff",
            height: `${VISIBLE * ITEM_HEIGHT}px`,
            position: "relative",
            border: "1px solid #e2e8f0",
          }}
        >
          {/* Inner dashed track overlay */}
          <div
            style={{
              position: "absolute",
              inset: "6px",
              borderRadius: "12px",
              border: "1.5px dashed rgba(203,213,225,0.6)",
              zIndex: 3,
              pointerEvents: "none",
            }}
          />

          <div
            ref={reelRef}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              transform: "translateY(0px)",
              willChange: "transform",
            }}
          >
            {reelItems.map((name, i) => {
              const isWinnerRow = !isAnimating && winnerLit && i === WINNER_IDX;
              return (
                <div
                  key={i}
                  style={{
                    height: `${ITEM_HEIGHT}px`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 28px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "clamp(1.2rem, 4vw, 2.2rem)",
                      fontWeight: isWinnerRow ? 800 : 600,
                      color: isWinnerRow
                        ? "#1e293b"
                        : isAnimating
                          ? "#475569"
                          : "#cbd5e1",
                      textAlign: "center",
                      transition: isAnimating ? "none" : "all 0.4s",
                      letterSpacing: isWinnerRow ? "0.02em" : "0.01em",
                      filter: isAnimating ? "blur(1.5px)" : "blur(0px)",
                      transform: isAnimating
                        ? "scale(1.02) translateY(0)"
                        : "scale(1) translateY(0)",
                      textShadow: isWinnerRow
                        ? "0 4px 20px rgba(37,99,235,0.4)"
                        : "none",
                    }}
                  >
                    {name}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Center selection highlight */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: `${centerRow * ITEM_HEIGHT}px`,
              height: `${ITEM_HEIGHT}px`,
              borderTop: winnerLit
                ? "2px solid #2563eb"
                : isAnimating
                  ? "1.5px solid #bfdbfe"
                  : "1.5px solid #e2e8f0",
              borderBottom: winnerLit
                ? "2px solid #2563eb"
                : isAnimating
                  ? "1.5px solid #bfdbfe"
                  : "1.5px solid #e2e8f0",
              background: winnerLit
                ? "rgba(37,99,235,0.04)"
                : isAnimating
                  ? "rgba(37,99,235,0.02)"
                  : "transparent",
              transition: "border-color 0.4s, background 0.4s",
              pointerEvents: "none",
              zIndex: 3,
            }}
          />

          {/* Arrow pointers */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: `${centerRow * ITEM_HEIGHT + ITEM_HEIGHT / 2}px`,
              transform: "translateY(-50%)",
              borderTop: "9px solid transparent",
              borderBottom: "9px solid transparent",
              borderLeft: `13px solid ${winnerLit ? "#2563eb" : isAnimating ? "#93c5fd" : "#e2e8f0"}`,
              transition: "border-left-color 0.4s",
              zIndex: 4,
            }}
          />
          <div
            style={{
              position: "absolute",
              right: 0,
              top: `${centerRow * ITEM_HEIGHT + ITEM_HEIGHT / 2}px`,
              transform: "translateY(-50%)",
              borderTop: "9px solid transparent",
              borderBottom: "9px solid transparent",
              borderRight: `13px solid ${winnerLit ? "#2563eb" : isAnimating ? "#93c5fd" : "#e2e8f0"}`,
              transition: "border-right-color 0.4s",
              zIndex: 4,
            }}
          />

          {/* Top fade mask */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: `${centerRow * ITEM_HEIGHT}px`,
              background:
                "linear-gradient(to bottom, rgba(255,255,255,1) 0%, rgba(255,255,255,0.8) 50%, transparent 100%)",
              pointerEvents: "none",
              zIndex: 2,
            }}
          />
          {/* Bottom fade mask */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: `${centerRow * ITEM_HEIGHT}px`,
              background:
                "linear-gradient(to top, rgba(255,255,255,1) 0%, rgba(255,255,255,0.8) 50%, transparent 100%)",
              pointerEvents: "none",
              zIndex: 2,
            }}
          />
        </div>
      </div>

      {/* Enhanced Corner Designs & Edge Lines */}
      {[
        { top: true, left: true, color: "#db2777", rgb: "219,39,119" },
        { top: true, left: false, color: "#ea580c", rgb: "234,88,12" },
        { top: false, left: true, color: "#0ea5e9", rgb: "14,165,233" },
        { top: false, left: false, color: "#8b5cf6", rgb: "139,92,246" },
      ].map(({ top, left, color, rgb }, i) => (
        <React.Fragment key={`corner-group-${i}`}>
          <div
            style={{
              position: "absolute",
              top: top ? "12px" : undefined,
              bottom: !top ? "12px" : undefined,
              left: left ? "12px" : undefined,
              right: !left ? "12px" : undefined,
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: winnerLit ? color : "#e2e8f0",
              border: `1px solid ${winnerLit ? color : "#cbd5e1"}`,
              zIndex: 6,
              boxShadow: winnerLit ? `0 0 10px rgba(${rgb},0.8)` : "none",
              transition: "all 0.4s",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: top ? "-2px" : undefined,
              bottom: !top ? "-2px" : undefined,
              left: left ? "-2px" : undefined,
              right: !left ? "-2px" : undefined,
              width: "48px",
              height: "48px",
              borderTop: top
                ? `3px solid ${winnerLit ? color : "#94a3b8"}`
                : undefined,
              borderBottom: !top
                ? `3px solid ${winnerLit ? color : "#94a3b8"}`
                : undefined,
              borderLeft: left
                ? `3px solid ${winnerLit ? color : "#94a3b8"}`
                : undefined,
              borderRight: !left
                ? `3px solid ${winnerLit ? color : "#94a3b8"}`
                : undefined,
              borderTopLeftRadius: top && left ? "22px" : undefined,
              borderTopRightRadius: top && !left ? "22px" : undefined,
              borderBottomLeftRadius: !top && left ? "22px" : undefined,
              borderBottomRightRadius: !top && !left ? "22px" : undefined,
              zIndex: 6,
              opacity: winnerLit || isAnimating ? 1 : 0.4,
              boxShadow: winnerLit
                ? top && left
                  ? `inset 3px 3px 5px -2px rgba(${rgb},0.5)`
                  : top && !left
                    ? `inset -3px 3px 5px -2px rgba(${rgb},0.5)`
                    : !top && left
                      ? `inset 3px -3px 5px -2px rgba(${rgb},0.5)`
                      : `inset -3px -3px 5px -2px rgba(${rgb},0.5)`
                : undefined,
              transition: "all 0.4s ease",
              pointerEvents: "none",
            }}
          />
        </React.Fragment>
      ))}

      {/* Decorative edge glowing lines */}
      <div
        style={{
          position: "absolute",
          top: "-2px",
          left: "60px",
          right: "60px",
          height: "2px",
          background:
            "linear-gradient(90deg, transparent, #db2777, #ea580c, transparent)",
          zIndex: 6,
          opacity: isAnimating || winnerLit ? 1 : 0.15,
          transition: "opacity 0.4s",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-2px",
          left: "60px",
          right: "60px",
          height: "2px",
          background:
            "linear-gradient(90deg, transparent, #0ea5e9, #8b5cf6, transparent)",
          zIndex: 6,
          opacity: isAnimating || winnerLit ? 1 : 0.15,
          transition: "opacity 0.4s",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "-2px",
          top: "60px",
          bottom: "60px",
          width: "2px",
          background:
            "linear-gradient(180deg, transparent, #db2777, #0ea5e9, transparent)",
          zIndex: 6,
          opacity: isAnimating || winnerLit ? 1 : 0.15,
          transition: "opacity 0.4s",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: "-2px",
          top: "60px",
          bottom: "60px",
          width: "2px",
          background:
            "linear-gradient(180deg, transparent, #ea580c, #8b5cf6, transparent)",
          zIndex: 6,
          opacity: isAnimating || winnerLit ? 1 : 0.15,
          transition: "opacity 0.4s",
        }}
      />
    </div>
  );
};
