import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Locale } from "@/i18n/config";
import { formatBirr } from "@/lib/money";
import { searchGuests } from "@/server/dal/hotel";

export default async function GuestsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").slice(0, 80);
  const [guests, t, locale] = await Promise.all([searchGuests(q), getTranslations("guests"), getLocale() as Promise<Locale>]);
  return (
    <div className="grid max-w-xl gap-4">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <form role="search" className="flex gap-2">
        <Input name="q" type="search" defaultValue={q} placeholder={t("searchPlaceholder")} aria-label={t("search")} />
        <Button type="submit" size="icon" aria-label={t("search")}>
          <Search aria-hidden />
        </Button>
      </form>
      {guests.length === 0 ? (
        <p className="text-muted-foreground">{q ? t("noMatch") : t("empty")}</p>
      ) : (
        <ul className="divide-y rounded-md border bg-card">
          {guests.map((g) => (
            <li key={g.id}>
              <Link href={`/guests/${g.id}`} className="flex min-h-14 items-center justify-between gap-3 p-3 hover:bg-accent">
                <div className="min-w-0">
                  <div className="truncate font-medium">{g.name}</div>
                  {g.phone ? <div className="num text-sm text-muted-foreground">{g.phone}</div> : null}
                </div>
                {g.balance > 0 ? <span className="num shrink-0 font-semibold text-destructive">{formatBirr(g.balance, locale)}</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
