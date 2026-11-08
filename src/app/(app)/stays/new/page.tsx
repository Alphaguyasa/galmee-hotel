import { getLocale, getTranslations } from "next-intl/server";
import { randomUUID } from "node:crypto";
import { createStayAction } from "@/actions/stays";
import { ActionForm } from "@/components/hotel/action-form";
import { DateField, SelectField } from "@/components/hotel/fields";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Locale } from "@/i18n/config";
import { formatBirr } from "@/lib/money";
import { addDays, addisToday } from "@/lib/room-board";
import { listRoomRates, listRooms } from "@/server/dal/hotel";
import { getSession } from "@/server/dal/session";
import { dayParam, uuidParam } from "@/server/validation";

export default async function NewStayPage({ searchParams }: { searchParams: Promise<{ room?: string; in?: string }> }) {
  const params = await searchParams;
  const today = addisToday();
  const checkIn = dayParam.safeParse(params.in).success && params.in! >= today ? params.in! : today;
  const [{ profile }, rooms, rates, t, locale] = await Promise.all([
    getSession(),
    listRooms(),
    listRoomRates(),
    getTranslations("stay"),
    getLocale() as Promise<Locale>,
  ]);
  const rateByRoom = new Map(rates.map((r) => [r.roomId, r.rate]));
  const preferred = uuidParam.safeParse(params.room).success ? params.room : undefined;
  const canOverride = profile.role !== "staff";
  const options = rooms
    .filter((r) => r.inService)
    .map((r) => {
      const rate = rateByRoom.get(r.id);
      return { value: r.id, label: `${r.number} · ${r.typeName}${rate != null ? ` · ${formatBirr(rate, locale)}` : ""}` };
    });

  return (
    <div className="grid max-w-md gap-4">
      <h1 className="text-2xl font-semibold">{t("newTitle")}</h1>
      <ActionForm action={createStayAction} submitLabel={t("save")}>
        <input type="hidden" name="clientRef" value={randomUUID()} />
        <SelectField name="room" label={t("room")} defaultValue={preferred} options={options} />
        <div className="grid gap-2">
          <Label htmlFor="guestName">{t("guestName")}</Label>
          <Input id="guestName" name="guestName" autoComplete="off" required minLength={2} maxLength={120} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="guestPhone">{t("guestPhone")}</Label>
          <Input id="guestPhone" name="guestPhone" type="tel" inputMode="tel" autoComplete="off" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <DateField name="checkIn" label={t("checkIn")} defaultValue={checkIn} min={today} />
          <DateField name="checkOut" label={t("checkOut")} defaultValue={addDays(checkIn, 1)} min={today} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label htmlFor="adults">{t("adults")}</Label>
            <Input id="adults" name="adults" type="number" inputMode="numeric" min={1} max={20} defaultValue={1} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="children">{t("children")}</Label>
            <Input id="children" name="children" type="number" inputMode="numeric" min={0} max={20} defaultValue={0} required />
          </div>
        </div>
        <SelectField
          name="source"
          label={t("source")}
          defaultValue="walk_in"
          options={(["walk_in", "phone", "website", "other"] as const).map((s) => ({ value: s, label: t(`sources.${s}`) }))}
        />
        {canOverride ? (
          <div className="grid gap-2">
            <Label htmlFor="nightlyRate">{t("rateOverride")}</Label>
            <Input id="nightlyRate" name="nightlyRate" inputMode="decimal" />
          </div>
        ) : (
          <input type="hidden" name="nightlyRate" value="" />
        )}
        <label className="flex min-h-12 items-center gap-3">
          <input type="checkbox" name="checkInNow" className="size-5 accent-[var(--night)]" />
          <span>{t("checkInNow")}</span>
        </label>
      </ActionForm>
    </div>
  );
}
