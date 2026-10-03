export const campus_type = Object.freeze({
  MAIN: "UC_MAIN",
  BANILAD: "UC_BANILAD",
  LM: "UC_LM",
  PT: "UC_PT",
  JONES: "UC_JONES",
  OTHER: "OTHER_CAMPUS"
});

// Campuses a student account may be created under. UC_JONES / OTHER_CAMPUS -
// and the legacy UC_CS alias - exist for admin and event records only, so
// anything outside this list falls back to MAIN instead of being stored
// verbatim. Mirrors CAMPUS_VALUES in client-side-ts SignupForm.
export const signup_campus_values: readonly string[] = [
  campus_type.MAIN,
  campus_type.BANILAD,
  campus_type.LM,
  campus_type.PT,
];
