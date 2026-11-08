import { describe, expect, it } from "vitest";
import { addDays, addisToday, boardSummary, dayRange, firstFreeRoom, placeStays } from "./room-board";

const stay = (id: string, checkIn: string, checkOut: string, roomId = "r1") => ({ id, roomId, checkIn, checkOut });

describe("addDays", () => {
  it("crosses month and year ends", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("addisToday", () => {
  it("uses Addis Ababa time, not UTC", () => {
    expect(addisToday(new Date("2026-11-08T20:59:00Z"))).toBe("2026-11-08");
    expect(addisToday(new Date("2026-11-08T21:01:00Z"))).toBe("2026-11-09");
  });
});

describe("dayRange", () => {
  it("lists consecutive days", () => {
    expect(dayRange("2026-11-30", 3)).toEqual(["2026-11-30", "2026-12-01", "2026-12-02"]);
  });
});

describe("placeStays", () => {
  const start = "2026-11-08";

  it("fills nights and leaves the check-out day free", () => {
    const [bar] = placeStays([stay("a", "2026-11-09", "2026-11-11")], start, 14).get("r1")!;
    expect(bar).toMatchObject({ column: 2, span: 2, startsBeforeWindow: false, endsAfterWindow: false });
  });

  it("puts back-to-back stays in adjoining columns", () => {
    const bars = placeStays([stay("b", "2026-11-10", "2026-11-12"), stay("a", "2026-11-08", "2026-11-10")], start, 14).get("r1")!;
    expect(bars.map((b) => [b.stay.id, b.column, b.span])).toEqual([["a", 1, 2], ["b", 3, 2]]);
  });

  it("clips stays at the window edges", () => {
    const [left] = placeStays([stay("a", "2026-11-05", "2026-11-10")], start, 14).get("r1")!;
    expect(left).toMatchObject({ column: 1, span: 2, startsBeforeWindow: true });
    const [right] = placeStays([stay("b", "2026-11-20", "2026-11-30")], start, 14).get("r1")!;
    expect(right).toMatchObject({ column: 13, span: 2, endsAfterWindow: true });
  });

  it("drops stays outside the window, including one that ends on its first day", () => {
    const placed = placeStays([stay("a", "2026-11-01", "2026-11-08"), stay("b", "2026-11-22", "2026-11-23")], start, 14);
    expect(placed.size).toBe(0);
  });

  it("keeps rooms separate", () => {
    const placed = placeStays([stay("a", start, "2026-11-09", "r1"), stay("b", start, "2026-11-09", "r2")], start, 14);
    expect([...placed.keys()].sort()).toEqual(["r1", "r2"]);
  });
});

describe("boardSummary", () => {
  const today = "2026-11-08";
  it("counts in-house, arrivals and rooms due out", () => {
    const s = boardSummary(
      [
        { checkIn: "2026-11-06", checkOut: "2026-11-08", status: "in_house" },
        { checkIn: "2026-11-07", checkOut: "2026-11-10", status: "in_house" },
        { checkIn: "2026-11-08", checkOut: "2026-11-09", status: "reserved" },
        { checkIn: "2026-11-01", checkOut: "2026-11-03", status: "checked_out" },
      ],
      today,
      5,
    );
    expect(s).toEqual({ inHouse: 2, arrivals: 1, dueOut: 1, freeTonight: 3 });
  });
  it("never goes below zero free rooms", () => {
    const s = boardSummary([{ checkIn: today, checkOut: "2026-11-09", status: "reserved" }], today, 0);
    expect(s.freeTonight).toBe(0);
  });
});

describe("firstFreeRoom", () => {
  const rooms = [
    { id: "a", typeName: "Twin", inService: false },
    { id: "b", typeName: "Twin", inService: true },
    { id: "c", typeName: "Twin", inService: true },
    { id: "d", typeName: "Family", inService: true },
  ];
  it("skips rooms out of service and rooms with an overlapping stay", () => {
    const stays = [{ roomId: "b", checkIn: "2026-11-08", checkOut: "2026-11-10", status: "reserved" }];
    expect(firstFreeRoom(rooms, stays, "Twin", "2026-11-09", "2026-11-11")?.id).toBe("c");
  });
  it("treats check-out day as free", () => {
    const stays = [{ roomId: "b", checkIn: "2026-11-08", checkOut: "2026-11-10", status: "reserved" }];
    expect(firstFreeRoom(rooms, stays, "Twin", "2026-11-10", "2026-11-11")?.id).toBe("b");
  });
  it("returns undefined when nothing fits", () => {
    expect(firstFreeRoom(rooms, [], "Suite", "2026-11-10", "2026-11-11")).toBeUndefined();
  });
});
