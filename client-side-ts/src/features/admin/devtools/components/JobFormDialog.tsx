import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { showToast } from "@/utils/alertHelper";
import { createJob, updateJob } from "../api/automation.api";
import type { AutomationJob, CreateJobInput, JobSchedule, EmailConfig } from "../types/automation.types";
import { TargetSelector } from "./TargetSelector";
import { ScheduleBuilder } from "./ScheduleBuilder";
import { FunctionRegistry } from "./FunctionRegistry";
import { JobExecutionLogs } from "./JobExecutionLogs";

interface JobFormDialogProps {
  open: boolean;
  onClose: () => void;
  job?: AutomationJob | null;
  onSuccess: () => void;
}

const DEFAULT_SCHEDULE: JobSchedule = { type: "daily", time: "09:00" };
const DEFAULT_EMAIL_CONFIG: EmailConfig = {
  enabled: true,
  subjectTemplate: "{{jobName}} - {{date}}",
  includeSummary: true,
  includeRawData: false,
  useNoetix: false,
  skipIfEmpty: false,
};

export const JobFormDialog = ({ open, onClose, job, onSuccess }: JobFormDialogProps) => {
  const isEdit = Boolean(job);

  const [name, setName] = useState(job?.name ?? "");
  const [description, setDescription] = useState(job?.description ?? "");
  const [targetType, setTargetType] = useState<"admin" | "role" | "permission">(job?.targetType ?? "role");
  const [targetIds, setTargetIds] = useState<string[]>(job?.targetIds ?? []);
  const [functionKeys, setFunctionKeys] = useState<string[]>(job?.functionKeys ?? []);
  const [schedule, setSchedule] = useState<JobSchedule>(job?.schedule ?? DEFAULT_SCHEDULE);
  const [emailConfig, setEmailConfig] = useState<EmailConfig>(job?.emailConfig ?? DEFAULT_EMAIL_CONFIG);
  const [saving, setSaving] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  useEffect(() => {
    if (job) {
      setName(job.name);
      setDescription(job.description ?? "");
      setTargetType(job.targetType);
      setTargetIds(job.targetIds ?? []);
      setFunctionKeys(job.functionKeys ?? []);
      setSchedule(job.schedule);
      setEmailConfig(job.emailConfig);
    }
  }, [job]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      showToast("error", "Job name is required");
      return;
    }
    if (functionKeys.length === 0) {
      showToast("error", "Select at least one function");
      return;
    }
    if (targetIds.length === 0) {
      showToast("error", "Select at least one target");
      return;
    }

    setSaving(true);
    try {
      const input: CreateJobInput = {
        name: name.trim(),
        description: description.trim() || undefined,
        targetType,
        targetIds,
        functionKeys,
        schedule,
        emailConfig,
      };

      if (isEdit && job) {
        await updateJob(job._id, input);
        showToast("success", "Job updated");
      } else {
        await createJob(input);
        showToast("success", "Job created");
      }
      onSuccess();
      onClose();
    } catch {
      showToast("error", "Failed to save job");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-[20px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Automation Job" : "Create Automation Job"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name & Description */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-[#555]">Job Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Daily Stock Alert"
              className="rounded-lg"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium text-[#555]">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              className="rounded-lg resize-none"
              rows={2}
            />
          </div>

          {/* Target */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-[#555]">Target Recipients *</Label>
            <TargetSelector
              value={{ type: targetType, ids: targetIds }}
              onChange={(v) => { setTargetType(v.type as "admin" | "role" | "permission"); setTargetIds(v.ids); }}
            />
          </div>

          {/* Functions */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-[#555]">
              Functions ({functionKeys.length} selected)
            </Label>
            <FunctionRegistry
              selectedKeys={functionKeys}
              onSelect={setFunctionKeys}
            />
          </div>

          {/* Schedule */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-[#555]">Schedule</Label>
            <ScheduleBuilder
              value={schedule}
              onChange={(v) => setSchedule(v as JobSchedule)}
            />
          </div>

          {/* Email Config */}
          <div className="space-y-3 rounded-lg border border-[#e5e5e5] bg-white p-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-[#555]">Webhook Report (Make.com)</Label>
              <Switch
                checked={emailConfig.enabled}
                onCheckedChange={(v) => setEmailConfig({ ...emailConfig, enabled: v })}
              />
            </div>
            {emailConfig.enabled && (
              <div className="space-y-2 pl-1">
                <Label className="text-xs text-[#8a8a8a]">Subject Template</Label>
                <Input
                  value={emailConfig.subjectTemplate}
                  onChange={(e) => setEmailConfig({ ...emailConfig, subjectTemplate: e.target.value })}
                  placeholder="{{jobName}} - {{date}}"
                  className="font-mono text-xs"
                />
                <p className="text-xs text-[#8a8a8a]">
                  Placeholders: <code className="bg-[#f0f0f0] px-1 rounded">{'{{jobName}}'}</code> <code className="bg-[#f0f0f0] px-1 rounded">{'{{date}}'}</code>
                </p>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-[#555]">
                    <input
                      type="checkbox"
                      checked={emailConfig.includeSummary}
                      onChange={(e) => setEmailConfig({ ...emailConfig, includeSummary: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    Include summary
                  </label>
                  <label className="flex items-center gap-2 text-sm text-[#555]">
                    <input
                      type="checkbox"
                      checked={emailConfig.includeRawData}
                      onChange={(e) => setEmailConfig({ ...emailConfig, includeRawData: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    Include raw data
                  </label>
                </div>
                <div className="flex items-center gap-3 border-t border-[#f0f0f0] pt-3">
                  <Switch
                    checked={emailConfig.skipIfEmpty ?? false}
                    onCheckedChange={(v) => setEmailConfig({ ...emailConfig, skipIfEmpty: v })}
                  />
                  <div>
                    <label className="text-sm text-[#555]">Only send when there's something to report</label>
                    <p className="text-xs text-[#8a8a8a] mt-0.5">
                      Skips the webhook payload when every selected function returns zero records. Failures are always sent.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 border-t border-[#f0f0f0] pt-3">
                  <Switch
                    checked={emailConfig.useNoetix}
                    onCheckedChange={(v) => setEmailConfig({ ...emailConfig, useNoetix: v })}
                  />
                  <div>
                      <label className="text-sm text-[#555]">Request Noetix analysis</label>
                      <p className="text-xs text-[#8a8a8a] mt-0.5">Flag passed to Make.com so it can run Noetix on the job data before sending the report</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Execution Logs (edit mode) */}
        {isEdit && job && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowLogs(!showLogs)}
              className="text-sm text-[#1c9dde] hover:underline"
            >
              {showLogs ? "Hide" : "Show"} Execution Logs
            </button>
            {showLogs && (
              <div className="rounded-lg border border-[#e5e5e5] bg-[#fafafa] p-3">
                <JobExecutionLogs jobId={job._id} />
              </div>
            )}
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="rounded-full bg-[#1c9dde] hover:bg-[#168bc7]"
            disabled={saving}
            onClick={handleSubmit}
          >
            {saving ? "Saving..." : isEdit ? "Update Job" : "Create Job"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
