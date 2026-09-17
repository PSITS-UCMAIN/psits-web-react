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
  MEDIA: "PSITS_MEDIA",
  DEVELOPER: "PSITS_DEVELOPER",
  VOLUNTEER: "PSITS_VOLUNTEER",
  OFFICER: "PSITS_OFFICER",
});

export const general_roles = Object.freeze({
  STUDENT: "STUDENT",
  ADMIN: "ADMIN",
});

export const promo_audience_roles = Object.freeze({
  officers: student_roles.OFFICER,
  media: student_roles.MEDIA,
  developer: student_roles.DEVELOPER,
  volunteer: student_roles.VOLUNTEER,
} as Record<string, string>);
