export const STUDENT_ID_REGEX = /^\d{8}$/;

// Sign-in accepts only the -admin, -ucb, -uclm, -ucpt
export const LOGIN_ID_REGEX = /^\d{8}(-(admin|ucb|uclm|ucpt))?$/;

export const STUDENT_ID_MESSAGE =
  "Student ID must be exactly a numeric 8-digit value (e.g. 20201234)";
export const LOGIN_ID_MESSAGE = "Invalid ID number format.";
export const SUSPICIOUS_ID_MESSAGE = "Please enter a valid student ID number";

// Longest real value is 8 digits + "-uclm"; this is slack, not a format rule.
const MAX_ID_LENGTH = 32;

export type IdMode = "student" | "login";

export type IdValidation =
  | { valid: true; id: string; message: null }
  | { valid: false; id: null; message: string };

/**
 * The single ID validator. Mirrors client-side-ts/src/utils/studentId.ts.
 *
 * mode "student" = exactly 8 digits (signup, attendance).
 * mode "login"   = 8 digits + optional -admin/-ucb/-uclm/-ucpt (sign-in, reset).
 *
 * Takes `unknown` on purpose: a JSON body can carry an object where a string is
 * expected, and Mongoose reads `{ id_number: { $ne: null } }` as a query
 * operator rather than a value. Anything that is not a usable string fails here.
 * On success `id` is the trimmed value, safe to put in a query.
 */
export function validateId(
  value: unknown,
  options: { mode?: IdMode; rejectSuspicious?: boolean } = {}
): IdValidation {
  const { mode = "student", rejectSuspicious = false } = options;
  const pattern = mode === "login" ? LOGIN_ID_REGEX : STUDENT_ID_REGEX;
  const formatMessage = mode === "login" ? LOGIN_ID_MESSAGE : STUDENT_ID_MESSAGE;
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
