export type OrganizationTab =
  | "admins"
  | "members"
  | "suspended"
  | "memberRequests"
  | "adminRequests";

export type OrganizationSortField =
  | "name"
  | "id_number"
  | "courseYear"
  | "role"
  | "campus";

export type OrganizationAction =
  | "suspend"
  | "restore"
  | "removeRole"
  | "approve"
  | "decline";

export interface OrganizationAccount {
  id: string;
  id_number: string;
  name: string;
  email: string;
  course: string;
  year: string;
  role: string;
  position: string;
  campus: string;
  status: string;
  access?: string | string[];
  isRequest?: boolean;
  adminRequest?: string;
  requestedBy?: string;
  githubUsername?: string;
  accountType: "admin" | "member" | "memberRequest" | "adminRequest";
}

export interface OrganizationFilters {
  courses: string[];
  years: string[];
  campuses: string[];
  role: string;
}

export interface OrganizationSort {
  field: OrganizationSortField;
  direction: "asc" | "desc";
}

export interface OrganizationAccountFormValues {
  id_number: string;
  name: string;
  email: string;
  course: string;
  year: string;
  position: string;
  campus: string;
  githubUsername?: string;
  password?: string;
  confirm_password?: string;
}

export interface OrganizationRoleRequestFormValues {
  id_number: string;
  role: string;
}
