import { member_role_values, promo_audience_roles } from "../enums/role.enums";

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

export const isOrganizationalMemberRole = (role?: string | null): boolean =>
  member_role_values.includes(String(role ?? ""));

export interface MemberRoleFields {
  role?: string | null;
  isRequest?: boolean | null;
}

/**
 * A student is an organizational member only when they hold a member role and
 * their request has been resolved (`isRequest === false`), matching the Admin
 * Members query. Pending requests (`isRequest: true`) and students with no
 * resolved flag do not qualify.
 */
export const isOrganizationalMember = (
  student?: MemberRoleFields | null
): boolean =>
  Boolean(student) &&
  student!.isRequest === false &&
  isOrganizationalMemberRole(student!.role);

/**
 * Classifies a membership-history row by its linked student. Rows with a missing
 * student reference - or one that no longer resolves (deleted student) - are not
 * organizational members.
 */
export const isOrganizationalMemberRecord = (
  record: { student?: unknown },
  students: Map<string, MemberRoleFields>
): boolean => {
  const student =
    record.student != null ? students.get(String(record.student)) : undefined;
  return isOrganizationalMember(student);
};
