import { getLocale, getTranslations } from "next-intl/server";
import { Search, Users } from "lucide-react";
import { EmptyState } from "@/components/galmee/empty-state";
import { ListRow, ListSheet } from "@/components/galmee/list-row";
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
      <h1 className="text-[1.5625rem] leading-tight font-bold">{t("title")}</h1>
      <form role="search" className="flex gap-2">
        <Input name="q" type="search" defaultValue={q} placeholder={t("searchPlaceholder")} aria-label={t("search")} />
        <Button type="submit" size="icon" aria-label={t("search")}>
          <Search aria-hidden />
        </Button>
      </form>
      {guests.length === 0 ? (
        <EmptyState icon={Users} message={q ? t("noMatch") : t("empty")} />
      ) : (
        <ListSheet>
          {guests.map((g) => (
            <ListRow
              key={g.id}
              href={`/guests/${g.id}`}
              title={g.name}
              sub={g.phone ? <span className="num">{g.phone}</span> : undefined}
              right={
                g.balance > 0 ? (
                  <span className="num font-semibold text-owed">{formatBirr(g.balance, locale)}</span>
                ) : undefined
              }
            />
          ))}
        </ListSheet>
      )}
    </div>
  );
}
