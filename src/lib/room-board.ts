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
