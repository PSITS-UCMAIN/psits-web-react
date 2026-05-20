import React from "react";

type Winner = {
  name: string;
  campus?: string;
  round: number;
  timestamp: string;
};

interface WinnersModalProps {
  winners: Winner[];
  onClose: () => void;
}

export const WinnersModal: React.FC<WinnersModalProps> = ({
  winners,
  onClose,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.4)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "440px",
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          background: "#ffffff",
          borderRadius: "20px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 24px 64px rgba(0,0,0,0.15)",
          overflow: "visible",
          position: "relative",
          paddingTop: "42px",
        }}
      >
        {/* Ribbon header */}
        <div
          style={{
            position: "absolute",
            top: "-28px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "72%",
            minWidth: "260px",
            zIndex: 2,
          }}
        >
          <div
            style={{
              position: "relative",
              height: "86px",
              borderRadius: "8px",
              background:
                "linear-gradient(135deg, #ffbf1f 0%, #f59e0b 65%, #f89f33 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#7c2d12",
              fontWeight: 900,
              fontSize: "clamp(2rem, 5vw, 3rem)",
              letterSpacing: "-0.01em",
              textShadow: "0 1px 0 rgba(255,255,255,0.35)",
              clipPath:
                "polygon(0 0, calc(100% - 24px) 0, 100% 50%, calc(100% - 24px) 100%, 0 100%, 16px 50%)",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "8px",
                background:
                  "radial-gradient(circle at 18% -30%, rgba(255,255,255,0.42), transparent 45%)",
                pointerEvents: "none",
              }}
            />
            Winners
          </div>
        </div>

        <button
          onClick={onClose}
          aria-label="Close winners list"
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            border: "none",
            background: "transparent",
            color: "#94a3b8",
            fontSize: "24px",
            lineHeight: 1,
            padding: 0,
            cursor: "pointer",
            zIndex: 3,
          }}
        >
          ×
        </button>

        <div
          style={{
            padding: "20px 24px 12px",
            borderBottom: "1px solid #f1f5f9",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#94a3b8",
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            Winners List
          </p>
        </div>

        {/* List */}
        <div
          className="no-scrollbar"
          style={{ overflowY: "auto", flex: 1, padding: "16px" }}
        >
          {winners.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                color: "#94a3b8",
                padding: "48px 0",
              }}
            >
              <p style={{ fontWeight: 600, margin: 0, color: "#64748b" }}>
                No winners yet
              </p>
              <p style={{ fontSize: "13px", marginTop: "4px" }}>
                Draw a winner to get started!
              </p>
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              {winners.map((w, i) => (
                <div
                  key={`${w.round}-${w.name}-${i}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "11px 14px",
                    background: "#f8faff",
                    border: "1px solid #dbeafe",
                    borderRadius: "12px",
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      flexShrink: 0,
                      background: "#dbeafe",
                      border: "1.5px solid #93c5fd",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      fontWeight: 800,
                      color: "#2563eb",
                    }}
                  >
                    {w.round}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        color: "#1e293b",
                        fontWeight: 700,
                        fontSize: "0.92rem",
                        margin: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {w.name}
                    </p>
                    <p
                      style={{
                        color: "#94a3b8",
                        fontSize: "11px",
                        margin: "2px 0 0",
                      }}
                    >
                      {w.campus ? `${w.campus} · ` : ""}Round {w.round} ·{" "}
                      {w.timestamp}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 24px",
            borderTop: "1px solid #f1f5f9",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#f8fafc",
          }}
        >
          <span style={{ fontSize: "12px", color: "#94a3b8" }}>
            {winners.length} winner{winners.length !== 1 ? "s" : ""} drawn
          </span>
          <button
            onClick={onClose}
            style={{
              padding: "6px 18px",
              borderRadius: "20px",
              background: "#2563eb",
              border: "none",
              color: "#fff",
              fontSize: "12px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
