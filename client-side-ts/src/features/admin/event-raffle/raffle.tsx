import {
  drawRaffleWinner,
  getEligibleRaffleAttendeesV2,
  undoRaffleWinner,
} from "@/features/events/api/eventService";
import type {
  DrawRaffleWinnerResponse,
  RaffleAttendeeDto,
} from "@/features/events/types/event.types";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import {
  RaffleBackground,
  RaffleControls,
  RaffleSlotMachine,
  WinnerDeclaredModal,
  WinnersModal,
} from "./components";

// ─── Layout ───────────────────────────────────────────────────────────────────
const ITEM_HEIGHT = 96;
const VISIBLE = 5;
const CENTER_SLOT = Math.floor(VISIBLE / 2);

// ─── Animation tuning ────────────────────────────────────────────────────────
const MIN_SPIN_TIME = 2000; // cruise phase before braking
const WAITING_HINT_DELAY = 5000;
const RESET_UNDO_TIMEOUT_MS = 12000;
const RESET_UNDO_RETRY_COUNT = 1;
const ACCEL_DURATION = 1200;
const START_SPEED = 0.35;
const MAX_CRUISE_SPEED = 2.1;
const BRAKE_DURATION_MIN = 2800;
const BRAKE_DURATION_MAX = 6000;
const BRAKE_ITEMS = 80; // was 50 — more runway = gentler entry into brake
const WINNER_IDX = 80; // was 80 — push winner deeper so reel has room
const MIN_BRAKE_START_SPEED = 0.8;
// ─── Reel cap ─────────────────────────────────────────────────────────────────

const REEL_SIZE = WINNER_IDX + BRAKE_ITEMS + VISIBLE + 40;

const CAMPUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "all", label: "All Campuses" },
  { value: "UC-Main", label: "UC Main" },
  { value: "UC-Banilad", label: "UC Banilad" },
  { value: "UC-LM", label: "UCLM" },
  { value: "UC-PT", label: "UCPT" },
];

/** easeOutCubic: fast start, guaranteed stop at t=1 with zero velocity. */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timer);
        reject(error);
      });
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────
type Winner = {
  attendeeId: string;
  name: string;
  campus?: string;
  round: number;
  timestamp: string;
};

type ResetRequest = {
  winnerIds: string[];
  label: string;
  campus: string;
};

type PendingWinner = DrawRaffleWinnerResponse["winner"] | null;

// ─── Reel generation ──────────────────────────────────────────────────────────

/** Unbiased Fisher-Yates shuffle — non-mutating. */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Tile the pool in full shuffled passes until we have `length` items.
 * Seam guard prevents the same name back-to-back between passes.
 */
function buildReelPool(pool: string[], length: number): string[] {
  if (pool.length === 0) return Array(length).fill("No Participants");
  if (pool.length === 1) return Array(length).fill(pool[0]);

  const reel: string[] = [];
  while (reel.length < length) {
    const pass = shuffle(pool);
    if (
      reel.length > 0 &&
      pass[0] === reel[reel.length - 1] &&
      pass.length > 1
    ) {
      [pass[0], pass[1]] = [pass[1], pass[0]];
    }
    reel.push(...pass.slice(0, length - reel.length));
  }
  return reel;
}

// function buildFullReel(pool: string[], winner: string): string[] {
//   const reel = buildReelPool(pool, REEL_SIZE);
//   reel[WINNER_IDX] = winner;
//   return reel;
// }

// /** Pixel offset at which WINNER_IDX is centered in the viewport. */
// function winnerOffset(): number {
//   return -((WINNER_IDX - CENTER_SLOT) * ITEM_HEIGHT);
// }

