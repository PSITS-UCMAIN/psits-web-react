import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, X } from "lucide-react";
import { useAuth } from "@/features/auth";
import { isActiveMembership } from "@/features/student";
import { approveMembership } from "@/features/admin/api/admin";
import { searchStudentsV2 } from "@/features/events/api/eventService";
import { membershipPrice } from "@/features/admin/settings/api/settings.endpoints";
import type { StudentSearchResult } from "@/features/events/types/event.types";

interface AddMembershipDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const SEARCH_DEBOUNCE_MS = 400;

/** "MEMBERSHIP_ACTIVE" -> "Active", "NOT_APPLIED" -> "Not Applied". */
const prettyStatus = (value?: string) => {
  if (!value) return "Unknown";
  return value
    .replace(/^MEMBERSHIP_/, "")
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
};

const fullName = (s: StudentSearchResult) =>
  `${s.first_name} ${s.middle_name ?? ""} ${s.last_name}`
    .replace(/\s+/g, " ")
    .trim();

export const AddMembershipDialog = ({
  open,
  onClose,
  onSaved,
}: AddMembershipDialogProps) => {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StudentSearchResult[]>([]);
  const [selected, setSelected] = useState<StudentSearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [fee, setFee] = useState(50);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    void membershipPrice().then((price) => {
      if (typeof price === "number") setFee(price);
    });
  }, [open]);

  // Debounced so typing a name doesn't fire a request per keystroke.
  // All state changes happen inside the timer, never synchronously.
  useEffect(() => {
    const term = query.trim();
    let active = true;

    const timer = window.setTimeout(async () => {
      if (term.length < 2) {
        if (active) {
          setResults([]);
          setSearching(false);
        }
        return;
      }

      if (active) setSearching(true);
      const found = await searchStudentsV2(term);
      if (!active) return;

      setResults(Array.isArray(found) ? found : []);
      setSearching(false);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  const handleClose = () => {
    setQuery("");
    setResults([]);
    setSelected(null);
    onClose();
  };

  // Mirrors the server guard: a student who is already a member in the running
  // term cannot be approved again.
  const alreadyMember = selected
    ? isActiveMembership(selected.membershipStatus)
    : false;

  const handleSave = async () => {
    if (!selected || alreadyMember) return;

    setSaving(true);
    try {
      const ok = await approveMembership({
        id_number: selected.id_number,
        rfid: selected.rfid || "N/A",
        admin: user?.name || "Admin",
        date: new Date(),
        total: fee,
      });

      if (ok) {
        onSaved();
        handleClose();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="max-w-md rounded-[20px]">
        <DialogHeader>
          <DialogTitle>Add Membership</DialogTitle>
          <DialogDescription>
            Approves membership for an existing student. A reference code is
            assigned automatically and a receipt is emailed.
          </DialogDescription>
        </DialogHeader>

        {selected ? (
          <div className="space-y-2">
            <div
              className={`flex items-start justify-between gap-3 rounded-lg border p-3 text-sm ${
                alreadyMember
                  ? "bg-white-50 border-white-200"
                  : "border-[#e5e5e5] bg-[#fafafa]"
              }`}
            >
              <div>
                <p className="font-medium text-[#2b2b2b]">
                  {fullName(selected)}
                </p>
                <p className="mt-0.5 text-xs text-[#8a8a8a]">
                  {selected.id_number} · {selected.course}
                  {selected.year ? ` - ${selected.year}` : ""}
                  {selected.campus ? ` · ${selected.campus}` : ""}
                </p>
                <p className="mt-1 text-xs text-[#8a8a8a]">
                  Current status:{" "}
                  <span
                    className={`font-medium ${
                      alreadyMember ? "text-green-600" : "text-[#2b2b2b]"
                    }`}
                  >
                    {prettyStatus(selected.membershipStatus)}
                  </span>
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 shrink-0 rounded-full p-0 text-[#8a8a8a]"
                aria-label="Clear selection"
                onClick={() => setSelected(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {alreadyMember && (
              <p className="text-xs text-red-400">
                This student is already has a membership for the current term.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <Label className="text-xs font-medium text-[#555]">
              Search student *
            </Label>
            <div className="relative">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#9b9b9b]" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Name or student ID"
                className="rounded-lg pl-9"
                autoFocus
              />
            </div>

            {searching ? (
              <div className="space-y-1">
                {Array.from({ length: 3 }, (_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            ) : results.length > 0 ? (
              <div className="max-h-56 space-y-1 overflow-y-auto">
                {results.map((student) => (
                  <button
                    key={student.id_number}
                    type="button"
                    onClick={() => setSelected(student)}
                    className="w-full cursor-pointer rounded-lg border border-[#e5e5e5] bg-white p-2.5 text-left transition-colors hover:border-[#1c9dde]/40 hover:bg-[#f7fbfe]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-[#2b2b2b]">
                        {fullName(student)}
                      </p>
                      {isActiveMembership(student.membershipStatus) && (
                        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                          Already has membership
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#8a8a8a]">
                      {student.id_number} · {student.course}
                      {student.year ? ` - ${student.year}` : ""}
                    </p>
                  </button>
                ))}
              </div>
            ) : query.trim().length >= 2 ? (
              <p className="text-xs text-[#8a8a8a]">No students found.</p>
            ) : (
              <p className="text-xs text-[#8a8a8a]">
                Type at least 2 characters. Showing up to 25 matches.
              </p>
            )}
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={handleClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="rounded-full bg-[#1c9dde] hover:bg-[#168bc7]"
            onClick={() => void handleSave()}
            disabled={saving || !selected || alreadyMember}
          >
            {saving ? "Adding..." : "Add Membership"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
