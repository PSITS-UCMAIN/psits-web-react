import { useState } from "react";
import { AlertTriangle, Check, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { Officer } from "@/features/admin/settings/types/settings.types";
import { PSITS_ROLES } from "@/features/admin/constants/adminAccess";
import type { PsitsRole } from "@/features/admin/constants/adminAccess";
import { useOfficerAccess } from "../hooks/useOfficerAccess";
import { useAccountListFilter } from "../hooks/useAccountListFilter";
import type { AccountListFields } from "../hooks/useAccountListFilter";
import { AccountListToolbar } from "./AccountListToolbar";

const getOfficerFields = (officer: Officer): AccountListFields => ({
  name: officer.name,
  idNumber: officer.id_number,
  campus: officer.campus,
  searchable: [officer.position],
});

const ROLE_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "all", label: "All Roles" },
  { value: "ADMIN", label: "Admin" },
  { value: "DEVELOPER", label: "Developer" },
  { value: "HEAD_FINANCE", label: "Head Finance" },
  { value: "FINANCE", label: "Finance" },
  { value: "EXECUTIVE", label: "Executive" },
  { value: "STANDARD", label: "Standard" },
  { value: "NO_ACCESS", label: "None" },
];

const DISPLAY_LABELS: Record<string, string> = {
  [PSITS_ROLES.ADMIN]: "Admin",
  [PSITS_ROLES.DEVELOPER]: "Developer",
  [PSITS_ROLES.HEAD_FINANCE]: "Head Finance",
  [PSITS_ROLES.FINANCE]: "Finance",
  [PSITS_ROLES.EXECUTIVE]: "Executive",
  [PSITS_ROLES.STANDARD]: "Standard",
  [PSITS_ROLES.NO_ACCESS]: "None",
};

export const OfficerAccessPanel = () => {
  const {
    officers,
    loading,
    isAdminAccess,
    currentUserAccess,
    roleFilter,
    setRoleFilter,
    updating,
    canEditAccess,
    handleUpdateAccess,
  } = useOfficerAccess();
  const {
    search,
    setSearch,
    campus,
    setCampus,
    sort,
    setSort,
    campusOptions,
    visibleItems: visibleOfficers,
  } = useAccountListFilter(officers, getOfficerFields);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p>
            Changing officer access affects login permissions. This action is
            logged to the audit trail and requires PSITS_ADMIN privileges.
          </p>
        </div>
      </div>

      <AccountListToolbar
        search={search}
        onSearchChange={setSearch}
        campus={campus}
        onCampusChange={setCampus}
        campusOptions={campusOptions}
        sort={sort}
        onSortChange={setSort}
        searchPlaceholder="Search name, ID, position..."
      >
        <Filter className="h-4 w-4 text-[#858585]" />
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="h-9 w-[160px] rounded-full text-sm" aria-label="Filter by access">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLE_FILTER_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </AccountListToolbar>

      {!isAdminAccess && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Officer access management is restricted to PSITS_ADMIN accounts. Contact your UC_MAIN administrator.
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="border-b bg-[#efefef] text-left text-sm text-[#2f2f2f]">
              <th className="px-3 py-2 font-medium">ID</th>
              <th className="px-3 py-2 font-medium">Officer Name</th>
              <th className="px-3 py-2 font-medium">Campus</th>
              <th className="px-3 py-2 font-medium">Position</th>
              <th className="px-3 py-2 font-medium">Current Access</th>
              <th className="px-3 py-2 font-medium">Change Access</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }, (_, i) => (
                <tr key={i} className="border-b border-[#ededed]">
                  {Array.from({ length: 6 }, (_, j) => (
                    <td key={j} className="px-3 py-2">
                      <Skeleton className="h-4 w-full rounded-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : visibleOfficers.length > 0 ? (
              visibleOfficers.map((officer) => (
                <AccessRow
                  key={officer.id_number}
                  officer={officer}
                  isAdminAccess={isAdminAccess}
                  currentUserAccess={currentUserAccess}
                  updating={updating === officer.id_number}
                  canEditAccess={canEditAccess}
                  onSave={handleUpdateAccess}
                />
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-3 py-12 text-center text-sm text-[#777]">
                  No officers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

interface AccessRowProps {
  officer: Officer;
  isAdminAccess: boolean;
  currentUserAccess: string | undefined;
  updating: boolean;
  canEditAccess: (currentAccess: string | undefined, targetAccess: PsitsRole) => boolean;
  onSave: (idNumber: string, newAccess: PsitsRole) => Promise<void>;
}

const AccessRow = ({
  officer,
  isAdminAccess,
  currentUserAccess,
  updating,
  canEditAccess,
  onSave,
}: AccessRowProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftAccess, setDraftAccess] = useState<PsitsRole | "">("");

  if (editingId !== officer.id_number) {
    return (
      <tr className="border-b border-[#ededed]">
        <td className="px-3 py-2">{officer.id_number}</td>
        <td className="px-3 py-2">{officer.name}</td>
        <td className="px-3 py-2">{officer.campus}</td>
        <td className="px-3 py-2">{officer.position || "-"}</td>
        <td className="px-3 py-2">
          {DISPLAY_LABELS[officer.access] || officer.access}
        </td>
        <td className="px-3 py-2">
          <Button
            size="sm"
            variant="outline"
            className="h-7 rounded-full text-xs"
            disabled={!isAdminAccess}
            onClick={() => {
              setDraftAccess(officer.access as PsitsRole);
              setEditingId(officer.id_number);
            }}
          >
            Edit
          </Button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-[#ededed]">
      <td className="px-3 py-2">{officer.id_number}</td>
      <td className="px-3 py-2">{officer.name}</td>
      <td className="px-3 py-2">{officer.campus}</td>
      <td className="px-3 py-2">{officer.position || "-"}</td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          <Select
            value={draftAccess}
            onValueChange={(v) => setDraftAccess(v as PsitsRole)}
          >
            <SelectTrigger className="h-8 w-[150px] rounded-lg border-[#ececec] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_FILTER_OPTIONS.filter((o) => o.value !== "all").map((level) => {
                const psitsValue =
                  PSITS_ROLES[level.value as keyof typeof PSITS_ROLES] as PsitsRole;
                return (
                  <SelectItem
                    key={level.value}
                    value={psitsValue}
                    disabled={!canEditAccess(currentUserAccess, psitsValue)}
                    className={
                      !canEditAccess(currentUserAccess, psitsValue)
                        ? "text-gray-400"
                        : ""
                    }
                  >
                    {level.label}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 rounded-full text-emerald-600 hover:bg-emerald-50 disabled:pointer-events-none"
            disabled={updating || !draftAccess}
            onClick={() => {
              void onSave(officer.id_number, draftAccess as PsitsRole);
              setEditingId(null);
            }}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 rounded-full text-red-600 hover:bg-red-50"
            onClick={() => setEditingId(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
};
