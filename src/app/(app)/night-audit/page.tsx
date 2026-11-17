import { getLocale, getTranslations } from "next-intl/server";
import { MoonStar } from "lucide-react";
import { closeNightAction } from "@/actions/stays";
import { EmptyState } from "@/components/galmee/empty-state";
import { ListRow, ListSheet } from "@/components/galmee/list-row";
import { MoneySummaryCard } from "@/components/galmee/money-summary-card";
import { ActionForm } from "@/components/hotel/action-form";
import type { Locale } from "@/i18n/config";
import { formatEthiopianDate } from "@/lib/ethiopian-date";
import { formatBirr } from "@/lib/money";
import { flagCount, occupancyPercent, type NightFlag } from "@/lib/night-audit";
import { listNightAudits, nightAuditPreview } from "@/server/dal/hotel";

export default async function NightAuditPage() {
  const [report, history, t, locale] = await Promise.all([
    nightAuditPreview(),
    listNightAudits(),
    getTranslations("night"),
    getLocale() as Promise<Locale>,
  ]);
  const flagged = flagCount(report);
  const shortDate = (d: string) => formatEthiopianDate(d, locale, { withEra: false });
  const stats = [
    { label: t("inHouse"), value: String(report.inHouse) },
    { label: t("arrivals"), value: String(report.arrivals) },
    { label: t("departures"), value: String(report.departures) },
  ];
  const sections: { id: string; title: string; hint: string; rows: NightFlag[]; right: (f: NightFlag) => string }[] = [
    { id: "no-shows", title: t("noShows"), hint: t("noShowsHint"), rows: report.noShows, right: (f) => (f.date ? t("since", { date: shortDate(f.date) }) : "") },
    { id: "overstays", title: t("overstays"), hint: t("overstaysHint"), rows: report.overstays, right: (f) => (f.date ? t("due", { date: shortDate(f.date) }) : "") },
    { id: "owing", title: t("owing"), hint: t("owingHint"), rows: report.owing, right: (f) => formatBirr(f.balance ?? 0, locale) },
  ];

  return (
    <div className="grid max-w-3xl gap-4">
      <div className="grid gap-1">
        <h1 className="text-[1.5625rem] leading-tight font-bold">{t("title")}</h1>
        <p className="num font-semibold">{t("openDate", { date: formatEthiopianDate(report.businessDate, locale) })}</p>
        <p className="text-sm text-muted-foreground">{t("intro")}</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <MoneySummaryCard label={t("income")} figure={formatBirr(report.income, locale)} sub={`${t("extras")}: ${formatBirr(report.extras, locale)}`} tone="in" />
        <MoneySummaryCard label={t("occupancy")} figure={`${occupancyPercent(report)}%`} sub={`${report.inHouse} / ${report.rooms}`} size="md" />
      </div>
      <dl className="grid grid-cols-3 divide-x rounded-md border bg-card">
        {stats.map((s) => (
          <div key={s.label} className="grid content-center gap-0.5 p-3">
            <dt className="text-sm leading-tight text-muted-foreground">{s.label}</dt>
            <dd className="num text-[1.5625rem] leading-tight font-bold">{s.value}</dd>
          </div>
        ))}
      </dl>

      {flagged === 0 ? (
        <EmptyState icon={MoonStar} message={t("allClear")} />
      ) : (
        <>
          <p role="status" className="font-semibold text-warn">
            {t("flagged", { count: flagged })}
          </p>
          {sections
            .filter((s) => s.rows.length > 0)
            .map((s) => (
              <section key={s.id} className="grid gap-2" aria-labelledby={s.id}>
                <div className="grid gap-0.5">
                  <h2 id={s.id} className="font-semibold">
                    {s.title} <span className="num text-muted-foreground">({s.rows.length})</span>
                  </h2>
                  <p className="text-sm text-muted-foreground">{s.hint}</p>
                </div>
                <ListSheet>
                  {s.rows.map((f) => (
                    <ListRow
                      key={f.stay}
                      href={`/stays/${f.stay}`}
                      title={t("roomGuest", { room: f.room, guest: f.guest })}
                      right={<span className="num">{s.right(f)}</span>}
                    />
                  ))}
                </ListSheet>
              </section>
            ))}
        </>
      )}

      <ActionForm
        action={closeNightAction}
        submitLabel={flagged === 0 ? t("close") : t("closeWithFlags")}
        variant={flagged === 0 ? "default" : "outline"}
        className="grid gap-3 sm:justify-self-start"
      />

      {history.length > 0 ? (
        <section className="grid gap-2" aria-labelledby="history">
          <h2 id="history" className="font-semibold">{t("history")}</h2>
          <ListSheet>
            {history.map((a) => (
              <ListRow
                key={a.id}
                href={`/night-audit/${a.id}`}
                title={<span className="num">{formatEthiopianDate(a.report.businessDate, locale)}</span>}
                sub={`${t("occupancy")} ${occupancyPercent(a.report)}% · ${t("flagged", { count: flagCount(a.report) })}`}
                right={<span className="num">{formatBirr(a.report.income, locale)}</span>}
              />
            ))}
          </ListSheet>
        </section>
      ) : null}
    </div>
  );
}
