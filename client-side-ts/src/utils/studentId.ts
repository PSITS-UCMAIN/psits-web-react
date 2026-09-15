export const STUDENT_ID_REGEX = /^\d{8}$/;

// Sign-in accepts only the -admin, -ucb, -uclm, -ucpt
export const LOGIN_ID_REGEX = /^\d{8}(-(admin|ucb|uclm|ucpt))?$/;

//limit length to 8 digit only
export const STUDENT_ID_LENGTH = 8;

//limit login id length to 16 digit only
export const LOGIN_ID_MAX_LENGTH = 16;

export const STUDENT_ID_MESSAGE =
  "Student ID must be a your ID number and must be 8 digits (e.g. 20261234)";
export const LOGIN_ID_MESSAGE = "Enter your 8-digit ID number";
export const SUSPICIOUS_ID_MESSAGE = "Please enter a valid student ID number";

// Longest real value is 8 digits + "-uclm"; this is slack, not a format rule.
const MAX_ID_LENGTH = 32;

export type IdMode = "student" | "login";

export type IdValidation =
  | { valid: true; id: string; message: null }
  | { valid: false; id: null; message: string };

//mode "student" = exactly 8 digits (signup, attendance).
//mode "login"   = 8 digits + optional -admin/-ucb/-uclm/-ucpt (sign-in, reset).
export function validateId(
  value: unknown,
  options: { mode?: IdMode; rejectSuspicious?: boolean } = {}
): IdValidation {
  const { mode = "student", rejectSuspicious = false } = options;
  const pattern = mode === "login" ? LOGIN_ID_REGEX : STUDENT_ID_REGEX;
  const formatMessage =
    mode === "login" ? LOGIN_ID_MESSAGE : STUDENT_ID_MESSAGE;
  const fail = (message: string): IdValidation => ({
    valid: false,
    id: null,
    message,
  });

  if (typeof value !== "string") return fail(formatMessage);

  const id = value.trim();
  if (!id || id.length > MAX_ID_LENGTH) return fail(formatMessage);
  if (!pattern.test(id)) return fail(formatMessage);

  if (rejectSuspicious) {
    const isRepeating = /^(\d)\1+$/.test(id);
    const isSequential = /^(0123456789|1234567890|12345678)$/.test(id);
    if (isRepeating || isSequential) return fail(SUSPICIOUS_ID_MESSAGE);
  }

  return { valid: true, id, message: null };
}
