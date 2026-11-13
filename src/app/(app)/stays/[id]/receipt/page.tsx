import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ReceiptPreview } from "@/components/galmee/receipt-preview";
import { PrintButton } from "@/components/hotel/print-button";
import { buttonVariants } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import { formatEthiopianDate } from "@/lib/ethiopian-date";
import { buildFolio, folioText, telegramShareUrl, type FolioLabels } from "@/lib/folio";
import { formatBirr } from "@/lib/money";
import { cn } from "@/lib/utils";
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
      <p className="text-sm text-muted-foreground print:hidden">{t("receiptHint")}</p>
      <ReceiptPreview
        tenantName={tenant.name}
        title={folio.title}
        dateLabel={folio.dateLabel}
        details={[folio.number, ...folio.details]}
        lines={folio.lines}
        totals={folio.totals}
        footer={folio.footer}
      />
      <div className="grid gap-2 sm:grid-cols-2 print:hidden">
        <PrintButton label={t("print")} />
        <a
          href={telegramShareUrl(folioText(folio, tenant.name))}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: "outline", size: "lg" }), "bg-card")}
        >
          {t("sendTelegram")}
        </a>
      </div>
    </div>
  );
}
