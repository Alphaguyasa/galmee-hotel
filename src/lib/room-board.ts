import { daysBetween, gregorianToJdn, jdnToGregorian, parseGregorian } from "@/lib/ethiopian-date";

export type BoardStay = { id: string; roomId: string; checkIn: string; checkOut: string };

export type BoardBar<T extends BoardStay = BoardStay> = {
  stay: T;
  /** 1-based day column inside the visible window. */
  column: number;
  span: number;
  startsBeforeWindow: boolean;
  endsAfterWindow: boolean;
};

const pad = (n: number) => String(n).padStart(2, "0");

/** Adds days to a plain `YYYY-MM-DD` date. */
export function addDays(day: string, amount: number): string {
  const { year, month, day: d } = jdnToGregorian(gregorianToJdn(parseGregorian(day)) + amount);
  return `${year}-${pad(month)}-${pad(d)}`;
}

/** Today's date in Addis Ababa as `YYYY-MM-DD`. */
export function addisToday(now: Date = new Date()): string {
  const { year, month, day } = parseGregorian(now);
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function dayRange(start: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDays(start, i));
}

/**
 * Places stays on the board. A stay fills the nights it covers, so the check-out
 * day stays free for the next guest. Stays outside the window are dropped.
 */
export function placeStays<T extends BoardStay>(stays: T[], windowStart: string, days: number): Map<string, BoardBar<T>[]> {
  const byRoom = new Map<string, BoardBar<T>[]>();
  for (const stay of stays) {
    const first = daysBetween(stay.checkIn, windowStart);
    const last = daysBetween(stay.checkOut, windowStart);
    if (last <= 0 || first >= days) continue;
    const start = Math.max(first, 0);
    const end = Math.min(last, days);
    const bar: BoardBar<T> = {
      stay,
      column: start + 1,
      span: end - start,
      startsBeforeWindow: first < 0,
      endsAfterWindow: last > days,
    };
    byRoom.set(stay.roomId, [...(byRoom.get(stay.roomId) ?? []), bar]);
  }
  for (const bars of byRoom.values()) bars.sort((a, b) => a.column - b.column);
  return byRoom;
}

export type BoardStatus = "reserved" | "in_house" | "checked_out";

export type SummaryStay = { checkIn: string; checkOut: string; status: BoardStatus };

export type BoardSummary = { inHouse: number; arrivals: number; dueOut: number; freeTonight: number };

/** The four numbers reception reads first. A room leaving today is free tonight. */
export function boardSummary(stays: SummaryStay[], today: string, roomsInService: number): BoardSummary {
  let inHouse = 0;
  let arrivals = 0;
  let dueOut = 0;
  let takenTonight = 0;
  for (const s of stays) {
    if (s.status === "in_house") {
      inHouse += 1;
      if (s.checkOut <= today) dueOut += 1;
    }
    if (s.status === "reserved" && s.checkIn === today) arrivals += 1;
    if (s.status !== "checked_out" && s.checkIn <= today && s.checkOut > today) takenTonight += 1;
  }
  return { inHouse, arrivals, dueOut, freeTonight: Math.max(roomsInService - takenTonight, 0) };
}

/** First in-service room of a type with no stay over [checkIn, checkOut), or undefined. */
export function firstFreeRoom<R extends { id: string; typeName: string; inService: boolean }>(
  rooms: R[],
  stays: { roomId: string; checkIn: string; checkOut: string; status: string }[],
  typeName: string | undefined,
  checkIn: string,
  checkOut: string,
): R | undefined {
  const busy = new Set(
    stays.filter((s) => s.status !== "checked_out" && s.checkIn < checkOut && s.checkOut > checkIn).map((s) => s.roomId),
  );
  return rooms.find((r) => r.inService && !busy.has(r.id) && (!typeName || r.typeName === typeName));
}
