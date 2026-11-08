import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { PrintButton } from "@/components/hotel/print-button";
import type { Locale } from "@/i18n/config";
import { formatEthiopianDate } from "@/lib/ethiopian-date";
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
  const birr = (n: number) => formatBirr(n, locale);
  const { totals } = stay;
  return (
    <div className="grid max-w-xs gap-4">
      <article className="num grid gap-2 text-sm print:text-xs">
        <h1 className="text-center text-base font-semibold">{tenant.name}</h1>
        <p className="text-center">{t("receipt")}</p>
        <p>{stay.guestName}</p>
        <p>{t("roomLine", { number: stay.roomNumber, type: stay.roomTypeName })}</p>
        <p>
          {formatEthiopianDate(stay.checkIn, locale)} → {formatEthiopianDate(stay.checkOut, locale)}
        </p>
        <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 border-t border-dashed pt-2">
          <dt>{t("nightsLine", { nights: totals.nights, rate: birr(stay.nightlyRate) })}</dt>
          <dd className="text-right">{birr(totals.room)}</dd>
          {stay.charges.map((c) => (
            <div key={c.id} className="contents">
              <dt>{c.description ?? t(`kinds.${c.kind}`)}</dt>
              <dd className="text-right">{birr(c.amount)}</dd>
            </div>
          ))}
          <dt className="border-t border-dashed pt-1">{t("paid")}</dt>
          <dd className="border-t border-dashed pt-1 text-right">{birr(totals.paid)}</dd>
          <dt className="font-semibold">{t("balance")}</dt>
          <dd className="text-right font-semibold">{birr(totals.balance)}</dd>
        </dl>
        <p className="text-center">{formatEthiopianDate(new Date(), locale)}</p>
      </article>
      <PrintButton label={t("print")} />
    </div>
  );
}
