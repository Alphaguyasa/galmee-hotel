import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { declineRequestAction } from "@/actions/stays";
import { Button, buttonVariants } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import { formatEthiopianDate } from "@/lib/ethiopian-date";
import { listNewRequests } from "@/server/dal/hotel";

export default async function RequestsPage() {
  const [requests, t, locale] = await Promise.all([listNewRequests(), getTranslations("requests"), getLocale() as Promise<Locale>]);
  return (
    <div className="grid max-w-xl gap-4">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      {requests.length === 0 ? (
        <p className="text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="grid gap-3">
          {requests.map((r) => (
            <li key={r.id} className="grid gap-2 rounded-md border bg-card p-3">
              <div>
                <div className="font-semibold">{r.guestName}</div>
                <a href={`tel:${r.phone}`} className="num text-sm text-primary underline underline-offset-4">
                  {r.phone}
                </a>
              </div>
              <p className="num text-sm">
                {formatEthiopianDate(r.checkIn, locale)} → {formatEthiopianDate(r.checkOut, locale)}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("details", { type: r.roomTypeName ?? t("anyType"), adults: r.adults })}
              </p>
              {r.message ? <p className="text-sm">{r.message}</p> : null}
              <div className="grid grid-cols-2 gap-2">
                <Link href={`/stays/new?request=${r.id}`} prefetch={false} className={buttonVariants()}>
                  {t("confirm")}
                </Link>
                <form action={declineRequestAction.bind(null, r.id)} className="grid">
                  <Button type="submit" variant="outline">
                    {t("decline")}
                  </Button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
