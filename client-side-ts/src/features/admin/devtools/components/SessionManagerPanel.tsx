import { useState, useEffect, useMemo } from "react";
import { getSessions, invalidateBulkSessions } from "../api/devtools.api";
import type { SessionInfo } from "../types/devtools.types";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { showToast } from "@/utils/alertHelper";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PAGE_SIZE = 10;

export const SessionManagerPanel = () => {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [invalidating, setInvalidating] = useState(false);
  const [roleFilter, setRoleFilter] = useState("");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmAll, setConfirmAll] = useState<{
    open: boolean;
    type?: "admin" | "student";
    count?: number;
  }>({ open: false });

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (roleFilter) params.role = roleFilter;
      const data = await getSessions(
        Object.keys(params).length > 0 ? params : undefined
      );
      setSessions(data);
    } catch {
      showToast("error", "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    setCurrentPage(1); // reset to first page when the role filter changes
  }, [roleFilter]);

  useEffect(() => {
    setCurrentPage(1); // reset to first page whenever the search term changes
  }, [search]);

  // Client-side search across name, ID number, campus, and position,
  const filteredSessions = useMemo(() => {
    const query = search.trim().toLowerCase();
    return sessions
      .filter((s) => !roleFilter || s.role === roleFilter)
      .filter((s) => {
        if (!query) return true;
        return [s.name, s.idNumber, s.campus, s.position]
          .filter(Boolean)
          .some((field) => field!.toLowerCase().includes(query));
      });
  }, [sessions, search, roleFilter]);

  // Clamp current page if the underlying data shrinks (e.g. after invalidation or search)
  const totalPages = Math.max(
    1,
    Math.ceil(filteredSessions.length / PAGE_SIZE)
  );
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const paginatedSessions = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredSessions.slice(start, start + PAGE_SIZE);
  }, [filteredSessions, currentPage]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Select-all now scopes to the current page only, which is the
  // conventional behavior for paginated tables.
  const pageIds = paginatedSessions.map((s) => s.id);
  const allOnPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selected.has(id));

  const toggleSelectAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleBulkInvalidate = async () => {
    setInvalidating(true);
    try {
      await invalidateBulkSessions(Array.from(selected));
      showToast("success", `${selected.size} session(s) invalidated`);
      setSelected(new Set());
      fetchSessions();
    } catch {
      showToast("error", "Failed to invalidate sessions");
    } finally {
      setInvalidating(false);
      setConfirmOpen(false);
    }
  };

  const handleAllInvalidate = async () => {
    if (!confirmAll.type || !confirmAll.count) return;
    const type = confirmAll.type;
    const count = confirmAll.count;
    setConfirmAll((prev) => ({ ...prev, open: false }));
    setInvalidating(true);
    try {
      await invalidateBulkSessions(
        sessions.filter((s) => s.role === type).map((s) => s.id)
      );
      showToast(
        "success",
        `Success: ${count} ${type}(s) session(s) invalidated`
      );
      fetchSessions();
    } catch {
      showToast("error", `Failed to invalidate all ${type} sessions`);
    } finally {
      setInvalidating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-[#777]">
        No active sessions found.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-sm text-[#8a8a8a]">
            {search.trim()
              ? `${filteredSessions.length} of ${sessions.length} session(s)`
              : `${sessions.length} active session(s)`}
          </span>
          {selected.size > 0 && (
            <span className="rounded-full bg-[#1c9dde] px-2 py-0.5 text-xs font-medium text-white">
              {selected.size} selected
            </span>
          )}
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:flex-nowrap">
          <div className="relative w-full sm:w-56">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#9a9a9a]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, ID, campus..."
              className="h-9 rounded-2xl pr-8 pl-9 text-sm"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute top-1/2 right-2 -translate-y-1/2 text-[#9a9a9a] hover:text-[#555]"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Select
            value={roleFilter || "all"}
            onValueChange={(value) =>
              setRoleFilter(value === "all" ? "" : value)
            }
          >
            <SelectTrigger className="h-9 w-[130px] rounded-full text-sm">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="student">Student</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-full"
            onClick={() =>
              setConfirmAll({
                open: true,
                type: "student",
                count: sessions.filter((s) => s.role === "student").length,
              })
            }
            disabled={invalidating}
          >
            Invalidate All Students
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-full"
            onClick={() =>
              setConfirmAll({
                open: true,
                type: "admin",
                count: sessions.filter((s) => s.role === "admin").length,
              })
            }
            disabled={invalidating}
          >
            Invalidate All Admins
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={fetchSessions}
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] table-fixed border-collapse text-sm">
          <thead>
            <tr className="rounded-md bg-[#efefef] text-[#2f2f2f]">
              <th className="w-10 rounded-l-md px-2 py-2.5 text-center">
                <Checkbox
                  checked={allOnPageSelected}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all on page"
                  className="border-gray-300 bg-white"
                />
              </th>
              <th className="w-[20%] px-2 py-2 text-left font-medium">Name</th>
              <th className="w-[15%] px-2 py-2 text-left font-medium">
                ID Number
              </th>
              <th className="w-[12%] px-2 py-2 text-left font-medium">Role</th>
              <th className="w-[15%] px-2 py-2 text-left font-medium">
                Campus
              </th>
              <th className="w-[13%] px-2 py-2 text-left font-medium">
                Position
              </th>
              <th className="w-[10%] rounded-r-md px-2 py-2 text-right font-medium">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredSessions.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-2 py-10 text-center text-sm text-[#777]"
                >
                  No sessions match "{search}".
                </td>
              </tr>
            )}
            {paginatedSessions.map((session) => (
              <tr
                key={session.id}
                className="border-b border-[#ededed] text-[#303030]"
              >
                <td className="px-2 py-3 text-center">
                  <Checkbox
                    checked={selected.has(session.id)}
                    onCheckedChange={() => toggleSelect(session.id)}
                    aria-label={`Select ${session.name}`}
                    className="border-gray-300"
                  />
                </td>
                <td className="truncate px-2 py-3">{session.name}</td>
                <td className="px-2 py-3">{session.idNumber}</td>
                <td className="px-2 py-3 capitalize">{session.role}</td>
                <td className="px-2 py-3">{session.campus || "-"}</td>
                <td className="truncate px-2 py-3">
                  {session.position || "-"}
                </td>
                <td className="px-2 py-3 text-right">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 rounded-full border-red-300 text-red-600 hover:bg-red-50"
                    onClick={() => {
                      setSelected((prev) => new Set([...prev, session.id]));
                      setConfirmOpen(true);
                    }}
                  >
                    Invalidate
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {filteredSessions.length > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-[#8a8a8a]">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 w-8 rounded-full p-0"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              // show a max of 5 page buttons centered around current page
              .filter((page) => {
                if (totalPages <= 5) return true;
                return Math.abs(page - currentPage) <= 2;
              })
              .map((page) => (
                <Button
                  key={page}
                  type="button"
                  size="sm"
                  variant={page === currentPage ? "default" : "outline"}
                  className="h-8 w-8 rounded-full p-0"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              ))}

            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 w-8 rounded-full p-0"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm rounded-[20px]">
          <DialogHeader>
            <DialogTitle>Invalidate {selected.size} session(s)?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#777]">
            This will force logout the selected users. They will need to log in
            again.
          </p>
          <DialogFooter className="mt-3">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => setConfirmOpen(false)}
              disabled={invalidating}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-full bg-red-500 hover:bg-red-600"
              onClick={handleBulkInvalidate}
              disabled={invalidating}
            >
              {invalidating ? "Invalidating..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* All Invalidation Confirm Dialog */}
      {confirmAll.open && confirmAll.type && (
        <Dialog
          open={confirmAll.open}
          onOpenChange={(open) => setConfirmAll({ ...confirmAll, open })}
        >
          <DialogContent className="max-w-sm rounded-[20px]">
            <DialogHeader>
              <DialogTitle>
                {confirmAll.type === "admin" ? "Admin" : "Student"} Session
                Invalidate
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-gray-500">
              This will force logout all {confirmAll.type} session(s). Count:{" "}
              {confirmAll.count || 0}. Continue?
            </p>
            <DialogFooter className="mt-3">
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={() =>
                  setConfirmAll({
                    open: false,
                    type: undefined,
                    count: undefined,
                  })
                }
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="rounded-full bg-red-500 hover:bg-red-600"
                onClick={handleAllInvalidate}
                disabled={invalidating}
              >
                {invalidating ? "Invalidating..." : "Confirm"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
