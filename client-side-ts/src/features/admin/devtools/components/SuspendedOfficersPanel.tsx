import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { showToast } from "@/utils/alertHelper";
import { getSuspendOfficers, officerSuspend, officerRestore } from "@/features/admin/api/admin";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AccountListToolbar } from "./AccountListToolbar";
import { useAccountListFilter } from "../hooks/useAccountListFilter";
import type { AccountListFields } from "../hooks/useAccountListFilter";

interface SuspendedOfficer {
  _id?: string;
  id_number: string;
  name?: string;
  email?: string;
  campus?: string;
  position?: string;
  status?: string;
  access?: string;
}

const getSuspendedOfficerFields = (
  officer: SuspendedOfficer
): AccountListFields => ({
  name: officer.name,
  idNumber: officer.id_number,
  campus: officer.campus,
  searchable: [officer.position, officer.email, officer.access],
});

export const SuspendedOfficersPanel = () => {
  const [officers, setOfficers] = useState<SuspendedOfficer[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmAction, setConfirmAction] = useState<{
    id: string;
    action: "restore" | "suspend";
    name: string;
  } | null>(null);
  const [mutating, setMutating] = useState(false);
  const {
    search,
    setSearch,
    campus,
    setCampus,
    sort,
    setSort,
    campusOptions,
    visibleItems: visibleOfficers,
    isFiltered,
  } = useAccountListFilter(officers, getSuspendedOfficerFields);

  useEffect(() => {
    getSuspendOfficers()
      .then((data) => setOfficers(data || []))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async () => {
    if (!confirmAction) return;
    setMutating(true);
    try {
      const handler =
        confirmAction.action === "restore" ? officerRestore : officerSuspend;
      const result = await handler(confirmAction.id);
      if (result === 200) {
        setOfficers((prev) => prev.filter((o) => o.id_number !== confirmAction.id));
        showToast(
          "success",
          `Officer ${confirmAction.name} ${
            confirmAction.action === "restore" ? "restored" : "suspended"
          } successfully.`
        );
      } else {
        showToast("error", "Failed to update suspended officer status.");
      }
    } finally {
      setMutating(false);
      setConfirmAction(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        <div className="flex items-start gap-2">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p>
            Suspended officers cannot log in. Restore reactivates their access; suspend keeps them locked out. All changes are audited.
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
        searchPlaceholder="Search name, ID, position, email..."
      />

      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="border-b bg-[#efefef] text-left text-sm text-[#2f2f2f]">
              <th className="px-3 py-2 font-medium">ID</th>
              <th className="px-3 py-2 font-medium">Officer Name</th>
              <th className="px-3 py-2 font-medium">Campus</th>
              <th className="px-3 py-2 font-medium">Position</th>
              <th className="px-3 py-2 font-medium">Current Access</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 3 }, (_, i) => (
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
                <tr key={officer.id_number} className="border-b border-[#ededed]">
                  <td className="px-3 py-2">{officer.id_number}</td>
                  <td className="px-3 py-2">{officer.name}</td>
                  <td className="px-3 py-2">{officer.campus}</td>
                  <td className="px-3 py-2">{officer.position || "-"}</td>
                  <td className="px-3 py-2">{officer.access}</td>
                  <td className="px-3 py-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="mr-2 h-7 rounded-full text-xs"
                      onClick={() =>
                        setConfirmAction({
                          id: officer.id_number,
                          action: "restore",
                          name: officer.name || officer.id_number,
                        })
                      }
                    >
                      Restore
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7 rounded-full text-xs"
                      onClick={() =>
                        setConfirmAction({
                          id: officer.id_number,
                          action: "suspend",
                          name: officer.name || officer.id_number,
                        })
                      }
                    >
                      Suspend
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-3 py-12 text-center text-sm text-[#777]">
                  {isFiltered
                    ? "No suspended officers match the current search or filters."
                    : "No suspended officers."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {confirmAction && (
        <ConfirmDialog
          open={Boolean(confirmAction)}
          onOpenChange={(open) => !open && setConfirmAction(null)}
          title={
            confirmAction.action === "restore"
              ? `Restore ${confirmAction.name}?`
              : `Suspend ${confirmAction.name}?`
          }
          description={
            confirmAction.action === "restore"
              ? `This will reactivate login access for ${confirmAction.name}.`
              : `This will lock ${confirmAction.name} out until restored.`
          }
          confirmLabel={
            confirmAction.action === "restore" ? "Restore" : "Suspend"
          }
          onConfirm={handleSubmit}
          loading={mutating}
        />
      )}
    </div>
  );
};

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
  loading: boolean;
}

const ConfirmDialog = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  loading,
}: ConfirmDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-[400px] rounded-[24px] border-0 p-6">
      <DialogHeader>
        <DialogTitle className="text-lg">{title}</DialogTitle>
      </DialogHeader>
      <p className="text-sm text-gray-500">{description}</p>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant="outline"
          className="h-9 rounded-full"
          onClick={() => onOpenChange(false)}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          type="button"
          className="h-9 rounded-full bg-red-500 hover:bg-red-600"
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? "Processing..." : confirmLabel}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);
