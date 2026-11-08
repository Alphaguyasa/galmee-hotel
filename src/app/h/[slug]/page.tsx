import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { MapPin, Phone } from "lucide-react";
import { requestBookingAction } from "@/actions/public-site";
import { ActionForm } from "@/components/hotel/action-form";
import { DateField, SelectField } from "@/components/hotel/fields";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Locale } from "@/i18n/config";
import { formatBirr } from "@/lib/money";
import { addDays, addisToday } from "@/lib/room-board";
import { getPublicSite } from "@/server/dal/public-site";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const site = await getPublicSite((await params).slug);
  return site ? { title: site.name, description: site.headline ?? undefined } : {};
}

export default async function PublicHotelPage({ params }: Props) {
  const [site, t, locale] = await Promise.all([
    getPublicSite((await params).slug),
    getTranslations("site"),
    getLocale() as Promise<Locale>,
  ]);
  if (!site) notFound();
  const today = addisToday();

  return (
    <div className="min-h-dvh">
      <header className="bg-primary text-primary-foreground">
        <div className="mx-auto grid max-w-3xl gap-3 px-4 py-5">
          <div className="flex justify-end">
            <LanguageSwitcher inverse />
          </div>
          <h1 className="text-3xl font-semibold">{site.name}</h1>
          {site.headline ? <p className="text-lg">{site.headline}</p> : null}
        </div>
      </header>
      <main className="mx-auto grid max-w-3xl gap-6 px-4 py-6">
        {site.about ? <p>{site.about}</p> : null}
        {site.roomTypes.length > 0 ? (
          <section className="grid gap-2" aria-labelledby="rooms">
            <h2 id="rooms" className="text-xl font-semibold">{t("rooms")}</h2>
            <ul className="divide-y rounded-md border bg-card">
              {site.roomTypes.map((type) => (
                <li key={type.id} className="flex items-start justify-between gap-3 p-3">
                  <div>
                    <div className="font-medium">{type.name}</div>
                    {type.description ? <div className="text-sm text-muted-foreground">{type.description}</div> : null}
                    <div className="text-sm text-muted-foreground">{t("sleeps", { count: type.capacity })}</div>
                  </div>
                  {type.rate != null ? (
                    <div className="num shrink-0 text-right font-semibold">
                      {formatBirr(type.rate, locale)}
                      <div className="text-xs font-normal text-muted-foreground">{t("perNight")}</div>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="grid gap-3" aria-labelledby="book">
          <h2 id="book" className="text-xl font-semibold">{t("requestTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("requestIntro")}</p>
          <ActionForm action={requestBookingAction} submitLabel={t("send")} doneLabel={t("sent")}>
            <input type="hidden" name="slug" value={site.slug} />
            {/* Hidden from people; bots that fill it are ignored. */}
            <div className="hidden" aria-hidden>
              <label htmlFor="website">Website</label>
              <input id="website" name="website" tabIndex={-1} autoComplete="off" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="guestName">{t("name")}</Label>
              <Input id="guestName" name="guestName" autoComplete="name" required minLength={2} maxLength={120} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">{t("phone")}</Label>
              <Input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <DateField name="checkIn" label={t("checkIn")} defaultValue={today} min={today} />
              <DateField name="checkOut" label={t("checkOut")} defaultValue={addDays(today, 1)} min={today} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <SelectField
                name="roomType"
                label={t("roomType")}
                defaultValue=""
                options={[{ value: "", label: t("anyRoom") }, ...site.roomTypes.map((type) => ({ value: type.id, label: type.name }))]}
              />
              <div className="grid gap-2">
                <Label htmlFor="adults">{t("guests")}</Label>
                <Input id="adults" name="adults" type="number" inputMode="numeric" min={1} max={20} defaultValue={1} required />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="message">{t("message")}</Label>
              <Input id="message" name="message" autoComplete="off" maxLength={500} />
            </div>
          </ActionForm>
        </section>

        {site.address || site.phone ? (
          <footer className="grid gap-1 border-t pt-4 text-sm">
            {site.address ? (
              <p className="flex items-center gap-2">
                <MapPin className="size-4" aria-hidden />
                {site.address}
              </p>
            ) : null}
            {site.phone ? (
              <a href={`tel:${site.phone}`} className="num flex w-fit items-center gap-2 text-primary underline underline-offset-4">
                <Phone className="size-4" aria-hidden />
                {site.phone}
              </a>
            ) : null}
          </footer>
        ) : null}
      </main>
    </div>
  );
}
