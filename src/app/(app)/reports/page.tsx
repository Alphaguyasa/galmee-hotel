import Link from "next/link";
import { redirect } from "next/navigation";
import { Download } from "lucide-react";
import { MoneySummaryCard } from "@/components/galmee/money-summary-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/config";
import { formatEthiopianDate } from "@/lib/ethiopian-date";
import { formatBirr } from "@/lib/money";
import { addisToday } from "@/lib/room-board";
import { REPORT_RANGES, parseReportRange, reportRangeDates, type ReportRange } from "@/lib/report-range";
import { dailyReport } from "@/server/dal/hotel";
import { getSession } from "@/server/dal/session";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const range = parseReportRange((await searchParams).range);
  const { profile } = await getSession();
  if (profile.role === "staff") redirect("/");
  const { from, to } = reportRangeDates(range, addisToday());
  const [days, t, locale] = await Promise.all([
    dailyReport(from, to),
    getTranslations("reports"),
    getLocale() as Promise<Locale>,
  ]);
  const rows = [...days].reverse();
  const income = days.reduce((sum, d) => sum + d.income, 0);
  const nights = days.reduce((sum, d) => sum + d.occupied, 0);
  const capacity = days.reduce((sum, d) => sum + d.rooms, 0);
  const occupancy = capacity ? Math.round((nights / capacity) * 100) : 0;
  return (
    <div className="grid max-w-3xl gap-4">
      <h1 className="text-[1.5625rem] leading-tight font-bold">{t("title")}</h1>
      <nav className="flex flex-wrap gap-2" aria-label={t("range")}>
        {REPORT_RANGES.map((r) => (
          <Link
            key={r}
            href={`/reports?range=${r}`}
            aria-current={r === range ? "page" : undefined}
            className={cn(buttonVariants({ variant: r === range ? "default" : "outline" }), r !== range && "bg-card")}
          >
            {rangeLabel(r, t)}
          </Link>
        ))}
        <a href={`/reports/export?range=${range}`} className={cn(buttonVariants({ variant: "outline" }), "bg-card")}>
          <Download aria-hidden />
          {t("export")}
        </a>
      </nav>
      <p className="text-sm text-muted-foreground">
        {from === to
          ? formatEthiopianDate(from, locale)
          : t("period", { from: formatEthiopianDate(from, locale, { withEra: false }), to: formatEthiopianDate(to, locale) })}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <MoneySummaryCard label={t("income")} figure={formatBirr(income, locale)} tone="in" />
        <MoneySummaryCard
          label={t("occupancy")}
          figure={`${occupancy}%`}
          sub={`${nights}/${capacity}`}
          size="md"
        />
      </div>
      <div className="overflow-x-auto rounded-md border bg-card" role="region" aria-label={t("title")} tabIndex={0}>
        <table className="num w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="p-2 font-medium">{t("date")}</th>
              <th className="p-2 text-right font-medium">{t("incomeColumn")}</th>
              <th className="p-2 text-right font-medium">{t("occupied")}</th>
              <th className="p-2 text-right font-medium">{t("arrivals")}</th>
              <th className="p-2 text-right font-medium">{t("departures")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.day} className="border-b last:border-b-0">
                <td className="p-2 whitespace-nowrap">{formatEthiopianDate(d.day, locale, { withEra: false })}</td>
                <td className="p-2 text-right whitespace-nowrap">{formatBirr(d.income, locale)}</td>
                <td className="p-2 text-right whitespace-nowrap">{d.occupied}/{d.rooms}</td>
                <td className="p-2 text-right">{d.arrivals}</td>
                <td className="p-2 text-right">{d.departures}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function rangeLabel(range: ReportRange, t: (key: string, values?: Record<string, number>) => string) {
  if (range === "today") return t("today");
  if (range === "week") return t("thisWeek");
  if (range === "month") return t("thisMonth");
  return t("lastDays", { days: Number(range) });
}
