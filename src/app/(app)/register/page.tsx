import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { RegisterPrintButton } from "@/components/hotel/register-print-button";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Locale } from "@/i18n/config";
import { formatEthiopianDate } from "@/lib/ethiopian-date";
import { addDays, addisToday } from "@/lib/room-board";
import { cn } from "@/lib/utils";
import { getRegisterRows } from "@/server/dal/hotel";
import { getSession } from "@/server/dal/session";
import { registerDaySchema } from "@/server/validation";

const DASH = "—";

/** The police guest register for one night, printed on A4 landscape. */
export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date } = await searchParams;
  const today = addisToday();
  const parsed = registerDaySchema.safeParse(date);
  const day = parsed.success && parsed.data <= today ? parsed.data : today;

  const [rows, { tenant }, t, tStay, tErr, locale] = await Promise.all([
    getRegisterRows(day),
    getSession(),
    getTranslations("register"),
    getTranslations("stay"),
    getTranslations("errors"),
    getLocale() as Promise<Locale>,
  ]);

  const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
  const gregorian = (d: string) => dateFmt.format(new Date(`${d}T00:00:00Z`));
  const timeFmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Addis_Ababa" });
  const addisDay = (iso: string) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Addis_Ababa" }).format(new Date(iso));
  const shortEth = (d: string) => formatEthiopianDate(d, locale, { withEra: false });
  const idLabel = (type: string | null, number: string | null) =>
    number ? `${type ? tStay(`idTypes.${type}`) : ""} ${number}`.trim() : DASH;

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 print:hidden">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("hint")}</p>
        <form className="flex flex-wrap items-end gap-2" action="/register">
          <div className="grid gap-2">
            <Label htmlFor="date">{t("night")}</Label>
            <Input id="date" name="date" type="date" defaultValue={day} max={today} className="w-44" />
          </div>
          <Button type="submit" variant="outline" className="bg-card">
            {t("show")}
          </Button>
        </form>
        <nav className="flex gap-2" aria-label={t("night")}>
          <Link href={`/register?date=${addDays(day, -1)}`} prefetch={false} className={cn(buttonVariants({ variant: "outline" }), "bg-card")}>
            {t("previous")}
          </Link>
          {day < today ? (
            <Link href={`/register?date=${addDays(day, 1)}`} prefetch={false} className={cn(buttonVariants({ variant: "outline" }), "bg-card")}>
              {t("next")}
            </Link>
          ) : null}
        </nav>
        <RegisterPrintButton day={day} label={t("print")} errorLabel={tErr("generic")} />
      </div>

      <section className="register-a4 grid gap-3 rounded-lg border border-border bg-card p-4 print:rounded-none print:border-0 print:p-0" aria-labelledby="register-title">
        <header className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="font-semibold">{tenant.name}</p>
            <h2 id="register-title" className="text-lg font-semibold">
              {t("printTitle")}
            </h2>
          </div>
          <p className="text-sm">
            {t("nightOf")}: <span className="font-medium">{formatEthiopianDate(day, locale)}</span> ({gregorian(day)})
          </p>
        </header>
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full min-w-[56rem] border-collapse text-sm print:min-w-0 print:text-[9pt]">
            <thead>
              <tr className="border-b-2 border-foreground text-left align-bottom">
                <th scope="col" className="p-1.5">#</th>
                <th scope="col" className="p-1.5">{t("room")}</th>
                <th scope="col" className="p-1.5">{t("guest")}</th>
                <th scope="col" className="p-1.5">{t("nationality")}</th>
                <th scope="col" className="p-1.5">{t("idDocument")}</th>
                <th scope="col" className="p-1.5">{t("comingFrom")}</th>
                <th scope="col" className="p-1.5">{t("goingTo")}</th>
                <th scope="col" className="p-1.5">{t("purpose")}</th>
                <th scope="col" className="p-1.5">{t("checkedIn")}</th>
                <th scope="col" className="p-1.5">{t("departure")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-3 text-center text-muted-foreground">
                    {t("empty")}
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={r.stayId} className="border-b border-border align-top break-inside-avoid">
                    <td className="p-1.5 tabular-nums">{i + 1}</td>
                    <td className="p-1.5 font-medium">{r.room}</td>
                    <td className="p-1.5">
                      <Link href={`/stays/${r.stayId}`} prefetch={false} className="underline-offset-2 hover:underline print:no-underline">
                        {r.guest}
                      </Link>
                    </td>
                    <td className="p-1.5">{r.nationality ?? DASH}</td>
                    <td className="p-1.5">{idLabel(r.idType, r.idNumber)}</td>
                    <td className="p-1.5">{r.comingFrom ?? DASH}</td>
                    <td className="p-1.5">{r.goingTo ?? DASH}</td>
                    <td className="p-1.5">{r.purpose ?? DASH}</td>
                    <td className="p-1.5 tabular-nums whitespace-nowrap">
                      {shortEth(addisDay(r.checkedInAt))} {timeFmt.format(new Date(r.checkedInAt))}
                    </td>
                    <td className="p-1.5 tabular-nums whitespace-nowrap">{shortEth(r.expectedDeparture)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <footer className="mt-6 flex flex-wrap justify-between gap-6 text-sm">
          <p>{t("total", { count: rows.length })}</p>
          <p className="min-w-60">
            {t("signature")}: <span className="inline-block w-40 border-b border-foreground align-bottom" aria-hidden>&nbsp;</span>
          </p>
        </footer>
      </section>
    </div>
  );
}
