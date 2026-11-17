import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ReceiptPreview, type ReceiptLine } from "@/components/galmee/receipt-preview";
import { PrintButton } from "@/components/hotel/print-button";
import { buttonVariants } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import { formatEthiopianDate } from "@/lib/ethiopian-date";
import { formatBirr } from "@/lib/money";
import { occupancyPercent, type NightFlag } from "@/lib/night-audit";
import { cn } from "@/lib/utils";
import { getNightAudit } from "@/server/dal/hotel";
import { getSession } from "@/server/dal/session";
import { uuidParam } from "@/server/validation";

/** The night report on the 58 mm receipt layout, kept with the closed day. */
export default async function NightReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuidParam.safeParse(id).success) notFound();
  const [audit, { tenant }, t, locale] = await Promise.all([
    getNightAudit(id),
    getSession(),
    getTranslations("night"),
    getLocale() as Promise<Locale>,
  ]);
  if (!audit) notFound();
  const r = audit.report;
  const birr = (n: number) => formatBirr(n, locale);
  const shortDate = (d: string) => formatEthiopianDate(d, locale, { withEra: false });
  const closedTime = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Addis_Ababa",
  }).format(new Date(audit.closedAt));

  const flagLines = (title: string, rows: NightFlag[], amount: (f: NightFlag) => string): ReceiptLine[] =>
    rows.length === 0
      ? []
      : [
          { name: title, qty: String(rows.length), amount: "" },
          ...rows.map((f) => ({ name: `${f.room} ${f.guest}`, qty: "", amount: amount(f) })),
        ];

  const lines: ReceiptLine[] = [
    { name: t("inHouse"), qty: `${r.inHouse}/${r.rooms}`, amount: `${occupancyPercent(r)}%` },
    { name: t("arrivals"), qty: String(r.arrivals), amount: "" },
    { name: t("departures"), qty: String(r.departures), amount: "" },
    { name: t("extras"), qty: "", amount: birr(r.extras) },
    ...flagLines(t("noShows"), r.noShows, (f) => (f.date ? shortDate(f.date) : "")),
    ...flagLines(t("overstays"), r.overstays, (f) => (f.date ? shortDate(f.date) : "")),
    ...flagLines(t("owing"), r.owing, (f) => birr(f.balance ?? 0)),
  ];

  return (
    <div className="grid max-w-sm gap-4">
      <ReceiptPreview
        tenantName={tenant.name}
        title={t("report")}
        dateLabel={formatEthiopianDate(r.businessDate, locale)}
        details={[t("closedAt", { time: closedTime })]}
        lines={lines}
        totals={[{ label: t("income"), amount: birr(r.income) }]}
      />
      <div className="flex flex-wrap gap-2 print:hidden">
        <PrintButton label={t("print")} />
        <Link href="/night-audit" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "bg-card")}>
          {t("back")}
        </Link>
      </div>
    </div>
  );
}
