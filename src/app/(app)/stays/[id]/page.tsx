import Link from "next/link";
import { notFound } from "next/navigation";
import { randomUUID } from "node:crypto";
import { getLocale, getTranslations } from "next-intl/server";
import {
  addChargeAction,
  cancelStayAction,
  checkInAction,
  checkOutAction,
  payStayAction,
  reverseChargeAction,
} from "@/actions/stays";
import { ActionForm } from "@/components/hotel/action-form";
import { SelectField } from "@/components/hotel/fields";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Locale } from "@/i18n/config";
import { formatEthiopianDate } from "@/lib/ethiopian-date";
import { formatBirr } from "@/lib/money";
import { addisToday } from "@/lib/room-board";
import { cn } from "@/lib/utils";
import { getStay } from "@/server/dal/hotel";
import { getSession } from "@/server/dal/session";
import { uuidParam } from "@/server/validation";

const METHODS = ["cash", "telebirr", "cbe_birr", "bank", "other"] as const;
const ID_TYPES = ["kebele", "national", "passport", "driving", "other"] as const;
const KINDS = ["food", "drink", "laundry", "other"] as const;

export default async function StayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuidParam.safeParse(id).success) notFound();
  const [stay, { profile }, t, locale] = await Promise.all([
    getStay(id),
    getSession(),
    getTranslations("stay"),
    getLocale() as Promise<Locale>,
  ]);
  if (!stay) notFound();

  const birr = (n: number) => formatBirr(n, locale);
  const today = addisToday();
  const canManage = profile.role !== "staff";
  const { totals } = stay;
  const methods = METHODS.map((m) => ({ value: m, label: t(`methods.${m}`) }));

  return (
    <div className="grid max-w-xl gap-4">
      <header className="grid gap-1">
        <p className="text-sm text-muted-foreground">
          {t("roomLine", { number: stay.roomNumber, type: stay.roomTypeName })}
        </p>
        <h1 className="text-2xl font-semibold">{stay.guestName}</h1>
        <p className="num">
          {formatEthiopianDate(stay.checkIn, locale)} → {formatEthiopianDate(stay.checkOut, locale)}
        </p>
        <p className="font-medium">{t(`statuses.${stay.status}`)}</p>
        {stay.guestPhone ? (
          <a href={`tel:${stay.guestPhone}`} className="num w-fit text-primary underline underline-offset-4">
            {stay.guestPhone}
          </a>
        ) : null}
      </header>

      <Card>
        <CardContent className="grid gap-2 p-4">
          <dl className="num grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
            <dt>{t("nightsLine", { nights: totals.nights, rate: birr(stay.nightlyRate) })}</dt>
            <dd className="text-right">{birr(totals.room)}</dd>
            <dt>{t("charges")}</dt>
            <dd className="text-right">{birr(totals.charges)}</dd>
            <dt>{t("paid")}</dt>
            <dd className="text-right">{birr(totals.paid)}</dd>
            <dt className="font-semibold">{t("balance")}</dt>
            <dd className={totals.balance > 0 ? "text-right text-xl font-semibold text-destructive" : "text-right text-xl font-semibold"}>
              {birr(totals.balance)}
            </dd>
          </dl>
        </CardContent>
      </Card>

      {stay.status === "in_house" || stay.status === "checked_out" ? (
        <Link href={`/stays/${stay.id}/receipt`} prefetch={false} className={cn(buttonVariants({ variant: "outline" }), "bg-card")}>
          {t("printReceipt")}
        </Link>
      ) : null}

      {stay.status === "reserved" && stay.checkIn <= today ? (
        <section className="grid gap-2" aria-labelledby="checkin">
          <h2 id="checkin" className="text-lg font-semibold">{t("checkInTitle")}</h2>
          <ActionForm action={checkInAction} submitLabel={t("checkInAction")}>
            <input type="hidden" name="stay" value={stay.id} />
            <SelectField name="idType" label={t("idType")} defaultValue="kebele" options={ID_TYPES.map((v) => ({ value: v, label: t(`idTypes.${v}`) }))} />
            <div className="grid gap-2">
              <Label htmlFor="idNumber">{t("idNumber")}</Label>
              <Input id="idNumber" name="idNumber" autoComplete="off" required minLength={2} maxLength={40} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nationality">{t("nationality")}</Label>
              <Input id="nationality" name="nationality" autoComplete="off" maxLength={60} />
            </div>
          </ActionForm>
        </section>
      ) : null}

      {stay.status === "in_house" ? (
        <section className="grid gap-2" aria-labelledby="checkout">
          <h2 id="checkout" className="text-lg font-semibold">{t("checkOutTitle")}</h2>
          <ActionForm action={checkOutAction} submitLabel={t("checkOutAction")}>
            <input type="hidden" name="stay" value={stay.id} />
            <div className="grid gap-2">
              <Label htmlFor="coAmount">{t("amountNow")}</Label>
              <Input id="coAmount" name="amount" inputMode="decimal" defaultValue={Math.max(totals.balance, 0)} required />
            </div>
            <SelectField name="method" label={t("method")} defaultValue="cash" options={methods} />
            <input type="hidden" name="reference" value="" />
            {canManage ? (
              <label className="flex min-h-12 items-center gap-3">
                <input type="checkbox" name="leaveBalance" className="size-5 accent-[var(--night)]" />
                <span>{t("leaveBalance")}</span>
              </label>
            ) : null}
          </ActionForm>
        </section>
      ) : null}

      {stay.status === "in_house" || stay.status === "reserved" ? (
        <section className="grid gap-2" aria-labelledby="pay">
          <h2 id="pay" className="text-lg font-semibold">{t("payTitle")}</h2>
          <ActionForm action={payStayAction} submitLabel={t("payAction")} doneLabel={t("payDone")} variant="outline">
            <input type="hidden" name="stay" value={stay.id} />
            <input type="hidden" name="clientRef" value={randomUUID()} />
            <input type="hidden" name="reference" value="" />
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="payAmount">{t("amount")}</Label>
                <Input id="payAmount" name="amount" inputMode="decimal" required />
              </div>
              <SelectField name="method" label={t("method")} defaultValue="cash" options={methods} />
            </div>
          </ActionForm>
        </section>
      ) : null}

      {stay.status === "in_house" ? (
        <section className="grid gap-2" aria-labelledby="charge">
          <h2 id="charge" className="text-lg font-semibold">{t("chargeTitle")}</h2>
          <ActionForm action={addChargeAction} submitLabel={t("chargeAction")} doneLabel={t("chargeDone")} variant="outline">
            <input type="hidden" name="stay" value={stay.id} />
            <input type="hidden" name="clientRef" value={randomUUID()} />
            <div className="grid grid-cols-2 gap-3">
              <SelectField name="kind" label={t("kind")} defaultValue="food" options={KINDS.map((k) => ({ value: k, label: t(`kinds.${k}`) }))} />
              <div className="grid gap-2">
                <Label htmlFor="chargeAmount">{t("amount")}</Label>
                <Input id="chargeAmount" name="amount" inputMode="decimal" required />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">{t("description")}</Label>
              <Input id="description" name="description" autoComplete="off" maxLength={200} />
            </div>
          </ActionForm>
        </section>
      ) : null}

      {stay.charges.length > 0 ? (
        <section className="grid gap-2" aria-labelledby="charges">
          <h2 id="charges" className="text-lg font-semibold">{t("charges")}</h2>
          <ul className="divide-y rounded-md border bg-card">
            {stay.charges.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <div className="font-medium">{t(`kinds.${c.kind}`)}</div>
                  {c.description ? <div className="truncate text-sm text-muted-foreground">{c.description}</div> : null}
                </div>
                <div className="flex items-center gap-2">
                  <span className="num">{birr(c.amount)}</span>
                  {canManage && c.reversible && stay.status === "in_house" ? (
                    <form action={reverseChargeAction.bind(null, stay.id, c.id)}>
                      <Button type="submit" variant="ghost" size="sm" className="h-12 text-destructive">
                        {t("reverse")}
                      </Button>
                    </form>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {stay.status === "reserved" ? (
        <section className="grid gap-2" aria-labelledby="cancel">
          <h2 id="cancel" className="text-lg font-semibold">{t("cancelTitle")}</h2>
          <ActionForm action={cancelStayAction} submitLabel={t("cancelAction")} variant="destructive">
            <input type="hidden" name="stay" value={stay.id} />
            <label className="flex min-h-12 items-center gap-3">
              <input type="checkbox" name="noShow" className="size-5 accent-[var(--night)]" />
              <span>{t("noShow")}</span>
            </label>
          </ActionForm>
        </section>
      ) : null}
    </div>
  );
}
