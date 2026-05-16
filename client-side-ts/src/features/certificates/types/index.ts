export interface CertificateEvent {
  _id: string;
  name: string;
  date: string;
  venue: string;
  isEligible?: boolean;
}

export interface EligibleCertificate {
  _id: string;
  evaluationId: string;
  eventId: string | CertificateEvent;
  attendeeId: string;
  studentIdNumber?: string;
  createdAt: string;
  createdBy?: string;
}

export interface GenerateCertificateResponse {
  success: boolean;
  message?: string;
  error?: string;
  retryAfter?: number;
}

export interface CertificateApiError {
  success: false;
  message: string;
  error?: string;
  retryAfter?: number;
}
