import disposableDomains from "disposable-email-domains";
import { validateId } from "./studentId.util";

const disposableSet = new Set(disposableDomains);

const TEST_WORD_PATTERN =
  /(^|\b)(test|asdf|qwerty|sample|dummy|foobar|admin|demo|example|placeholder|lorem|ipsum|temp|fake|junk|noreply|nobody|whatever|asdasd|zzz|aaa)(\b|$)/i;

export function isSuspiciousName(value: string): boolean {
  if (!value) return false;
  return TEST_WORD_PATTERN.test(value.trim());
}

export function isDisposableEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return domain ? disposableSet.has(domain) : false;
}

export function validateSignupData(data: {
  fname: string;
  lname: string;
  id: string;
  email: string;
}): string | null {
  if (isSuspiciousName(data.fname)) return "Please enter your real first name";
  if (isSuspiciousName(data.lname)) return "Please enter your real last name";

  // One call covers narrowing, the 8-digit format and the filler-ID check.
  const idCheck = validateId(data.id, { rejectSuspicious: true });
  if (!idCheck.valid) return idCheck.message;

  if (isDisposableEmail(data.email))
    return "Please use a real, non-disposable email address";
  return null;
}

export function normalizeYear(year: unknown): number | null {
  const yearMap: Record<string, number> = {
    "1st Year": 1,
    "2nd Year": 2,
    "3rd Year": 3,
    "4th Year": 4,
  };
  const parsed = yearMap[year as string] ?? Number(year);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) return null;
  return parsed;
}

export function getSignupErrorResponse(error: {
  code?: number;
  name?: string;
  keyValue?: Record<string, unknown>;
  errors?: Record<string, unknown>;
  path?: string;
}): { status: number; message: string } | null {
  if (error?.code === 11000) {
    const field = Object.keys(error.keyValue || {})[0];
    return {
      status: 409,
      message:
        field === "id_number"
          ? "This Student ID is already registered."
          : field === "email"
            ? "This email is already registered."
            : "This account already exists.",
    };
  }

  if (error?.name === "ValidationError") {
    const fields = Object.keys(error.errors || {});
    return {
      status: 400,
      message: `Missing required field: ${fields.join(", ")}`,
    };
  }

  if (error?.name === "CastError") {
    return {
      status: 400,
      message: `Invalid format for field: ${error.path || "unknown"}`,
    };
  }

  if (error?.name === "TypeError") {
    return { status: 400, message: "Missing required field." };
  }

  return null;
}