// ─── Component ────────────────────────────────────────────────────────────────
export default function RaffleDraw({
  eventName,
  eventDate,
}: {
  eventName?: string;
  eventDate?: string;
}) {
  const { eventId } = useParams<{ eventId: string }>();
  const normalizedEventId = eventId?.trim() ?? "";

  const [allParticipants, setAllParticipants] = useState<RaffleAttendeeDto[]>(
    []
  );
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(true);
  const [, setLoadError] = useState<string | null>(null);

  const [winners, setWinners] = useState<Winner[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [showWinners, setShowWinners] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [round, setRound] = useState(1);
  const [reelItems, setReelItems] = useState<string[]>(() =>
    buildReelPool([], VISIBLE + 2)
  );
  const [isRedrawing, setIsRedrawing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [winnerLit, setWinnerLit] = useState(false);
  const [pendingWinner, setPendingWinner] = useState<PendingWinner>(null);
  const [pendingReset, setPendingReset] = useState<ResetRequest | null>(null);
  const [isWaitingForWinner, setIsWaitingForWinner] = useState(false);
  const [selectedCampus, setSelectedCampus] = useState<string>("all");

  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const fetchedWinnerRef = useRef<PendingWinner>(null);
  const hasInitializedWinnersRef = useRef(false);

  const reelRef = useRef<HTMLDivElement>(null);

  const setTransform = useCallback((offset: number) => {
    if (reelRef.current) {
      reelRef.current.style.transform = `translateY(${offset}px)`;
    }
  }, []);

  useEffect(() => {
    hasInitializedWinnersRef.current = false;
    setWinners([]);
    setRound(1);
  }, [normalizedEventId]);

  // ─── Load participants ───────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const loadPool = async () => {
      if (!normalizedEventId) {
        setIsLoadingParticipants(false);
        return;
      }
      setIsLoadingParticipants(true);
      setLoadError(null);
      try {
        const campusParam =
          selectedCampus === "all" ? undefined : selectedCampus;
        const pool = await getEligibleRaffleAttendeesV2(normalizedEventId, {
          campus: campusParam,
        });
        if (cancelled) return;
        setAllParticipants(pool.eligible);

        // Build round numbering once from the all-campus list so campus
        // filters keep the same global winner positions.
        if (!hasInitializedWinnersRef.current) {
          const winnersSource =
            selectedCampus === "all"
              ? pool
              : await getEligibleRaffleAttendeesV2(normalizedEventId);

          if (cancelled) return;

          const historical = (winnersSource.winners ?? []).map((w, i) => ({
            attendeeId: w.attendeeId,
            name: w.name,
            campus: w.campus,
            round: i + 1,
            timestamp: "Previously Drawn",
          }));
          setWinners(historical);
          setRound(historical.length + 1);
          hasInitializedWinnersRef.current = true;
        }

        setTotalParticipants(
          (pool.eligible?.length ?? 0) + (pool.winners?.length ?? 0)
        );
        setReelItems(
          buildReelPool(
            pool.eligible.map((a) => a.name).filter(Boolean),
            VISIBLE + 2
          )
        );

        // Keep idle preview visible after campus changes or pool refresh.
        setTransform(0);
        setWinnerLit(false);
      } catch {
        if (!cancelled) setLoadError("Failed to load raffle pool.");
      } finally {
        if (!cancelled) setIsLoadingParticipants(false);
      }
    };
    void loadPool();
    return () => {
      cancelled = true;
    };
  }, [normalizedEventId, selectedCampus]);

  // ─── Fullscreen ──────────────────────────────────────────────────────────────
  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement)
      await containerRef.current?.requestFullscreen();
    else await document.exitFullscreen();
  }, []);

  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  // ─── Core draw ───────────────────────────────────────────────────────────────
  const drawWinner = useCallback(() => {
    if (isSpinning || isResetting || allParticipants.length === 0) return;

    setIsSpinning(true);
    setWinnerLit(false);
    setShowConfetti(false);
    setIsWaitingForWinner(false);
    fetchedWinnerRef.current = null;

    const participantNames = allParticipants.map((a) => a.name).filter(Boolean);
    const idleReel = buildReelPool(participantNames, REEL_SIZE);
    const reelCycleHeight = idleReel.length * ITEM_HEIGHT;
    setReelItems(idleReel);

    setTransform(0);

    // ── Animation state ────────────────────────────────────────────────────────
    let phase: "cruise" | "brake" = "cruise";
    let offset = 0;
    let currentSpeed = START_SPEED;
    let prevTime: number | null = null;
    const spinStartedAt = performance.now();

    // Set when braking begins:
    let brakeStartOffset = 0;
    let brakeStartTime = 0;
    let targetOffset = 0;
    let brakeDurationMs = BRAKE_DURATION_MIN;

    // ── RAF loop ───────────────────────────────────────────────────────────────
    const tick = (now: number) => {
      const dt = prevTime === null ? 0 : Math.min(now - prevTime, 64);
      prevTime = now;

      if (phase === "cruise") {
        const cruiseElapsed = now - spinStartedAt;
        const accelT = Math.min(cruiseElapsed / ACCEL_DURATION, 1);
        const accelEased = easeOutCubic(accelT);
        currentSpeed =
          START_SPEED + (MAX_CRUISE_SPEED - START_SPEED) * accelEased;

        offset -= currentSpeed * dt;

        // Keep the reel in a visible range while waiting for slow API responses.
        if (reelCycleHeight > 0 && offset <= -reelCycleHeight) {
          offset = -(-offset % reelCycleHeight);
        }

        setTransform(offset);

        rafRef.current = requestAnimationFrame(tick);
      } else {
        // ── Brake phase: time-based easing ────────────────────────────────────
        const elapsed = now - brakeStartTime;
        const t = Math.min(elapsed / brakeDurationMs, 1.0);
        const eased = easeOutCubic(t);

        const currentOffset =
          brakeStartOffset + (targetOffset - brakeStartOffset) * eased;

        setTransform(currentOffset);

        if (t < 1.0) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          // Snap to exact pixel, end animation
          setTransform(targetOffset);
          setIsSpinning(false);
          setWinnerLit(true);

          if (fetchedWinnerRef.current) {
            setShowConfetti(true);
            setPendingWinner(fetchedWinnerRef.current);
            setTimeout(() => setShowConfetti(false), 4500);
          }
        }
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    const startBraking = (winnerName: string, now: number) => {
      // 1. Current slot position
      const currentIndex = Math.ceil(Math.abs(offset) / ITEM_HEIGHT);

      // 2. Winner goes BRAKE_ITEMS slots ahead — guaranteed runway
      const winnerIndex = currentIndex + BRAKE_ITEMS;

      const neededSize = winnerIndex + VISIBLE + 10;
      const brakeReel = buildReelPool(participantNames, neededSize);
      brakeReel[winnerIndex] = winnerName;

      setReelItems(brakeReel);

      // 4. Capture exact start state for easing
      brakeStartOffset = offset;
      brakeStartTime = now;
      targetOffset = -((winnerIndex - CENTER_SLOT) * ITEM_HEIGHT);

      const distanceToTarget = Math.max(
        1,
        Math.abs(targetOffset - brakeStartOffset)
      );
      const continuitySpeed = Math.max(currentSpeed, MIN_BRAKE_START_SPEED);
      const computedBrakeDuration = (3 * distanceToTarget) / continuitySpeed;
      brakeDurationMs = Math.min(
        BRAKE_DURATION_MAX,
        Math.max(BRAKE_DURATION_MIN, computedBrakeDuration)
      );

      // 5. Flip phase — next tick uses easing formula
      phase = "brake";
    };

    // ── API & timer sync ───────────────────────────────────────────────────────
    const minSpinPromise = new Promise<number>((resolve) =>
      setTimeout(() => resolve(performance.now()), MIN_SPIN_TIME)
    );
    const apiPromise = drawRaffleWinner(normalizedEventId, {
      campus: selectedCampus === "all" ? undefined : selectedCampus,
    });

    const waitingHintTimeout = window.setTimeout(() => {
      if (!fetchedWinnerRef.current) {
        setIsWaitingForWinner(true);
      }
    }, WAITING_HINT_DELAY);

    Promise.all([apiPromise, minSpinPromise])
      .then(([apiResponse, resolvedAt]) => {
        fetchedWinnerRef.current = apiResponse.winner;
        startBraking(apiResponse.winner.name, resolvedAt);
      })
      .catch((error) => {
        console.error("Failed to draw from server:", error);
        startBraking("Draw Error", performance.now());
      })
      .finally(() => {
        window.clearTimeout(waitingHintTimeout);
        setIsWaitingForWinner(false);
      });
  }, [
    isSpinning,
    isResetting,
    normalizedEventId,
    allParticipants,
    selectedCampus,
    setTransform,
  ]);

  // ─── Winner actions ───────────────────────────────────────────────────────────
  const handleConfirmWinner = () => {
    if (!pendingWinner) return;
    setWinners((prev) => [
      ...prev,
      {
        attendeeId: pendingWinner.attendeeId,
        name: pendingWinner.name,
        campus: pendingWinner.campus,
        round,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
    setAllParticipants((prev) =>
      prev.filter((a) => a.attendeeId !== pendingWinner.attendeeId)
    );
    setRound((r) => r + 1);
    setPendingWinner(null);
    setWinnerLit(false);
  };

  const handleRedraw = async () => {
    if (!pendingWinner || isRedrawing) return;
    setIsSpinning(true);
    setIsRedrawing(true);
    try {
      await undoRaffleWinner(normalizedEventId, pendingWinner.attendeeId);
      setPendingWinner(null);
      setWinnerLit(false);
      setShowConfetti(false);
      setTimeout(() => {
        setIsRedrawing(false);
        drawWinner();
      }, 100);
    } catch (error) {
      console.error("Undo failed:", error);
      alert("Failed to undo winner. Please try again.");
      setIsSpinning(false);
      setIsRedrawing(false);
    }
  };

  const clearWinnerModalState = () => {
    setPendingWinner(null);
    setWinnerLit(false);
    setShowConfetti(false);
  };

  const handleCloseModal = () => {
    if (isRedrawing) return;

    if (!pendingWinner) {
      clearWinnerModalState();
      return;
    }

    const attendeeIdToUndo = pendingWinner.attendeeId;
    clearWinnerModalState();
    setIsSpinning(false);

    void undoRaffleWinner(normalizedEventId, attendeeIdToUndo).catch(
      (error) => {
        console.error("Reject failed:", error);
        alert("Failed to reject winner. Please try again.");
      }
    );
  };

  const resetAll = () => {
    if (isSpinning || isResetting) return;

    const winnersToReset =
      selectedCampus === "all"
        ? winners
        : winners.filter((winner) => winner.campus === selectedCampus);

    if (winnersToReset.length === 0) {
      return;
    }

    const label =
      selectedCampus === "all"
        ? "all winners"
        : `all ${selectedCampus} winners`;

    setPendingReset({
      winnerIds: winnersToReset.map((winner) => winner.attendeeId),
      label,
      campus: selectedCampus,
    });
  };

  const cancelResetAll = () => {
    if (isSpinning || isResetting) return;
    setPendingReset(null);
  };

  const confirmResetAll = async () => {
    if (isSpinning || isResetting || !pendingReset) return;

    const { winnerIds, campus } = pendingReset;
    setPendingReset(null);

    setIsResetting(true);
    try {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      const succeededIds: string[] = [];
      const failedIds: string[] = [];

      for (const attendeeId of winnerIds) {
        let isUndone = false;

        for (let attempt = 0; attempt <= RESET_UNDO_RETRY_COUNT; attempt++) {
          try {
            await withTimeout(
              undoRaffleWinner(normalizedEventId, attendeeId),
              RESET_UNDO_TIMEOUT_MS
            );
            succeededIds.push(attendeeId);
            isUndone = true;
            break;
          } catch {
            // Retry transient failures once before marking as failed.
          }
        }

        if (!isUndone) {
          failedIds.push(attendeeId);
        }
      }

      const failedCount = failedIds.length;

      if (succeededIds.length > 0) {
        const succeededSet = new Set(succeededIds);
        const remainingWinners = winners.filter(
          (winner) => !succeededSet.has(winner.attendeeId)
        );
        setWinners(remainingWinners);
        setRound(
          remainingWinners.length > 0
            ? Math.max(...remainingWinners.map((winner) => winner.round)) + 1
            : 1
        );
      }

      if (failedCount > 0) {
        alert(`${failedCount} winner(s) could not be reset. Please try again.`);
      }

      setWinnerLit(false);
      setTransform(0);
      setPendingWinner(null);
      setShowConfetti(false);

      const pool = await getEligibleRaffleAttendeesV2(normalizedEventId, {
        campus: campus === "all" ? undefined : campus,
      });

      const globalPool =
        campus === "all"
          ? pool
          : await getEligibleRaffleAttendeesV2(normalizedEventId);

      const refreshedWinners = (globalPool.winners ?? []).map(
        (winner, index) => ({
          attendeeId: winner.attendeeId,
          name: winner.name,
          campus: winner.campus,
          round: index + 1,
          timestamp: "Previously Drawn",
        })
      );

      setWinners(refreshedWinners);
      setRound(refreshedWinners.length + 1);
      hasInitializedWinnersRef.current = true;

      setAllParticipants(pool.eligible);
      setTotalParticipants(
        (pool.eligible?.length ?? 0) + (pool.winners?.length ?? 0)
      );
      setReelItems(
        buildReelPool(
          pool.eligible.map((a) => a.name).filter(Boolean),
          VISIBLE + 2
        )
      );
    } catch (error) {
      console.error("Failed to reset raffle:", error);
      alert("Failed to reset the raffle. Please try again.");
    } finally {
      setIsResetting(false);
    }
  };

  const filteredWinners =
    selectedCampus === "all"
      ? winners
      : winners.filter((winner) => winner.campus === selectedCampus);

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden select-none"
      style={{
        background: "#f0f4ff",
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}
    >
      <RaffleBackground showConfetti={showConfetti} />

      <div className="absolute top-5 right-5 z-30 flex gap-2">
        <button
          onClick={toggleFullscreen}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 14px",
            borderRadius: "10px",
            fontSize: "13px",
            fontWeight: 500,
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            color: "#64748b",
            cursor: "pointer",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}
        >
          <svg
            width="13"
            height="13"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {isFullscreen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 9V4.5M9 9H4.5M15 9h4.5M15 9V4.5M9 15v4.5M9 15H4.5M15 15h4.5M15 15v4.5"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5h-4m4 0v-4m0 4l-5-5"
              />
            )}
          </svg>
          Fullscreen
        </button>
        <button
          onClick={() => setShowWinners(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 14px",
            borderRadius: "10px",
            fontSize: "13px",
            fontWeight: 700,
            background: "#2563eb",
            border: "1px solid #1d4ed8",
            color: "#ffffff",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(37,99,235,0.3)",
          }}
        >
          ★ Winners
          {filteredWinners.length > 0 && (
            <span
              style={{
                background: "#ffffff",
                color: "#2563eb",
                fontSize: "11px",
                fontWeight: 800,
                borderRadius: "50%",
                width: "18px",
                height: "18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {filteredWinners.length}
            </span>
          )}
        </button>
      </div>

      <div
        className="relative z-10 flex w-full flex-col items-center"
        style={{
          gap: "28px",
          maxWidth: "800px",
          padding: "0 20px",
          marginTop: "2rem",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p
            style={{
              fontSize: "clamp(0.75rem, 2vw, 1.1rem)",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: "#94a3b8",
              marginBottom: "12px",
              fontWeight: 700,
            }}
          >
            Raffle Draw
          </p>
          <h1
            style={{
              fontSize: "clamp(2.5rem, 7vw, 5rem)",
              fontWeight: 900,
              color: "#1e293b",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              margin: "0 0 12px",
              textShadow: "0 4px 10px rgba(0,0,0,0.05)",
              padding: "0 20px",
            }}
          >
            {eventName || "ICT CONGRESS 2026"}
          </h1>
          {eventDate && (
            <p
              style={{
                fontSize: "clamp(0.85rem, 2.5vw, 1.25rem)",
                color: "#94a3b8",
                margin: 0,
                fontWeight: 500,
              }}
            >
              {eventDate}
            </p>
          )}
        </div>
        <RaffleSlotMachine
          reelRef={reelRef}
          reelItems={reelItems}
          isAnimating={isSpinning}
          winnerLit={winnerLit}
        />

        <p
          style={{
            fontSize: "11px",
            color: "#94a3b8",
            letterSpacing: "0.05em",
            margin: 0,
          }}
        >
          {allParticipants.length} of {totalParticipants} participants remaining
        </p>

        {isSpinning && isWaitingForWinner && (
          <p
            style={{
              fontSize: "12px",
              color: "#64748b",
              letterSpacing: "0.04em",
              margin: 0,
            }}
          >
            Still getting winner from server. Spin will stop automatically.
          </p>
        )}

        <RaffleControls
          isSpinning={isSpinning}
          isResetting={isResetting}
          isLoadingParticipants={isLoadingParticipants}
          poolLength={allParticipants.length}
          winnersCount={filteredWinners.length}
          selectedCampus={selectedCampus}
          campusOptions={CAMPUS_OPTIONS}
          onCampusChange={setSelectedCampus}
          onDraw={drawWinner}
          onReset={resetAll}
          disableReset={false}
        />
      </div>

      {showWinners && (
        <WinnersModal
          winners={filteredWinners}
          onClose={() => setShowWinners(false)}
        />
      )}
      {pendingWinner && (
        <WinnerDeclaredModal
          winner={pendingWinner.name}
          campus={pendingWinner.campus}
          round={round}
          onConfirm={handleConfirmWinner}
          onRedraw={handleRedraw}
          onClose={handleCloseModal}
          isRedrawing={isRedrawing}
        />
      )}

      {pendingReset && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(10px)",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "460px",
              background: "#ffffff",
              borderRadius: "24px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 20px 60px rgba(15,23,42,0.25)",
              padding: "24px",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "12px",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#64748b",
                fontWeight: 700,
              }}
            >
              Confirm Reset
            </p>
            <h3
              style={{
                margin: "8px 0 10px",
                color: "#0f172a",
                fontSize: "1.3rem",
                fontWeight: 800,
              }}
            >
              Reset {pendingReset.label}?
            </h3>
            <p
              style={{
                margin: 0,
                color: "#475569",
                lineHeight: 1.45,
                fontSize: "0.95rem",
              }}
            >
              This will return {pendingReset.winnerIds.length} winner
              {pendingReset.winnerIds.length !== 1 ? "s" : ""} to the raffle
              pool.
            </p>

            <div
              style={{
                marginTop: "18px",
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
              }}
            >
              <button
                onClick={cancelResetAll}
                disabled={isResetting}
                style={{
                  padding: "10px 16px",
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  color: "#475569",
                  fontWeight: 600,
                  cursor: isResetting ? "not-allowed" : "pointer",
                  opacity: isResetting ? 0.65 : 1,
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmResetAll}
                disabled={isResetting}
                style={{
                  padding: "10px 16px",
                  borderRadius: "10px",
                  border: "1px solid #dc2626",
                  background: "#dc2626",
                  color: "#ffffff",
                  fontWeight: 700,
                  cursor: isResetting ? "not-allowed" : "pointer",
                  opacity: isResetting ? 0.65 : 1,
                }}
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes cfall {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(115vh) rotate(600deg); opacity: 0; }
        }
        @keyframes drawPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.65; } }
        @keyframes ringPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.55; } }
      `}</style>
    </div>
  );
}
