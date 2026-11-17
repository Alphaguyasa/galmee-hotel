import { addisToday } from "@/lib/room-board";
import { toEthiopian, parseGregorian } from "@/lib/ethiopian-date";
import { ethiopianMonthDates, parseEthiopianMonth, parseReportRange, reportRangeDates } from "@/lib/report-range";
import { dailyReport } from "@/server/dal/hotel";
import { getSession } from "@/server/dal/session";

export async function GET(request: Request) {
  const { profile } = await getSession();
  if (profile.role === "staff") return new Response("Forbidden", { status: 403 });

  const params = new URL(request.url).searchParams;
  const today = addisToday();
  const month = parseEthiopianMonth(params.get("month"));
  const { from, to } = (month && ethiopianMonthDates(month, today)) || reportRangeDates(parseReportRange(params.get("range")), today);
  const rows = await dailyReport(from, to);

  // Every value is a date or a number from the report, so nothing needs quoting.
  const lines = [
    "date,ethiopian_date,rooms,occupied,arrivals,departures,income",
    ...rows.map((d) => [d.day, ethiopianIso(d.day), d.rooms, d.occupied, d.arrivals, d.departures, d.income.toFixed(2)].join(",")),
  ];
  return new Response(`${lines.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="occupancy-${from}-to-${to}.csv"`,
    },
  });
}

function ethiopianIso(day: string) {
  const { year, month, day: date } = toEthiopian(parseGregorian(day));
  return `${year}-${String(month).padStart(2, "0")}-${String(date).padStart(2, "0")}`;
}
