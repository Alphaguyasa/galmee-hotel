import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { MoneySummaryCard } from "@/components/galmee/money-summary-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/config";
import { ETHIOPIAN_MONTHS, formatEthiopianDate } from "@/lib/ethiopian-date";
import { formatBirr } from "@/lib/money";
import { addisToday } from "@/lib/room-board";
import {
  REPORT_RANGES,
  currentEthiopianMonth,
  ethiopianMonthDates,
  formatEthiopianMonth,
  parseEthiopianMonth,
  parseReportRange,
  reportRangeDates,
  shiftEthiopianMonth,
  type ReportRange,
} from "@/lib/report-range";
import { dailyReport } from "@/server/dal/hotel";
import { getSession } from "@/server/dal/session";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; month?: string }>;
}) {
  const params = await searchParams;
  const { profile } = await getSession();
  if (profile.role === "staff") redirect("/");
  const today = addisToday();
  // A past Ethiopian month (?month=2019-02) or the current one ("This month").
  const pickedMonth = parseEthiopianMonth(params.month);
  const monthDates = pickedMonth
    ? ethiopianMonthDates(pickedMonth, today)
    : null;
  const range = monthDates ? "month" : parseReportRange(params.range);
  const month =
    monthDates && pickedMonth
      ? pickedMonth
      : range === "month"
        ? currentEthiopianMonth(today)
        : null;
  const { from, to } = monthDates ?? reportRangeDates(range, today);
  const pastMonth =
    month !== null &&
    formatEthiopianMonth(month) !==
      formatEthiopianMonth(currentEthiopianMonth(today));
  const exportQuery =
    monthDates && pickedMonth
      ? `month=${formatEthiopianMonth(pickedMonth)}`
      : `range=${range}`;
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
        {REPORT_RANGES.map((r) => {
          const active = r === range && !pastMonth;
          return (
            <Link
              key={r}
              href={`/reports?range=${r}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                buttonVariants({ variant: active ? "default" : "outline" }),
                !active && "bg-card",
              )}
            >
              {rangeLabel(r, t)}
            </Link>
          );
        })}
        <a
          href={`/reports/export?${exportQuery}`}
          className={cn(buttonVariants({ variant: "outline" }), "bg-card")}
        >
          <Download aria-hidden />
          {t("export")}
        </a>
      </nav>
      {month ? (
        <MonthBar month={month} today={today} locale={locale} t={t} />
      ) : null}
      <p className="text-sm text-muted-foreground">
        {from === to
          ? formatEthiopianDate(from, locale)
          : t("period", {
              from: formatEthiopianDate(from, locale, { withEra: false }),
              to: formatEthiopianDate(to, locale),
            })}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <MoneySummaryCard
          label={t("income")}
          figure={formatBirr(income, locale)}
          tone="in"
        />
        <MoneySummaryCard
          label={t("occupancy")}
          figure={`${occupancy}%`}
          sub={`${nights}/${capacity}`}
          size="md"
        />
      </div>
      <div
        className="overflow-x-auto rounded-md border bg-card"
        role="region"
        aria-label={t("title")}
        tabIndex={0}
      >
        <table className="num w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="p-2 font-medium">{t("date")}</th>
              <th className="p-2 text-right font-medium">
                {t("incomeColumn")}
              </th>
              <th className="p-2 text-right font-medium">{t("occupied")}</th>
              <th className="p-2 text-right font-medium">{t("arrivals")}</th>
              <th className="p-2 text-right font-medium">{t("departures")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.day} className="border-b last:border-b-0">
                <td className="p-2 whitespace-nowrap">
                  {formatEthiopianDate(d.day, locale, { withEra: false })}
                </td>
                <td className="p-2 text-right whitespace-nowrap">
                  {formatBirr(d.income, locale)}
                </td>
                <td className="p-2 text-right whitespace-nowrap">
                  {d.occupied}/{d.rooms}
                </td>
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

function rangeLabel(
  range: ReportRange,
  t: (key: string, values?: Record<string, number>) => string,
) {
  if (range === "today") return t("today");
  if (range === "week") return t("thisWeek");
  if (range === "month") return t("thisMonth");
  return t("lastDays", { days: Number(range) });
}

function MonthBar({
  month,
  today,
  locale,
  t,
}: {
  month: { year: number; month: number };
  today: string;
  locale: Locale;
  t: (key: string, values?: Record<string, string>) => string;
}) {
  const previous = shiftEthiopianMonth(month, -1);
  const next = shiftEthiopianMonth(month, 1);
  const hasNext = ethiopianMonthDates(next, today) !== null;
  const name = (m: { year: number; month: number }) =>
    `${ETHIOPIAN_MONTHS[locale][m.month - 1]} ${m.year}`;
  const arrow = cn(
    buttonVariants({ variant: "outline", size: "icon" }),
    "bg-card",
  );
  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/reports?month=${formatEthiopianMonth(previous)}`}
        className={arrow}
        aria-label={t("previousMonth", { month: name(previous) })}
      >
        <ChevronLeft aria-hidden />
      </Link>
      <p
        className="min-w-0 flex-1 text-center font-semibold"
        aria-live="polite"
      >
        {name(month)}
      </p>
      {hasNext ? (
        <Link
          href={`/reports?month=${formatEthiopianMonth(next)}`}
          className={arrow}
          aria-label={t("nextMonth", { month: name(next) })}
        >
          <ChevronRight aria-hidden />
        </Link>
      ) : (
        <span
          className={cn(arrow, "pointer-events-none opacity-40")}
          aria-hidden
        >
          <ChevronRight />
        </span>
      )}
    </div>
  );
}
