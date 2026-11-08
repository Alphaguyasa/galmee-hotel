import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { addRoomAction, addRoomTypeAction, setRateAction, setRoomServiceAction } from "@/actions/settings";
import { ActionForm } from "@/components/hotel/action-form";
import { SelectField } from "@/components/hotel/fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Locale } from "@/i18n/config";
import { formatBirr } from "@/lib/money";
import { listRooms, listRoomTypes } from "@/server/dal/hotel";
import { getSession } from "@/server/dal/session";

export default async function SettingsPage() {
  const { profile } = await getSession();
  if (profile.role === "staff") redirect("/");
  const [types, rooms, t, locale] = await Promise.all([
    listRoomTypes(),
    listRooms(),
    getTranslations("settings"),
    getLocale() as Promise<Locale>,
  ]);
  return (
    <div className="grid max-w-xl gap-6">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>

      <section className="grid gap-3" aria-labelledby="types">
        <h2 id="types" className="text-lg font-semibold">{t("roomTypes")}</h2>
        {types.length === 0 ? <p className="text-muted-foreground">{t("noTypes")}</p> : null}
        <ul className="grid gap-2">
          {types.map((type) => (
            <li key={type.id} className="grid gap-2 rounded-md border bg-card p-3">
              <div className="flex justify-between gap-2">
                <span className="font-medium">{type.name}</span>
                <span className="num text-sm text-muted-foreground">
                  {type.rate != null ? formatBirr(type.rate, locale) : t("noRate")}
                </span>
              </div>
              <ActionForm action={setRateAction} submitLabel={t("saveRate")} doneLabel={t("rateSaved")} variant="outline">
                <input type="hidden" name="roomType" value={type.id} />
                <div className="grid gap-2">
                  <Label htmlFor={`rate-${type.id}`}>{t("nightlyRate")}</Label>
                  <Input id={`rate-${type.id}`} name="rate" inputMode="decimal" defaultValue={type.rate ?? ""} required />
                </div>
              </ActionForm>
            </li>
          ))}
        </ul>
        <h3 className="font-semibold">{t("addType")}</h3>
        <ActionForm action={addRoomTypeAction} submitLabel={t("addTypeAction")}>
          <div className="grid gap-2">
            <Label htmlFor="typeName">{t("typeName")}</Label>
            <Input id="typeName" name="name" autoComplete="off" required maxLength={80} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="capacity">{t("capacity")}</Label>
              <Input id="capacity" name="capacity" type="number" inputMode="numeric" min={1} max={20} defaultValue={2} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="newRate">{t("nightlyRate")}</Label>
              <Input id="newRate" name="rate" inputMode="decimal" required />
            </div>
          </div>
        </ActionForm>
      </section>

      <section className="grid gap-3" aria-labelledby="rooms">
        <h2 id="rooms" className="text-lg font-semibold">{t("rooms")}</h2>
        {types.length === 0 ? (
          <p className="text-muted-foreground">{t("addTypeFirst")}</p>
        ) : (
          <ActionForm action={addRoomAction} submitLabel={t("addRoomAction")}>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="roomNumber">{t("roomNumber")}</Label>
                <Input id="roomNumber" name="number" autoComplete="off" required maxLength={12} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="floor">{t("floor")}</Label>
                <Input id="floor" name="floor" autoComplete="off" maxLength={20} />
              </div>
            </div>
            <SelectField name="roomType" label={t("roomType")} options={types.map((type) => ({ value: type.id, label: type.name }))} />
          </ActionForm>
        )}
        {rooms.length > 0 ? (
          <ul className="divide-y rounded-md border bg-card">
            {rooms.map((room) => (
              <li key={room.id} className="flex items-center justify-between gap-3 p-2 pl-3">
                <span>
                  <span className="num font-semibold">{room.number}</span>{" "}
                  <span className="text-sm text-muted-foreground">{room.typeName}</span>
                  {room.inService ? null : <span className="ml-2 text-sm text-destructive">{t("outOfService")}</span>}
                </span>
                <form action={setRoomServiceAction.bind(null, room.id, !room.inService)}>
                  <Button type="submit" variant="ghost" size="sm" className="h-12">
                    {room.inService ? t("takeOut") : t("putBack")}
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
