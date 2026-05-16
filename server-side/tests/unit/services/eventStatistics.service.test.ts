import { computeEventStatistics } from "../../../src/services/eventStatistics.service";

describe("eventStatistics functional unit", () => {
  it("computes summary and distributions for campus scope", () => {
    const result = computeEventStatistics(
      [
        {
          id_number: "2024-0001",
          name: "One",
          course: "BSIT",
          year: 1,
          campus: "UC-Main",
          shirtPrice: 100,
          transactDate: new Date("2026-05-14T08:00:00.000Z"),
          attendance: {
            morning: { attended: true, timestamp: new Date() },
            afternoon: { attended: false, timestamp: null },
            evening: { attended: false, timestamp: null },
          },
        },
        {
          id_number: "2024-0002",
          name: "Two",
          course: "BSCS",
          year: 2,
          campus: "UC-Main",
          shirtPrice: 200,
          transactDate: new Date("2026-05-15T08:00:00.000Z"),
          attendance: {
            morning: { attended: false, timestamp: null },
            afternoon: { attended: false, timestamp: null },
            evening: { attended: false, timestamp: null },
          },
        },
      ] as any,
      [{ campus: "UC-Main", totalRevenue: 300, unitsSold: 2 }] as any,
      "UC-Main"
    );

    expect(result.summary.totalRegistrations).toBe(2);
    expect(result.summary.totalRevenue).toBe(300);
    expect(result.summary.totalAttended).toBe(1);
    expect(result.campusDistribution.registered["UC-Main"]).toBe(2);
    expect(result.yearLevelDistribution.registered["1st"]).toBe(1);
    expect(result.yearLevelDistribution.registered["2nd"]).toBe(1);
  });
});
