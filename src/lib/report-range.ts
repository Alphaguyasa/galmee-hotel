import { ethiopianToJdn, gregorianToJdn, isEthiopianLeapYear, jdnToGregorian, parseGregorian, toEthiopian } from "@/lib/ethiopian-date";

export const REPORT_RANGES = ["today", "week", "month", "7", "14", "30"] as const;
export type ReportRange = (typeof REPORT_RANGES)[number];
export const DEFAULT_REPORT_RANGE: ReportRange = "14";

export function parseReportRange(value: string | null | undefined): ReportRange {
  return REPORT_RANGES.find((r) => r === value) ?? DEFAULT_REPORT_RANGE;
}

function isoFromJdn(jdn: number): string {
  const { year, month, day } = jdnToGregorian(jdn);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * First and last day (Gregorian ISO, inclusive) of a report range ending today.
 * The week starts on Monday; the month is the current Ethiopian month.
 */
export function reportRangeDates(range: ReportRange, today: string): { from: string; to: string } {
  const todayJdn = gregorianToJdn(parseGregorian(today));
  let fromJdn: number;
  switch (range) {
    case "today":
      fromJdn = todayJdn;
      break;
    case "week":
      // JDN % 7 is 0 on Monday.
      fromJdn = todayJdn - (((todayJdn % 7) + 7) % 7);
      break;
    case "month": {
      const { year, month } = toEthiopian(parseGregorian(today));
      fromJdn = ethiopianToJdn({ year, month, day: 1 });
      break;
    }
    default:
      fromJdn = todayJdn - (Number(range) - 1);
  }
  return { from: isoFromJdn(fromJdn), to: today };
}

/** An Ethiopian calendar month, used for the monthly report (`?month=2019-03`). */
export type EthiopianMonth = { year: number; month: number };

export function parseEthiopianMonth(value: string | null | undefined): EthiopianMonth | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value ?? "");
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 13 || year < 1900) return null;
  return { year, month };
}

export function formatEthiopianMonth({ year, month }: EthiopianMonth): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function currentEthiopianMonth(today: string): EthiopianMonth {
  const { year, month } = toEthiopian(parseGregorian(today));
  return { year, month };
}

/** Moves by whole months; the 13th month (Pagume) counts as a month. */
export function shiftEthiopianMonth({ year, month }: EthiopianMonth, delta: number): EthiopianMonth {
  const index = year * 13 + (month - 1) + delta;
  return { year: Math.floor(index / 13), month: (((index % 13) + 13) % 13) + 1 };
}

/**
 * First and last day (Gregorian ISO, inclusive) of an Ethiopian month, cut at
 * today for the current month. Null for a month that has not started yet.
 */
export function ethiopianMonthDates(m: EthiopianMonth, today: string): { from: string; to: string } | null {
  const fromJdn = ethiopianToJdn({ ...m, day: 1 });
  const length = m.month < 13 ? 30 : isEthiopianLeapYear(m.year) ? 6 : 5;
  const todayJdn = gregorianToJdn(parseGregorian(today));
  if (fromJdn > todayJdn) return null;
  return { from: isoFromJdn(fromJdn), to: isoFromJdn(Math.min(fromJdn + length - 1, todayJdn)) };
}
