export type StudentsTab = "all" | "requests" | "deleted";

export type StudentSortField =
  | "name"
  | "id_number"
  | "rfid"
  | "courseYear"
  | "membershipStatus"
  | "applied"
  | "deletedDate"
  | "deletedBy";

export type StudentAction =
  | "edit"
  | "password"
  | "approve"
  | "cancelRequest"
  | "history"
  | "delete"
  | "restore";

export interface AdminStudent {
  id: string;
  id_number: string;
  rfid: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  name: string;
  email: string;
  course: string;
  year: string;
  membershipStatus: string;
  status: string;
  applied: string;
  deletedBy: string;
  deletedDate: string;
  campus: string;
}

export interface StudentFilters {
  courses: string[];
  years: string[];
  membershipStatus: string;
}

export interface StudentSort {
  field: StudentSortField;
  direction: "asc" | "desc";
}

export interface StudentTabCounts {
  all: number;
  requests: number;
  deleted: number;
}

export interface StudentFormValues {
  id_number: string;
  rfid: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  email: string;
  course: string;
  year: string;
}

export interface StudentPasswordValues {
  password: string;
  confirm_password: string;
}

export interface StudentMembershipHistoryItem {
  id_number: string;
  rfid?: string;
  reference_code: string;
  name: string;
  year: string;
  course: string;
  type: string;
  date: string | Date;
  admin: string;
  total?: number;
}
