import { useState, useEffect } from "react";
import { getCronStatus, triggerCron } from "../api/devtools.api";
import type { CronExecutionLog } from "../types/devtools.types";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { showToast } from "@/utils/alertHelper";
import { ChevronDown, ChevronRight, Play } from "lucide-react";

const JOB_NAMES = [
  "promo-check",
  "email-resend",
  "cancel-expired-orders",
  "student-year4-suspend",
];

export const CronMonitorPanel = () => {
  const [logs, setLogs] = useState<CronExecutionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [triggering, setTriggering] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const allLogs: CronExecutionLog[] = [];
      for (const job of JOB_NAMES) {
        const data = await getCronStatus(job, 10);
        allLogs.push(...data);
      }
      allLogs.sort(
        (a, b) =>
          new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      );
      setLogs(allLogs);
    } catch {
      showToast("error", "Failed to load cron status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleTrigger = async (job: string) => {
    setTriggering(job);
    try {
      if (job === "student-year4-suspend") {
        await triggerCron("student-year4-suspend");
      } else {
        await triggerCron(
          job === "cancel-expired-orders" ? "promo-check" : job
        );
      }
      showToast("success", `${job} triggered`);
      fetchLogs();
    } catch {
      showToast("error", "Failed to trigger job");
    } finally {
      setTriggering(null);
    }
  };

  const getJobSummary = (jobName: string) => {
    const jobLogs = logs.filter((l) => l.jobName === jobName);
    if (jobLogs.length === 0)
      return { lastRun: "Never", duration: "-", success: false, error: null };

    const latest = jobLogs[0];
    const duration = latest.durationMs
      ? `${(latest.durationMs / 1000).toFixed(1)}s`
      : "-";
    const success = latest.success;
    const error = latest.errorMessage || null;

    return {
      lastRun: new Date(latest.startedAt).toLocaleString(),
      duration,
      success,
      error,
    };
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-[#8a8a8a]">
          {JOB_NAMES.length} scheduled jobs
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={fetchLogs}
        >
          Refresh
        </Button>
      </div>

      <div className="space-y-2">
        {JOB_NAMES.map((job) => {
          const summary = getJobSummary(job);
          const isExpanded = expandedJob === job;
          const jobLogs = logs.filter((l) => l.jobName === job);

          const scheduleMap: Record<string, string> = {
            "promo-check": "Daily at midnight UTC",
            "email-resend": "Daily at 1:00 AM (Asia/Manila)",
            "cancel-expired-orders":
              "1st of every month, 12:00 AM (Asia/Manila)",
            "student-year4-suspend":
              "Daily at midnight (Asia/Manila): age/year rule",
          };

          return (
            <div
              key={job}
              className="rounded-xl border border-[#e5e5e5] bg-white"
            >
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setExpandedJob(isExpanded ? null : job)}
                    className="text-[#8a8a8a]"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                  <div>
                    <p className="text-sm font-medium text-[#2b2b2b] capitalize">
                      {job.replace(/-/g, " ")}
                    </p>
                    <p className="text-xs text-[#8a8a8a]">{scheduleMap[job]}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p
                      className={`text-xs font-medium ${summary.success ? "text-green-600" : summary.error ? "text-red-600" : "text-[#8a8a8a]"}`}
                    >
                      {summary.lastRun === "Never"
                        ? "Never run"
                        : summary.success
                          ? "Success"
                          : summary.error
                            ? "Failed"
                            : "-"}
                    </p>
                    <p className="text-xs text-[#8a8a8a]">
                      {summary.duration} · {summary.lastRun}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 rounded-full"
                    disabled={triggering !== null}
                    onClick={() => handleTrigger(job)}
                  >
                    <Play className="mr-1 h-3 w-3" />
                    Run
                  </Button>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-[#ededed] px-5 py-3">
                  {jobLogs.length === 0 ? (
                    <p className="text-sm text-[#8a8a8a]">
                      No executions recorded yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {jobLogs.slice(0, 5).map((log) => (
                        <div
                          key={log._id}
                          className="flex items-start justify-between rounded-lg bg-[#f9f9f9] p-3 text-sm"
                        >
                          <div>
                            <p
                              className={`font-medium ${log.success ? "text-green-600" : "text-red-600"}`}
                            >
                              {log.success ? "Success" : "Failed"}
                            </p>
                            <p className="text-xs text-[#8a8a8a]">
                              {new Date(log.startedAt).toLocaleString()} ·{" "}
                              {log.durationMs
                                ? (log.durationMs / 1000).toFixed(1) + "s"
                                : "-"}
                            </p>
                            {log.errorMessage && (
                              <p className="mt-1 text-xs text-red-500">
                                {log.errorMessage}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
