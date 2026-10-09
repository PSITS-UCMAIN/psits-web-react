export const psits_roles = Object.freeze({
  ADMIN: "PSITS_ADMIN",
  DEVELOPER: "PSITS_DEV",
  HEAD_FINANCE: "PSITS_HEAD_FINANCE",
  FINANCE: "PSITS_FINANCE",
  EXECUTIVE: "PSITS_EXEC",
  STANDARD: "PSITS_STANDARD",
  NO_ACCESS: "PSITS_NO_ACCESS",
});
export const student_roles = Object.freeze({
  GENERAL: "PSITS_GENERAL",
  FINANCE: "PSITS_FINANCE",
  MEDIA: "PSITS_MEDIA",
  DEVELOPER: "PSITS_DEVELOPER",
  VOLUNTEER: "PSITS_VOLUNTEER",
  OFFICER: "PSITS_OFFICER",
});

export const member_role_aliases: Record<string, string> = {
  general: student_roles.GENERAL,
  officer: student_roles.OFFICER,
  officers: student_roles.OFFICER,
  developer: student_roles.DEVELOPER,
  developers: student_roles.DEVELOPER,
  finance: student_roles.FINANCE,
  media: student_roles.MEDIA,
  volunteer: student_roles.VOLUNTEER,
  volunteers: student_roles.VOLUNTEER,
};

export const member_role_values: readonly string[] = [
  student_roles.DEVELOPER,
  student_roles.OFFICER,
  student_roles.FINANCE,
  student_roles.MEDIA,
  student_roles.VOLUNTEER,
  "developer",
  "officers",
  "finance",
  "media",
  "volunteer",
];

export const general_roles = Object.freeze({
  STUDENT: "STUDENT",
  ADMIN: "ADMIN",
});

export const promo_audience_roles = Object.freeze({
  officers: student_roles.OFFICER,
  media: student_roles.MEDIA,
  finance: student_roles.FINANCE,
  developer: student_roles.DEVELOPER,
  volunteer: student_roles.VOLUNTEER,
} as Record<string, string>);
