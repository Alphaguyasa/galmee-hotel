import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/config";
import { formatEthiopianDate } from "@/lib/ethiopian-date";
import { formatBirr } from "@/lib/money";
import { addDays, addisToday } from "@/lib/room-board";
import { dailyReport } from "@/server/dal/hotel";
import { getSession } from "@/server/dal/session";

const REPORT_DAYS = 14;

export default async function ReportsPage() {
  const { profile } = await getSession();
  if (profile.role === "staff") redirect("/");
  const today = addisToday();
  const [days, t, locale] = await Promise.all([
    dailyReport(addDays(today, -(REPORT_DAYS - 1)), today),
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
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <dl className="grid grid-cols-2 gap-2">
        <div className="rounded-md border bg-card p-3">
          <dt className="text-sm text-muted-foreground">{t("occupancy", { days: REPORT_DAYS })}</dt>
          <dd className="num text-2xl font-semibold">{occupancy}%</dd>
        </div>
        <div className="rounded-md border bg-card p-3">
          <dt className="text-sm text-muted-foreground">{t("income", { days: REPORT_DAYS })}</dt>
          <dd className="num text-2xl font-semibold">{formatBirr(income, locale)}</dd>
        </div>
      </dl>
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
