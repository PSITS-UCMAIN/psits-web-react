export interface RecruitmentPosition {
  _id: string;
  title: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  hiringStatus: "DRAFT" | "OPEN" | "CLOSED";
  isActive: boolean;
  slots?: number;
  applicationOpensAt?: string;
  applicationDeadline?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface StatusHistoryItem {
  status: Application["status"];
  changedAt: string;
  changedBy: string;
  note?: string;
}

export interface Application {
  _id: string;
  position: string;
  positionTitle: string;
  applicant: string;
  applicantName: string;
  status:
    | "SUBMITTED"
    | "INTERVIEW_SCHEDULED"
    | "INTERVIEWING"
    | "APPROVED"
    | "REJECTED"
    | "WITHDRAWN";
  documents: {
    resume: {
      originalFilename: string;
      storageKey: string;
      mimeType: string;
      size: number;
      uploadTimestamp: string;
    };
    applicationLetter: {
      originalFilename: string;
      storageKey: string;
      mimeType: string;
      size: number;
      uploadTimestamp: string;
    };
  };
  interview?: Interview;
  statusHistory?: StatusHistoryItem[];
  reviewer?: string;
  internalNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Interview {
  scheduledAt: string;
  location: string;
  notes?: string;
  status: "SCHEDULED" | "RESCHEDULED" | "COMPLETED" | "CANCELLED";
  scheduledBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApplicantFilters {
  page?: number;
  limit?: number;
  status?: Application["status"] | string;
  positionId?: string;
  search?: string;
  role?: string;
  course?: string;
  year?: string;
  sortField?:
    | "createdAt"
    | "name"
    | "id_number"
    | "courseYear"
    | "roleApplied"
    | "status";
  sortDirection?: "asc" | "desc";
  verificationOnly?: boolean;
}
