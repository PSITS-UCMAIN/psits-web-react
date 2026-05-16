import {
  buildDefaultAttendance,
  isAttendancePresent,
  normalizeAttendance,
} from "../../../src/services/attendance.service";

describe("attendance.service unit", () => {
  it("builds empty attendance defaults", () => {
    expect(buildDefaultAttendance()).toEqual({
      morning: { attended: false, timestamp: null },
      afternoon: { attended: false, timestamp: null },
      evening: { attended: false, timestamp: null },
    });
  });

  it("normalizes partial attendance payloads", () => {
    const normalized = normalizeAttendance({
      morning: { attended: true, timestamp: "2026-05-16T01:00:00.000Z" },
    });

    expect(normalized.morning.attended).toBe(true);
    expect(normalized.morning.timestamp).toBeInstanceOf(Date);
    expect(normalized.afternoon.attended).toBe(false);
  });

  it("detects attendance presence", () => {
    expect(
      isAttendancePresent({
        evening: { attended: true, timestamp: null },
      })
    ).toBe(true);

    expect(isAttendancePresent(undefined)).toBe(false);
  });
});
