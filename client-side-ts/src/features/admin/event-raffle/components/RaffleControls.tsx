import React from "react";

interface RaffleControlsProps {
  isSpinning: boolean;
  isResetting?: boolean;
  isLoadingParticipants?: boolean;
  poolLength: number;
  winnersCount: number;
  selectedCampus?: string;
  campusOptions: Array<{ value: string; label: string }>;
  onCampusChange: (campus: string) => void;
  onDraw: () => void;
  onReset: () => void;
  disableReset?: boolean;
}

export const RaffleControls: React.FC<RaffleControlsProps> = ({
  isSpinning,
  isResetting = false,
  isLoadingParticipants = false,
  poolLength,
  winnersCount,
  selectedCampus,
  campusOptions,
  onCampusChange,
  onDraw,
  onReset,
  disableReset = false,
}) => {
  const isBusy = isSpinning || isLoadingParticipants || isResetting;
  const [showCampusFilters, setShowCampusFilters] = React.useState(
    selectedCampus !== undefined && selectedCampus !== "all"
  );

  React.useEffect(() => {
    if (selectedCampus && selectedCampus !== "all") {
      setShowCampusFilters(true);
    }
  }, [selectedCampus]);

  return (
    <div className="mt-4 flex w-full flex-col items-center gap-6">
      {/* Primary Actions */}
      <div className="flex flex-wrap justify-center gap-3">
        <button
          onClick={onDraw}
          disabled={isBusy || poolLength === 0}
          className="btn btn-primary px-8 py-3 text-lg font-bold shadow-md transition-all hover:shadow-lg"
          aria-disabled={isBusy || poolLength === 0}
        >
          {(isSpinning || isLoadingParticipants) && (
            <span
              aria-hidden="true"
              className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent align-[-0.125em]"
            />
          )}
          {isSpinning
            ? "Spinning..."
            : isLoadingParticipants
              ? "Loading Pool..."
              : isResetting
                ? "Resetting..."
                : "Draw Winner"}
        </button>

        {winnersCount > 0 && (
          <button
            onClick={onReset}
            disabled={disableReset || isBusy}
            className="btn btn-secondary px-6 py-3"
            style={{
              opacity: disableReset || isBusy ? 0.5 : 1,
              cursor: disableReset || isBusy ? "not-allowed" : "pointer",
            }}
          >
            {isResetting ? "Resetting..." : "Reset"}
          </button>
        )}
      </div>

      <div className="flex w-full flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => setShowCampusFilters((prev) => !prev)}
          disabled={isBusy}
          aria-expanded={showCampusFilters}
          className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-all ${
            isBusy
              ? "cursor-not-allowed opacity-50"
              : "cursor-pointer hover:bg-slate-100/70 dark:hover:bg-zinc-700/60"
          } ${
            selectedCampus && selectedCampus !== "all"
              ? "border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
              : "border-slate-200 bg-white/70 text-slate-600 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-slate-300"
          }`}
        >
          <span className="inline-flex items-center gap-2">
            <span>
              {selectedCampus && selectedCampus !== "all"
                ? `Campus: ${campusOptions.find((c) => c.value === selectedCampus)?.label ?? selectedCampus}`
                : "All Campuses"}
            </span>
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              fill="currentColor"
              className={`h-4 w-4 transition-transform duration-300 ${
                showCampusFilters ? "rotate-180" : "rotate-0"
              }`}
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        </button>

        <div
          className={`grid w-full transition-all duration-300 ease-out ${
            showCampusFilters
              ? "translate-y-0 grid-rows-[1fr] opacity-100"
              : "pointer-events-none -translate-y-1 grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <div className="flex flex-wrap justify-center rounded-2xl border border-slate-200 bg-slate-200/60 p-1.5 shadow-sm backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-800/60">
              {campusOptions.map((option) => {
                const isSelected = selectedCampus === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => {
                      onCampusChange(option.value);
                      if (option.value === "all") {
                        setShowCampusFilters(false);
                      }
                    }}
                    disabled={isBusy}
                    className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200 ${
                      isSelected
                        ? "bg-white text-blue-600 shadow-sm ring-1 ring-black/5 dark:bg-zinc-700 dark:text-blue-400"
                        : "text-slate-600 hover:bg-slate-100/50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-zinc-700/50"
                    } ${isBusy ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
