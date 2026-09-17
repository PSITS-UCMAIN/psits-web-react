import { useMemo, useState } from "react";
import { CalendarIcon, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { OpenRecruitmentValues } from "../types/Recruitment.types";

import { Switch } from "@/components/ui/switch";
import { TimePicker } from "@/components/ui/TimePicker";
import {
  RECRUITMENT_ROLE_CATALOG,
  type RecruitmentRolePosition,
} from "@/constants/recruitmentRoles";

type Position = RecruitmentRolePosition & {
  enabled: boolean;
  slots?: number;
};

type Role = {
  id: string;
  title: string;
  enabled: boolean;
  positions: Position[];
  slots?: number;
};

const createDefaultRoles = (): Role[] =>
  RECRUITMENT_ROLE_CATALOG.map((role) => ({
    ...role,
    enabled: false,
    positions: role.positions.map((position) => ({
      ...position,
      enabled: false,
    })),
  }));

function formatDateDisplay(date?: Date) {
  if (!date) return "";
  return date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

interface DateInputProps {
  value?: Date;
  placeholder: string;
  active?: boolean;
}

function DateInput({ value, placeholder, active }: DateInputProps) {
  return (
    <div className="relative">
      <CalendarIcon className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <div
        className={`flex h-10 cursor-pointer items-center rounded-lg border pr-3 pl-10 text-sm transition ${
          active ? "border-[#1C9DDE] ring-1 ring-[#1C9DDE]" : "border-[#E5E7EB]"
        }`}
      >
        {value ? (
          formatDateDisplay(value)
        ) : (
          <span className="text-slate-400">{placeholder}</span>
        )}
      </div>
    </div>
  );
}

interface RoleCardProps {
  role: Role;
  onToggleRole: () => void;
  onTogglePosition: (positionId: string) => void;
  onSlotsChange: (positionId: string, slots: number) => void;
  onRoleSlotsChange: (slots: number) => void;
}

function RoleCard({
  role,
  onToggleRole,
  onTogglePosition,
  onSlotsChange,
  onRoleSlotsChange,
}: RoleCardProps) {
  return (
    <div className="mb-0">
      {/* Header */}
      <div className="flex items-center gap-2 px-6">
        <Switch
          checked={role.enabled}
          onCheckedChange={onToggleRole}
          className="scale-85 data-[state=checked]:bg-[#1C9DDE]"
        />

        <span className="text-[16px] font-normal">{role.title}</span>
      </div>

      {role.enabled && role.positions.length > 0 ? (
        <div className="mt-1 ml-12 space-y-1">
          {role.positions.map((position) => (
            <div
              key={position.id}
              className="flex items-center justify-between"
            >
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={position.enabled}
                  onCheckedChange={() => onTogglePosition(position.id)}
                />

                <span className="text-[13px] text-[#8A8A8A]">
                  {position.name}
                </span>
              </label>

              {position.enabled && (
                <input
                  type="number"
                  placeholder="Slots No."
                  value={position.slots ?? ""}
                  onChange={(e) =>
                    onSlotsChange(position.id, Number(e.target.value))
                  }
                  className="h-6 w-16 rounded-full border border-[#D9D9D9] text-center text-[10px] placeholder:text-[#B8B8B8] focus:outline-none"
                />
              )}
            </div>
          ))}
        </div>
      ) : (
        role.enabled && (
          <div className="mt-1 ml-12">
            <input
              type="number"
              placeholder="Slots No."
              value={role.slots ?? ""}
              onChange={(e) => onRoleSlotsChange(Number(e.target.value))}
              className="h-6 w-16 rounded-full border border-[#D9D9D9] text-center text-[10px] placeholder:text-[#B8B8B8] focus:outline-none"
            />
          </div>
        )
      )}
    </div>
  );
}

interface RequirementItem {
  id: string;
  label: string;
}

interface OpenApplicationDialogProps {
  open: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (data: OpenRecruitmentValues) => void;
}

export default function OpenRole({
  open,
  isSubmitting,
  onClose,
  onConfirm,
}: OpenApplicationDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);

  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [pickingField, setPickingField] = useState<"start" | "end">("start");

  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const [roles, setRoles] = useState<Role[]>(createDefaultRoles);
  const [saveSelection, setSaveSelection] = useState(false);
  const [requirementsByItem, setRequirementsByItem] = useState<
    Record<string, string>
  >({});
  const [activeRequirementId, setActiveRequirementId] = useState<string | null>(
    null
  );

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setStep(1);
      setRequirementsByItem({});
      setActiveRequirementId(null);
    }
  }

  const toggleRole = (roleId: string) => {
    setRoles((prev) =>
      prev.map((role) =>
        role.id === roleId ? { ...role, enabled: !role.enabled } : role
      )
    );
  };

  const togglePosition = (roleId: string, positionId: string) => {
    setRoles((prev) =>
      prev.map((role) => {
        if (role.id !== roleId) return role;
        return {
          ...role,
          positions: role.positions.map((position) =>
            position.id === positionId
              ? { ...position, enabled: !position.enabled }
              : position
          ),
        };
      })
    );
  };

  const setPositionSlots = (
    roleId: string,
    positionId: string,
    slots: number
  ) => {
    setRoles((prev) =>
      prev.map((role) => {
        if (role.id !== roleId) return role;
        return {
          ...role,
          positions: role.positions.map((position) =>
            position.id === positionId ? { ...position, slots } : position
          ),
        };
      })
    );
  };

  const setRoleSlots = (roleId: string, slots: number) => {
    setRoles((prev) =>
      prev.map((role) => (role.id === roleId ? { ...role, slots } : role))
    );
  };

  // When the calendar is used, fill whichever field is active,
  // then auto-advance to the other one.
  const handleCalendarSelect = (date?: Date) => {
    if (!date) return;

    if (pickingField === "start") {
      setStartDate(date);
      // if the existing end date is now before the new start date, clear it
      if (endDate && endDate < date) setEndDate(undefined);
      setPickingField("end");
    } else {
      if (startDate && date < startDate) {
        // picked an end date earlier than start — treat it as a new start instead
        setStartDate(date);
        setEndDate(undefined);
        return;
      }
      setEndDate(date);
    }
  };

  // Every enabled position (or, for roles without positions like
  // Volunteer, the role itself) is shown as a summary chip on page 2.
  const requirementItems = useMemo<RequirementItem[]>(() => {
    const items: RequirementItem[] = [];
    roles.forEach((role) => {
      if (role.positions.length === 0) {
        if (role.enabled) {
          items.push({ id: role.id, label: role.title });
        }
        return;
      }
      role.positions.forEach((position) => {
        if (position.enabled) {
          items.push({
            id: position.id,
            label: `${role.title} — ${position.name}`,
          });
        }
      });
    });
    return items;
  }, [roles]);

  const isStepOneValid = useMemo(() => {
    const hasRole = roles.some(
      (role) =>
        role.enabled || role.positions.some((position) => position.enabled)
    );

    return Boolean(startDate && endDate && startTime && endTime && hasRole);
  }, [startDate, endDate, startTime, endTime, roles]);

  const handleNext = () => {
    if (!isStepOneValid) return;
    setStep(2);
    setActiveRequirementId(
      (current) => current ?? requirementItems[0]?.id ?? null
    );
  };

  const handleBack = () => setStep(1);

  const handleConfirm = () => {
    if (!isStepOneValid) return;

    const confirmationData: OpenRecruitmentValues = {
      startDate: startDate!.toISOString(),
      endDate: endDate!.toISOString(),
      startTime,
      endTime,
      roles,
      requirementsByItem,
    };

    onConfirm(confirmationData);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="flex max-h-[95vh] w-[95vw] flex-col gap-0 overflow-hidden rounded-3xl p-0 sm:w-full sm:!max-w-3xl md:max-h-[101vh] [&>button]:hidden"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="relative flex shrink-0 items-center justify-center py-4.5">
          <div className="text-center">
            <h2 className="text-lg font-semibold">Open Application</h2>
            <p className="text-xs text-slate-400">
              Step {step} of 2 —{" "}
              {step === 1 ? "Schedule & Openings" : "Role Requirements"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 rounded-full p-1 hover:bg-slate-100"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {step === 1 ? (
            <div className="grid grid-cols-1 gap-6 px-4 py-6 md:-mt-10 md:grid-cols-2 md:gap-8 md:px-8">
              {/* LEFT SIDE */}
              <div>
                <Label className="mb-3 block font-medium">
                  Select Date{" "}
                  <span className="font-normal text-slate-400">
                    ({pickingField === "start" ? "start" : "end"})
                  </span>
                </Label>

                <div className="max-h-[400px] space-y-4 overflow-y-auto rounded-2xl border border-[#ECECEC] p-3 md:max-h-[375px]">
                  <Calendar
                    mode="single"
                    selected={pickingField === "start" ? startDate : endDate}
                    onSelect={handleCalendarSelect}
                    disabled={
                      pickingField === "end" && startDate
                        ? { before: startDate }
                        : undefined
                    }
                    className="mx-auto"
                  />
                </div>
              </div>

              {/* RIGHT SIDE */}
              <div className="space-y-4">
                {/* APPLICATION WINDOW */}
                <div>
                  <Label className="mb-3 block font-medium">
                    Application Window
                  </Label>

                  <div className="space-y-3">
                    <div onClick={() => setPickingField("start")}>
                      <DateInput
                        value={startDate}
                        placeholder="Start Date"
                        active={pickingField === "start"}
                      />
                    </div>

                    <div onClick={() => setPickingField("end")}>
                      <DateInput
                        value={endDate}
                        placeholder="End Date"
                        active={pickingField === "end"}
                      />
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <TimePicker
                        value={startTime}
                        placeholder="Start Time"
                        onChange={setStartTime}
                      />
                      <span className="text-slate-400">to</span>
                      <TimePicker
                        value={endTime}
                        placeholder="End Time"
                        onChange={setEndTime}
                      />
                    </div>
                  </div>
                </div>

                {/* SET OPENING */}
                <div>
                  <Label className="mb-2 block font-medium">Set Opening</Label>
                  <div className="max-h-[130px] overflow-y-auto rounded-[22px] border border-[#E5E5E5] bg-white py-1 md:max-h-[150px]">
                    {roles.map((role) => (
                      <RoleCard
                        key={role.id}
                        role={role}
                        onToggleRole={() => toggleRole(role.id)}
                        onTogglePosition={(positionId) =>
                          togglePosition(role.id, positionId)
                        }
                        onSlotsChange={(positionId, slots) =>
                          setPositionSlots(role.id, positionId, slots)
                        }
                        onRoleSlotsChange={(slots) =>
                          setRoleSlots(role.id, slots)
                        }
                      />
                    ))}
                  </div>
                </div>

                {/* SAVE */}
                <label className="flex cursor-pointer items-center gap-3 text-sm">
                  <Checkbox
                    checked={saveSelection}
                    onCheckedChange={(value) =>
                      setSaveSelection(Boolean(value))
                    }
                  />
                  Save Selection
                  <span className="text-red-500">*</span>
                </label>
              </div>
            </div>
          ) : (
            <div className="px-4 py-6 md:px-8">
              <Label className="mb-3 block font-medium">
                Role Requirements
              </Label>

              {requirementItems.length === 0 ? (
                <p className="mb-4 rounded-2xl border border-dashed border-[#E5E5E5] p-6 text-center text-sm text-slate-400">
                  No roles or positions were selected on the previous page.
                </p>
              ) : (
                <div className="mb-4 flex flex-wrap gap-2">
                  {requirementItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveRequirementId(item.id)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                        activeRequirementId === item.id
                          ? "bg-[#1C9DDE] text-white"
                          : "bg-[#EFF8FD] text-[#1C9DDE] hover:bg-[#dcefff]"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}

              <div className="rounded-2xl border border-[#ECECEC] p-4">
                <textarea
                  value={
                    activeRequirementId
                      ? (requirementsByItem[activeRequirementId] ?? "")
                      : ""
                  }
                  onChange={(e) =>
                    activeRequirementId &&
                    setRequirementsByItem((prev) => ({
                      ...prev,
                      [activeRequirementId]: e.target.value,
                    }))
                  }
                  disabled={!activeRequirementId}
                  placeholder={
                    activeRequirementId
                      ? "List the requirements, qualifications, or expectations applicants should meet — e.g. year level, course, or experience..."
                      : "Select a role above to add its requirements"
                  }
                  className="h-40 w-full resize-none rounded-xl border-none p-1 text-[13px] text-[#4A4A4A] placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed"
                />
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="sm: flex flex-col flex-row items-center justify-center gap-3 px-4 py-6">
          {step === 2 && (
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              className="h-10 w-32 rounded-full"
            >
              Back
            </Button>
          )}

          <Button
            disabled={
              step === 1 ? !isStepOneValid : !isStepOneValid || isSubmitting
            }
            onClick={step === 1 ? handleNext : handleConfirm}
            className={`h-10 w-45 rounded-full transition-all ${
              isStepOneValid
                ? "bg-[#1C9DDE] hover:bg-[#1487C2]"
                : "bg-slate-300"
            }`}
          >
            {step === 1 ? "Next" : isSubmitting ? "Opening..." : "Confirm"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
