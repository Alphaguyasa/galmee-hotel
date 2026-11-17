import { describe, expect, it } from "vitest";
import { flagCount, occupancyPercent, parseNightReport } from "./night-audit";

const raw = {
  business_date: "2026-11-17",
  rooms: 20,
  in_house: 13,
  arrivals: 4,
  departures: 3,
  income: "4500.00",
  extras: 350,
  no_shows: [{ stay: "s1", room: "102", guest: "Abebe K.", date: "2026-11-17" }],
  overstays: [{ stay: "s2", room: "103", guest: "Lensa T.", date: "2026-11-16" }],
  owing: [
    { stay: "s3", room: "101", guest: "Hana B.", balance: "700.00" },
    { room: "999", guest: "no stay id" },
  ],
};

describe("parseNightReport", () => {
  it("reads the stored report, numbers from strings included", () => {
    const r = parseNightReport(raw)!;
    expect(r.businessDate).toBe("2026-11-17");
    expect(r.income).toBe(4500);
    expect(r.inHouse).toBe(13);
    expect(r.noShows[0]).toEqual({ stay: "s1", room: "102", guest: "Abebe K.", date: "2026-11-17" });
    expect(r.owing).toEqual([{ stay: "s3", room: "101", guest: "Hana B.", balance: 700 }]);
  });

  it("refuses anything without a business date", () => {
    expect(parseNightReport(null)).toBeNull();
    expect(parseNightReport([])).toBeNull();
    expect(parseNightReport({ rooms: 3 })).toBeNull();
  });

  it("treats missing lists and numbers as empty", () => {
    const r = parseNightReport({ business_date: "2026-11-17", income: "x" })!;
    expect(r.income).toBe(0);
    expect(r.overstays).toEqual([]);
    expect(flagCount(r)).toBe(0);
  });
});

describe("occupancyPercent and flagCount", () => {
  it("rounds occupancy and survives a hotel with no rooms", () => {
    expect(occupancyPercent({ rooms: 20, inHouse: 13 })).toBe(65);
    expect(occupancyPercent({ rooms: 0, inHouse: 0 })).toBe(0);
  });

  it("counts every flag", () => {
    expect(flagCount(parseNightReport(raw)!)).toBe(3);
  });
});
