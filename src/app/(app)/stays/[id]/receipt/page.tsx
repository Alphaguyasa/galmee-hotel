import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ReceiptPreview } from "@/components/galmee/receipt-preview";
import { PrintButton } from "@/components/hotel/print-button";
import type { Locale } from "@/i18n/config";
import { formatEthiopianDate } from "@/lib/ethiopian-date";
import { buildFolio, type FolioLabels } from "@/lib/folio";
import { formatBirr } from "@/lib/money";
import { getStay } from "@/server/dal/hotel";
import { getSession } from "@/server/dal/session";
import { uuidParam } from "@/server/validation";

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuidParam.safeParse(id).success) notFound();
  const [stay, { tenant }, t, locale] = await Promise.all([
    getStay(id),
    getSession(),
    getTranslations("stay"),
    getLocale() as Promise<Locale>,
  ]);
  if (!stay) notFound();

  const labels: FolioLabels = {
    title: t("receipt"),
    number: (ref) => t("receiptNo", { ref }),
    room: (number, type) => t("roomLine", { number, type }),
    nights: (nights, rate) => t("nightsLine", { nights, rate }),
    chargeKind: (kind) => t(`kinds.${kind}`),
    roomTotal: t("roomTotal"),
    extras: t("extras"),
    paidOn: (date) => t("paidOn", { date }),
    paid: t("paid"),
    balance: t("balance"),
    thanks: t("thanks"),
  };
  const folio = buildFolio(
    stay,
    labels,
    {
      birr: (n) => formatBirr(n, locale),
      date: (d) => formatEthiopianDate(d, locale),
      shortDate: (d) => formatEthiopianDate(d, locale, { withEra: false }),
    },
    new Date(),
  );

  return (
    <div className="grid max-w-sm gap-4">
      <ReceiptPreview
        tenantName={tenant.name}
        title={folio.title}
        dateLabel={folio.dateLabel}
        details={[folio.number, ...folio.details]}
        lines={folio.lines}
        totals={folio.totals}
        footer={folio.footer}
      />
      <PrintButton label={t("print")} />
    </div>
  );
}
