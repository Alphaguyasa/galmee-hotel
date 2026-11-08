import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/config";
import { formatEthiopianDate } from "@/lib/ethiopian-date";
import { formatBirr } from "@/lib/money";
import { getGuest } from "@/server/dal/hotel";
import { uuidParam } from "@/server/validation";

export default async function GuestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuidParam.safeParse(id).success) notFound();
  const [guest, t, tStay, locale] = await Promise.all([
    getGuest(id),
    getTranslations("guests"),
    getTranslations("stay"),
    getLocale() as Promise<Locale>,
  ]);
  if (!guest) notFound();
  return (
    <div className="grid max-w-xl gap-4">
      <header className="grid gap-1">
        <h1 className="text-2xl font-semibold">{guest.name}</h1>
        {guest.phone ? (
          <a href={`tel:${guest.phone}`} className="num w-fit text-primary underline underline-offset-4">
            {guest.phone}
          </a>
        ) : null}
        {guest.balance > 0 ? (
          <p className="num font-semibold text-destructive">{t("owes", { amount: formatBirr(guest.balance, locale) })}</p>
        ) : null}
      </header>
      <h2 className="text-lg font-semibold">{t("stays")}</h2>
      {guest.stays.length === 0 ? (
        <p className="text-muted-foreground">{t("noStays")}</p>
      ) : (
        <ul className="divide-y rounded-md border bg-card">
          {guest.stays.map((s) => (
            <li key={s.id}>
              <Link href={`/stays/${s.id}`} className="grid gap-0.5 p-3 hover:bg-accent">
                <span className="font-medium">{tStay("roomLine", { number: s.roomNumber, type: tStay(`statuses.${s.status}`) })}</span>
                <span className="num text-sm text-muted-foreground">
                  {formatEthiopianDate(s.checkIn, locale)} → {formatEthiopianDate(s.checkOut, locale)}
                </span>
                {s.idNumber ? (
                  <span className="num text-sm text-muted-foreground">
                    {tStay(`idTypes.${s.idType ?? "other"}`)}: {s.idNumber}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
