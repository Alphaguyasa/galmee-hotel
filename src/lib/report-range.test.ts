import { describe, expect, it } from "vitest";
import {
  currentEthiopianMonth,
  ethiopianMonthDates,
  formatEthiopianMonth,
  parseEthiopianMonth,
  parseReportRange,
  reportRangeDates,
  shiftEthiopianMonth,
} from "./report-range";

describe("report ranges", () => {
  it("falls back to 14 days for unknown values", () => {
    expect(parseReportRange("week")).toBe("week");
    expect(parseReportRange("9")).toBe("14");
    expect(parseReportRange(null)).toBe("14");
  });

  it("today is a single day", () => {
    expect(reportRangeDates("today", "2026-11-10")).toEqual({ from: "2026-11-10", to: "2026-11-10" });
  });

  it("week starts on Monday", () => {
    // 2026-11-10 is a Tuesday; 2026-11-09 a Monday; 2026-11-15 a Sunday.
    expect(reportRangeDates("week", "2026-11-10").from).toBe("2026-11-09");
    expect(reportRangeDates("week", "2026-11-09").from).toBe("2026-11-09");
    expect(reportRangeDates("week", "2026-11-15").from).toBe("2026-11-09");
  });

  it("month starts on the first of the Ethiopian month", () => {
    // Hidar 1, 2019 E.C. is 2026-11-10.
    expect(reportRangeDates("month", "2026-11-10").from).toBe("2026-11-10");
    expect(reportRangeDates("month", "2026-11-09").from).toBe("2026-10-11");
    // Pagume 2018 E.C. starts 2026-09-06.
    expect(reportRangeDates("month", "2026-09-10")).toEqual({ from: "2026-09-06", to: "2026-09-10" });
  });

  it("last N days include today", () => {
    expect(reportRangeDates("7", "2026-11-10").from).toBe("2026-11-04");
    expect(reportRangeDates("30", "2026-11-10").from).toBe("2026-10-12");
  });
});

describe("Ethiopian months", () => {
  it("parses only YYYY-MM with months 1 to 13", () => {
    expect(parseEthiopianMonth("2019-03")).toEqual({ year: 2019, month: 3 });
    expect(parseEthiopianMonth("2019-13")).toEqual({ year: 2019, month: 13 });
    expect(parseEthiopianMonth("2019-14")).toBeNull();
    expect(parseEthiopianMonth("2019-3")).toBeNull();
    expect(parseEthiopianMonth(undefined)).toBeNull();
    expect(formatEthiopianMonth({ year: 2019, month: 3 })).toBe("2019-03");
  });

  it("steps across Pagume and the new year", () => {
    expect(shiftEthiopianMonth({ year: 2018, month: 12 }, 1)).toEqual({ year: 2018, month: 13 });
    expect(shiftEthiopianMonth({ year: 2018, month: 13 }, 1)).toEqual({ year: 2019, month: 1 });
    expect(shiftEthiopianMonth({ year: 2019, month: 1 }, -1)).toEqual({ year: 2018, month: 13 });
    expect(currentEthiopianMonth("2026-11-17")).toEqual({ year: 2019, month: 3 });
  });

  it("covers the whole month, or up to today for the current one", () => {
    // Tikimt 2019 E.C.: 2026-10-11 to 2026-11-09.
    expect(ethiopianMonthDates({ year: 2019, month: 2 }, "2026-11-17")).toEqual({ from: "2026-10-11", to: "2026-11-09" });
    expect(ethiopianMonthDates({ year: 2019, month: 3 }, "2026-11-17")).toEqual({ from: "2026-11-10", to: "2026-11-17" });
    // Pagume has 5 days, 6 in a leap year (2019 E.C.).
    expect(ethiopianMonthDates({ year: 2018, month: 13 }, "2026-11-17")).toEqual({ from: "2026-09-06", to: "2026-09-10" });
    expect(ethiopianMonthDates({ year: 2019, month: 13 }, "2027-12-01")).toEqual({ from: "2027-09-06", to: "2027-09-11" });
    expect(ethiopianMonthDates({ year: 2019, month: 4 }, "2026-11-17")).toBeNull();
  });
});
