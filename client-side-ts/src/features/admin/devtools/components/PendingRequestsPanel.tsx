import { useEffect, useState } from "react";
import { CheckCircle2, Inbox, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { showToast } from "@/utils/alertHelper";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { approveRole, declineRole, fetchAllStudentRequestRole } from "@/features/admin/api/admin";
import { getRequestAdminAccount, approveAdminAccount, declineAdminAccount } from "@/features/admin/api/admin";
import { AccountListToolbar } from "./AccountListToolbar";
import { useAccountListFilter } from "../hooks/useAccountListFilter";
import type { AccountListFields } from "../hooks/useAccountListFilter";

interface MemberRequest {
  id_number: string;
  name?: string;
  email?: string;
  campus?: string;
  role?: string;
  requestedRole?: string;
  createdAt?: string;
}

interface AdminRequest {
  id_number: string;
  name?: string;
  email?: string;
  campus?: string;
  course?: string;
  year?: string | number;
  position?: string;
  status?: string;
}

const getMemberRequestFields = (request: MemberRequest): AccountListFields => ({
  name: request.name,
  idNumber: request.id_number,
  campus: request.campus,
  searchable: [request.email, request.requestedRole],
});

const getAdminRequestFields = (request: AdminRequest): AccountListFields => ({
  name: request.name,
  idNumber: request.id_number,
  campus: request.campus,
  searchable: [request.email, request.position, request.course],
});

const formatDate = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-PH", { timeZone: "Asia/Manila" });
};

