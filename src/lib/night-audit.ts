/** One flagged stay in a night report. `date` for no-shows and overstays, `balance` for guests who owe. */
export type NightFlag = { stay: string; room: string; guest: string; date?: string; balance?: number };

export type NightReport = {
  businessDate: string;
  rooms: number;
  inHouse: number;
  arrivals: number;
  departures: number;
  income: number;
  extras: number;
  noShows: NightFlag[];
  overstays: NightFlag[];
  owing: NightFlag[];
};

const DAY = /^\d{4}-\d{2}-\d{2}$/;

function num(v: unknown): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : 0;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function flags(v: unknown): NightFlag[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((f) => {
    if (!f || typeof f !== "object") return [];
    const o = f as Record<string, unknown>;
    const stay = str(o.stay);
    if (!stay) return [];
    const flag: NightFlag = { stay, room: str(o.room), guest: str(o.guest) };
    if (DAY.test(str(o.date))) flag.date = str(o.date);
    if (o.balance !== undefined) flag.balance = num(o.balance);
    return [flag];
  });
}

/** Reads the night report stored by the database. Missing or odd fields become zero or empty. */
export function parseNightReport(raw: unknown): NightReport | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const businessDate = str(o.business_date);
  if (!DAY.test(businessDate)) return null;
  return {
    businessDate,
    rooms: num(o.rooms),
    inHouse: num(o.in_house),
    arrivals: num(o.arrivals),
    departures: num(o.departures),
    income: num(o.income),
    extras: num(o.extras),
    noShows: flags(o.no_shows),
    overstays: flags(o.overstays),
    owing: flags(o.owing),
  };
}

/** Rooms sold tonight as a whole percentage of rooms in service. */
export function occupancyPercent(report: Pick<NightReport, "rooms" | "inHouse">): number {
  return report.rooms > 0 ? Math.round((report.inHouse / report.rooms) * 100) : 0;
}

/** Everything reception should look at before closing. */
export function flagCount(report: Pick<NightReport, "noShows" | "overstays" | "owing">): number {
  return report.noShows.length + report.overstays.length + report.owing.length;
}
