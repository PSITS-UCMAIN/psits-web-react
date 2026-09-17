import { promo_audience_roles } from "../enums/role.enums";

export const resolveAudienceRole = (value?: string | null): string => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  return promo_audience_roles[raw.toLowerCase()] ?? raw.toUpperCase();
};

export const audienceIncludesRole = (
  audience: unknown,
  studentRole?: string | null
): boolean => {
  const role = String(studentRole ?? "")
    .trim()
    .toUpperCase();
  if (!role || !Array.isArray(audience)) return false;

  return audience.some((entry) => resolveAudienceRole(entry) === role);
};