export const PendingRequestsPanel = () => {
  const [memberRequests, setMemberRequests] = useState<MemberRequest[]>([]);
  const [adminRequests, setAdminRequests] = useState<AdminRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const memberFilter = useAccountListFilter(memberRequests, getMemberRequestFields);
  const adminFilter = useAccountListFilter(adminRequests, getAdminRequestFields);

  const load = async () => {
    setLoading(true);
    try {
      const [members, admins] = await Promise.all([
        fetchAllStudentRequestRole(),
        getRequestAdminAccount(),
      ]);
      setMemberRequests(Array.isArray(members) ? members : []);
      setAdminRequests(Array.isArray(admins) ? admins : []);
    } catch {
      setMemberRequests([]);
      setAdminRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleAction = async ({
    kind,
    action,
    idNumber,
    name,
  }: {
    kind: "member" | "admin";
    action: "approve" | "decline";
    idNumber: string;
    name?: string;
  }) => {
    setMutatingId(idNumber);
    try {
      let result: boolean | void;
      if (kind === "member") {
        result =
          action === "approve"
            ? await approveRole(idNumber)
            : await declineRole(idNumber);
      } else {
        result =
          action === "approve"
            ? await approveAdminAccount(idNumber)
            : await declineAdminAccount(idNumber);
      }

      if (result === true || (result as unknown as number) === 200) {
        if (kind === "member") {
          setMemberRequests((prev) =>
            prev.filter((r) => r.id_number !== idNumber)
          );
        } else {
          setAdminRequests((prev) =>
            prev.filter((r) => r.id_number !== idNumber)
          );
        }
        showToast(
          "success",
          `${name || idNumber} ${action === "approve" ? "approved" : "declined"}.`
        );
      } else {
        showToast(
          "error",
          result === undefined
            ? `Failed to ${action} request.`
            : String(result)
        );
      }
    } finally {
      setMutatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  const totalCount = memberRequests.length + adminRequests.length;

  return (
    <div className="space-y-4">
      <Tabs defaultValue="member" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-[#f3f3f3] p-1">
          <TabsTrigger value="member" className="data-[state=active]:bg-white">
            Member Roles{" "}
            <span className="ml-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
              {memberRequests.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="admin" className="data-[state=active]:bg-white">
            Admin Accounts{" "}
            <span className="ml-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
              {adminRequests.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="member" className="mt-4 space-y-3">
          <AccountListToolbar
            search={memberFilter.search}
            onSearchChange={memberFilter.setSearch}
            campus={memberFilter.campus}
            onCampusChange={memberFilter.setCampus}
            campusOptions={memberFilter.campusOptions}
            sort={memberFilter.sort}
            onSortChange={memberFilter.setSort}
            searchPlaceholder="Search name, ID, email, role..."
          />
          <RequestTable
            columns={["ID", "Name", "Campus", "Requested Role", "Date", "Actions"]}
            emptyMessage={
              memberFilter.isFiltered
                ? "No member role requests match the current search or filters."
                : "No pending member role requests."
            }
            rows={memberFilter.visibleItems}
            rowKey={(row) => row.id_number}
            renderRow={(request) => (
              <>
                <td className="px-3 py-2">{request.id_number}</td>
                <td className="px-3 py-2">{request.name || "-"}</td>
                <td className="px-3 py-2">{request.campus || "-"}</td>
                <td className="px-3 py-2">{request.requestedRole || "-"}</td>
                <td className="px-3 py-2">{formatDate(request.createdAt)}</td>
                <td className="px-3 py-2">
                  <ActionButtons
                    idNumber={request.id_number}
                    name={request.name}
                    mutatingId={mutatingId}
                    onApprove={() =>
                      handleAction({
                        kind: "member",
                        action: "approve",
                        idNumber: request.id_number,
                        name: request.name,
                      })
                    }
                    onDecline={() =>
                      handleAction({
                        kind: "member",
                        action: "decline",
                        idNumber: request.id_number,
                        name: request.name,
                      })
                    }
                  />
                </td>
              </>
            )}
          />
        </TabsContent>

        <TabsContent value="admin" className="mt-4 space-y-3">
          <AccountListToolbar
            search={adminFilter.search}
            onSearchChange={adminFilter.setSearch}
            campus={adminFilter.campus}
            onCampusChange={adminFilter.setCampus}
            campusOptions={adminFilter.campusOptions}
            sort={adminFilter.sort}
            onSortChange={adminFilter.setSort}
            searchPlaceholder="Search name, ID, email, position..."
          />
          <RequestTable
            columns={["ID", "Name", "Campus", "Position", "Course/Year", "Date", "Actions"]}
            emptyMessage={
              adminFilter.isFiltered
                ? "No admin account requests match the current search or filters."
                : "No pending admin account requests."
            }
            rows={adminFilter.visibleItems}
            rowKey={(row) => row.id_number}
            renderRow={(request) => (
              <>
                <td className="px-3 py-2">{request.id_number}</td>
                <td className="px-3 py-2">{request.name || "-"}</td>
                <td className="px-3 py-2">{request.campus || "-"}</td>
                <td className="px-3 py-2">{request.position || "-"}</td>
                <td className="px-3 py-2">
                  {request.course ? `${request.course}${request.year ? ` Y${request.year}` : ""}` : "-"}
                </td>
                <td className="px-3 py-2">-</td>
                <td className="px-3 py-2">
                  <ActionButtons
                    idNumber={request.id_number}
                    name={request.name}
                    mutatingId={mutatingId}
                    onApprove={() =>
                      handleAction({
                        kind: "admin",
                        action: "approve",
                        idNumber: request.id_number,
                        name: request.name,
                      })
                    }
                    onDecline={() =>
                      handleAction({
                        kind: "admin",
                        action: "decline",
                        idNumber: request.id_number,
                        name: request.name,
                      })
                    }
                  />
                </td>
              </>
            )}
          />
        </TabsContent>
      </Tabs>

      {totalCount > 0 && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void load()}
            disabled={loading || mutatingId !== null}
          >
            Refresh
          </Button>
        </div>
      )}

      {totalCount === 0 && !loading && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#e5e5e5] py-12 text-[#777]">
          <Inbox className="h-8 w-8 text-gray-400" />
          <p className="text-sm font-medium">No pending requests.</p>
          <p className="text-xs">Checks will reappear here when submitted.</p>
        </div>
      )}
    </div>
  );
};

interface RequestTableProps<T> {
  columns: string[];
  emptyMessage: string;
  rows: T[];
  rowKey: (row: T, idx: number) => string;
  renderRow: (row: T) => React.ReactNode;
}

const RequestTable = <T,>({
  columns,
  emptyMessage,
  rows,
  rowKey,
  renderRow,
}: RequestTableProps<T>) => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-[900px] text-sm">
      <thead>
        <tr className="border-b bg-[#efefef] text-left text-sm text-[#2f2f2f]">
          {columns.map((col) => (
            <th key={col} className="px-3 py-2 font-medium whitespace-nowrap">
              {col}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length > 0 ? (
          rows.map((row, idx) => (
            <tr key={rowKey(row, idx)} className="border-b border-[#ededed]">
              {renderRow(row)}
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={columns.length} className="px-3 py-12 text-center text-sm text-[#777]">
              {emptyMessage}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

interface ActionButtonsProps {
  idNumber: string;
  name?: string;
  mutatingId: string | null;
  onApprove: () => void;
  onDecline: () => void;
}

const ActionButtons = ({ idNumber, name, mutatingId, onApprove, onDecline }: ActionButtonsProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<"approve" | "decline" | null>(null);

  const open = (action: "approve" | "decline") => {
    setDialogAction(action);
    setDialogOpen(true);
  };

  const submit = async () => {
    if (!dialogAction) return;
    if (dialogAction === "approve") {
      onApprove();
    } else {
      onDecline();
    }
    setDialogOpen(false);
  };

  const loading = mutatingId === idNumber;

  return (
    <div className="inline-flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        className="h-7 rounded-full text-xs text-emerald-600 hover:bg-emerald-50"
        onClick={() => open("approve")}
        disabled={loading}
      >
        <CheckCircle2 className="mr-1 h-4 w-4" />
        Approve
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-7 rounded-full text-xs text-red-600 hover:bg-red-50"
        onClick={() => open("decline")}
        disabled={loading}
      >
        <XCircle className="mr-1 h-4 w-4" />
        Decline
      </Button>

      <ConfirmDialog
        open={dialogOpen}
        title={
          dialogAction === "approve"
            ? `Approve ${name || idNumber}?`
            : `Decline ${name || idNumber}?`
        }
        description={
          dialogAction === "approve"
            ? `This will grant access to ${name || idNumber}.`
            : `This will reject ${name || idNumber}'s request.`
        }
        confirmLabel={dialogAction === "approve" ? "Approve" : "Decline"}
        confirmVariant={dialogAction === "approve" ? "approve" : "destructive"}
        onConfirm={submit}
        onOpenChange={setDialogOpen}
        loading={loading}
      />
    </div>
  );
};

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant: "approve" | "destructive";
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
}

const ConfirmDialog = ({
  open,
  title,
  description,
  confirmLabel,
  confirmVariant,
  onConfirm,
  onOpenChange,
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
          className={`h-9 rounded-full ${
            confirmVariant === "approve" ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"
          }`}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? "Processing..." : confirmLabel}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);
