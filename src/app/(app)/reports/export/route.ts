import { addisToday } from "@/lib/room-board";
import { parseReportRange, reportRangeDates } from "@/lib/report-range";
import { dailyReport } from "@/server/dal/hotel";
import { getSession } from "@/server/dal/session";

export async function GET(request: Request) {
  const { profile } = await getSession();
  if (profile.role === "staff") return new Response("Forbidden", { status: 403 });

  const range = parseReportRange(new URL(request.url).searchParams.get("range"));
  const { from, to } = reportRangeDates(range, addisToday());
  const rows = await dailyReport(from, to);

  // Every value is a date or a number from the report, so nothing needs quoting.
  const lines = ["date,rooms,occupied,arrivals,departures,income", ...rows.map((d) => [d.day, d.rooms, d.occupied, d.arrivals, d.departures, d.income.toFixed(2)].join(","))];
  return new Response(`${lines.join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="occupancy-${from}-to-${to}.csv"`,
    },
  });
}
