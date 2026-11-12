import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { BedDouble, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { loadDemoDataAction, markRoomCleanAction } from "@/actions/stays";
import { EmptyState } from "@/components/galmee/empty-state";
import { MoneySummaryCard } from "@/components/galmee/money-summary-card";
import { ActionForm } from "@/components/hotel/action-form";
import { BOARD_DAYS, RoomBoard } from "@/components/hotel/room-board";
import { Button, buttonVariants } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import { formatEthiopianDate } from "@/lib/ethiopian-date";
import { addDays, addisToday, boardSummary, dayRange } from "@/lib/room-board";
import { cn } from "@/lib/utils";
import { listBoardStays, listRooms } from "@/server/dal/hotel";
import { getSession } from "@/server/dal/session";
import { dayParam } from "@/server/validation";

const DEMO_TENANT = "Galmee Hotel Demo";

export default async function BoardPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from: fromParam } = await searchParams;
  const today = addisToday();
  const from = dayParam.safeParse(fromParam).success ? fromParam! : today;

  const [{ profile, tenant }, rooms, stays, t, locale] = await Promise.all([
    getSession(),
    listRooms(),
    listBoardStays(from, BOARD_DAYS, today),
    getTranslations("board"),
    getLocale() as Promise<Locale>,
  ]);

  if (rooms.length === 0) {
    return (
      <div className="grid max-w-md gap-3">
        <h1 className="text-[1.5625rem] leading-tight font-bold">{t("title")}</h1>
        <EmptyState
          icon={BedDouble}
          message={t("emptyBody")}
          action={
            profile.role !== "staff" ? (
              <Link href="/settings" className={buttonVariants({ size: "lg" })}>
                {t("setupRooms")}
              </Link>
            ) : undefined
          }
        />
        {tenant.name === DEMO_TENANT && profile.role === "owner" ? (
          <ActionForm action={loadDemoDataAction} submitLabel={t("loadDemo")} />
        ) : null}
      </div>
    );
  }

  const inService = rooms.filter((r) => r.inService).length;
  const summary = boardSummary(stays, today, inService);
  const stats = [
    { label: t("inHouse"), value: summary.inHouse },
    { label: t("arrivals"), value: summary.arrivals },
    { label: t("dueOut"), value: summary.dueOut },
  ];
  const windowed = stays.filter((s) => s.checkIn < addDays(from, BOARD_DAYS) && s.checkOut > from);
  const dirtyRooms = rooms.filter((r) => r.dirty && r.inService);
  const navClass = cn(buttonVariants({ variant: "outline", size: "icon" }), "bg-card");

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="num text-[1.5625rem] leading-tight font-bold">{formatEthiopianDate(from, locale)}</h1>
        <div className="flex items-center gap-2">
          <Link href={`/?from=${addDays(from, -7)}`} className={navClass} aria-label={t("previous")}>
            <ChevronLeft aria-hidden />
          </Link>
          <Link href="/" className={cn(buttonVariants({ variant: "outline" }), "bg-card")}>
            {t("today")}
          </Link>
          <Link href={`/?from=${addDays(from, 7)}`} className={navClass} aria-label={t("next")}>
            <ChevronRight aria-hidden />
          </Link>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-[minmax(0,14rem)_1fr]">
        <MoneySummaryCard label={t("freeTonight")} figure={String(summary.freeTonight)} sub={t("ofRooms", { count: inService })} />
        <dl className="grid grid-cols-3 divide-x rounded-md border bg-card">
          {stats.map((s) => (
            <div key={s.label} className="grid content-center gap-0.5 p-3">
              <dt className="text-sm leading-tight text-muted-foreground">{s.label}</dt>
              <dd className="num text-[1.5625rem] leading-tight font-bold">{s.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <RoomBoard rooms={rooms} stays={windowed} days={dayRange(from, BOARD_DAYS)} today={today} locale={locale} />

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <li>{t("legendInHouse")}</li>
        <li>{t("legendReserved")}</li>
        <li>{t("legendCheckedOut")}</li>
      </ul>

      {dirtyRooms.length > 0 ? (
        <section className="grid gap-2" aria-labelledby="cleaning">
          <h2 id="cleaning" className="font-semibold">{t("cleaningTitle")}</h2>
          <ul className="flex flex-wrap gap-2">
            {dirtyRooms.map((room) => (
              <li key={room.id}>
                <form action={markRoomCleanAction.bind(null, room.id)}>
                  <Button type="submit" variant="outline" className="bg-card">
                    {t("markClean", { room: room.number })}
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Link
        href="/stays/new"
        prefetch={false}
        className={cn(buttonVariants({ size: "lg" }), "fixed right-4 bottom-20 z-30 md:static md:justify-self-start")}
      >
        <Plus aria-hidden />
        {t("newStay")}
      </Link>
    </div>
  );
}
