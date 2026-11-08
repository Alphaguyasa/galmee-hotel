import { getLocale, getTranslations } from "next-intl/server";
import { CalendarDays } from "lucide-react";
import type { Locale } from "@/i18n/config";
import { formatEthiopianDate } from "@/lib/ethiopian-date";
import { getSession } from "@/server/dal/session";

export default async function HomePage() {
  const [{ profile }, t, tCommon, locale] = await Promise.all([
    getSession(),
    getTranslations("home"),
    getTranslations("common"),
    getLocale() as Promise<Locale>,
  ]);

  return (
    <div className="grid gap-1">
      <h1 className="text-2xl font-semibold">{t("welcome", { name: profile.fullName })}</h1>
      <p className="flex items-center gap-2 text-muted-foreground">
        <CalendarDays className="size-4" aria-hidden />
        <span className="num">
          {tCommon("today")}: {formatEthiopianDate(new Date(), locale)}
        </span>
      </p>
    </div>
  );
}
