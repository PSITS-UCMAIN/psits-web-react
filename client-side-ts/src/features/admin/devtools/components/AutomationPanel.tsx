import { useState, useEffect } from "react";
import { getJobs, deleteJob, toggleJob, runJob } from "../api/automation.api";
import type { AutomationJob } from "../types/automation.types";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { showToast } from "@/utils/alertHelper";
import { Plus, Play, Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AutomationPanelProps {
  onCreateJob: () => void;
  onEditJob: (job: AutomationJob) => void;
}

export const AutomationPanel = ({ onCreateJob, onEditJob }: AutomationPanelProps) => {
  const [jobs, setJobs] = useState<AutomationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [triggering, setTriggering] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await getJobs({ limit: 100 });
      setJobs(res.data);
    } catch {
      showToast("error", "Failed to load automation jobs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await deleteJob(id);
      showToast("success", "Job deleted");
      fetchJobs();
    } catch {
      showToast("error", "Failed to delete job");
    } finally {
      setDeleting(null);
      setConfirmDelete(null);
    }
  };

  const handleToggle = async (job: AutomationJob) => {
    try {
      await toggleJob(job._id);
      showToast("success", `Job ${job.isActive ? "disabled" : "enabled"}`);
      fetchJobs();
    } catch {
      showToast("error", "Failed to toggle job");
    }
  };

  const handleRun = async (job: AutomationJob) => {
    setTriggering(job._id);
    try {
      const result = await runJob(job._id);
      if (result.data.webhookSent) {
        showToast("success", `Job "${job.name}" executed — webhook sent to Make.com`);
      } else if (job.emailConfig.enabled) {
        showToast("error", `Job "${job.name}" executed but webhook delivery failed`);
      } else {
        showToast("success", `Job "${job.name}" executed`);
      }
      fetchJobs();
    } catch {
      showToast("error", "Failed to trigger job");
    } finally {
      setTriggering(null);
    }
  };

  const getScheduleLabel = (schedule: AutomationJob["schedule"]) => {
    switch (schedule.type) {
      case "daily":
        return `Daily at ${schedule.time}`;
      case "interval":
        return `Every ${schedule.intervalDays} day(s) at ${schedule.time}`;
      case "weekly": {
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        return `Weekly on ${days[schedule.dayOfWeek ?? 0]} at ${schedule.time}`;
      }
      case "cron":
        return `Cron: ${schedule.cronExpression}`;
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-[#8a8a8a]">{jobs.length} automation job(s)</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={onCreateJob}
        >
          <Plus className="mr-1 h-3 w-3" />
          Create Job
        </Button>
      </div>

      {jobs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#e5e5e5] bg-white p-8 text-center">
          <p className="text-sm text-[#8a8a8a]">No automation jobs yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {jobs.map((job) => (
            <div
              key={job._id}
              className={`rounded-xl border bg-white px-5 py-4 ${
                job.isActive ? "border-[#e5e5e5]" : "border-[#f0f0f0] opacity-70"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#e9f4fb] text-[#1c9dde]">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#2b2b2b]">{job.name}</p>
                    <p className="text-xs text-[#8a8a8a]">{getScheduleLabel(job.schedule)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    job.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}>
                    {job.isActive ? "Active" : "Paused"}
                  </span>
                  <span className="text-xs text-[#8a8a8a]">#{job.runCount} runs</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 rounded-full p-0"
                    disabled={triggering === job._id}
                    onClick={() => handleRun(job)}
                    title="Run now"
                  >
                    <Play className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 rounded-full p-0"
                    onClick={() => handleToggle(job)}
                    title={job.isActive ? "Pause" : "Enable"}
                  >
                    {job.isActive ? <ToggleRight className="h-3 w-3" /> : <ToggleLeft className="h-3 w-3" />}
                  </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 rounded-full p-0"
                      onClick={() => onEditJob(job)}
                      title="Edit"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 rounded-full p-0 text-red-500"
                      disabled={deleting === job._id}
                      onClick={() => setConfirmDelete(job._id)}
                      title="Delete"
                    >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                {job.functionKeys.map((key) => (
                  <span key={key} className="rounded-full bg-[#f0f7fc] px-2 py-0.5 text-xs text-[#1c9dde]">
                    {key}
                  </span>
                ))}
              </div>
              {job.lastRunAt && (
                <p className="mt-2 text-xs text-[#8a8a8a]">
                  Last run: {new Date(job.lastRunAt).toLocaleString()}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={Boolean(confirmDelete)} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <DialogContent className="max-w-sm rounded-[20px]">
          <DialogHeader>
            <DialogTitle>Delete automation job?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#777]">
            This will permanently delete the job and remove its schedule. Execution logs will be retained.
          </p>
          <DialogFooter className="mt-3">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => setConfirmDelete(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-full bg-red-500 hover:bg-red-600"
              disabled={deleting !== null}
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
            >
              {deleting === confirmDelete ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
