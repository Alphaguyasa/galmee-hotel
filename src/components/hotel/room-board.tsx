import Link from "next/link";
import { Brush, CalendarClock, DoorOpen, Wrench } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/config";
import { toEthiopian, parseGregorian, formatEthiopianDate } from "@/lib/ethiopian-date";
import { cn } from "@/lib/utils";
import { placeStays, type BoardBar } from "@/lib/room-board";
import type { BoardRoomDTO, BoardStayDTO } from "@/server/dal/hotel";

export const BOARD_DAYS = 14;

// Literal class names so Tailwind generates them; the CSP blocks inline styles.
const COL_START = ["col-start-2","col-start-3","col-start-4","col-start-5","col-start-6","col-start-7","col-start-8","col-start-9","col-start-10","col-start-11","col-start-12","col-start-13","col-start-14","col-start-15"];
const COL_SPAN = ["col-span-1","col-span-2","col-span-3","col-span-4","col-span-5","col-span-6","col-span-7","col-span-8","col-span-9","col-span-10","col-span-11","col-span-12","col-span-13","col-span-14"];
const GRID = "grid grid-cols-[4.25rem_repeat(14,3.5rem)] lg:grid-cols-[5rem_repeat(14,minmax(0,1fr))]";

const pickLocale = (locale: Locale) => (locale === "om" ? "om-ET" : locale === "am" ? "am-ET" : "en-GB");

function dayHeader(day: string, locale: Locale) {
  const weekday = new Intl.DateTimeFormat(pickLocale(locale), { weekday: "short", timeZone: "UTC" }).format(new Date(`${day}T00:00:00Z`));
  return { weekday, ethDay: toEthiopian(parseGregorian(day)).day };
}

function StayBar({
  bar,
  today,
  label,
}: {
  bar: BoardBar<BoardStayDTO>;
  today: string;
  label: string;
}) {
  const { stay, column, span, startsBeforeWindow, endsAfterWindow } = bar;
  const dueOut = stay.status === "in_house" && stay.checkOut <= today;
  return (
    <Link
      href={`/stays/${stay.id}`}
      aria-label={label}
      className={cn(
        COL_START[column - 1],
        COL_SPAN[span - 1],
        "relative z-10 row-start-1 my-1.5 flex min-w-0 items-center gap-1 overflow-hidden px-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
        !startsBeforeWindow && "ml-1 rounded-l-md",
        !endsAfterWindow && "mr-1 rounded-r-md",
        stay.status === "in_house" && "bg-primary text-primary-foreground",
        stay.status === "reserved" && "bg-[#f4ead6] text-foreground",
        stay.status === "checked_out" && "bg-muted text-muted-foreground",
      )}
    >
      {stay.status === "reserved" ? <span className="board-hatch h-full w-1.5 shrink-0" aria-hidden /> : null}
      {stay.status === "reserved" && span > 1 ? <CalendarClock className="size-3.5 shrink-0" aria-hidden /> : null}
      {dueOut ? <DoorOpen className="size-3.5 shrink-0" aria-hidden /> : null}
      <span className="truncate">{stay.guestName}</span>
    </Link>
  );
}

export async function RoomBoard({
  rooms,
  stays,
  days,
  today,
  locale,
}: {
  rooms: BoardRoomDTO[];
  stays: BoardStayDTO[];
  days: string[];
  today: string;
  locale: Locale;
}) {
  const t = await getTranslations("board");
  const placed = placeStays(stays, days[0], days.length);

  return (
    <div className="overflow-x-auto rounded-md border bg-card" role="region" aria-label={t("title")} tabIndex={0}>
      <div className="min-w-max lg:min-w-0">
        <div className={cn(GRID, "sticky top-0 z-20 border-b bg-card")}>
          <div className="sticky left-0 z-30 border-r bg-card px-2 py-1.5 text-xs text-muted-foreground">{t("room")}</div>
          {days.map((day) => {
            const { weekday, ethDay } = dayHeader(day, locale);
            const isToday = day === today;
            return (
              <div
                key={day}
                aria-current={isToday ? "date" : undefined}
                className={cn("num border-r px-1 py-1 text-center text-xs last:border-r-0", isToday && "bg-accent font-semibold")}
              >
                <div className="truncate text-muted-foreground">{weekday}</div>
                <div className="text-sm">{ethDay}</div>
              </div>
            );
          })}
        </div>

        {rooms.map((room) => {
          const bars = placed.get(room.id) ?? [];
          const taken = new Set(bars.flatMap((b) => Array.from({ length: b.span }, (_, i) => b.column + i)));
          return (
            <div key={room.id} className={cn(GRID, "border-b last:border-b-0")}>
              <div className="sticky left-0 z-20 row-start-1 flex h-12 items-center gap-1.5 border-r bg-card px-2">
                <span className="size-2 shrink-0 rounded-full border-2 border-warning" aria-hidden />
                <span className="num font-semibold">{room.number}</span>
                {room.dirty ? (
                  <Brush className="size-3.5 text-muted-foreground" role="img" aria-label={t("needsCleaning")} />
                ) : null}
              </div>

              {room.inService ? (
                days.map((day, i) => {
                  const column = i + 1;
                  const cellClass = cn(
                    COL_START[i],
                    "row-start-1 h-12 border-r last:border-r-0",
                    day === today && "bg-accent/60",
                  );
                  if (taken.has(column) || day < today) return <div key={day} className={cellClass} />;
                  return (
                    <Link
                      key={day}
                      href={`/stays/new?room=${room.id}&in=${day}`}
                      prefetch={false}
                      aria-label={t("newStayOn", { room: room.number, date: formatEthiopianDate(day, locale) })}
                      className={cn(cellClass, "hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring")}
                    />
                  );
                })
              ) : (
                <div className="board-stripes col-span-14 col-start-2 row-start-1 flex h-12 items-center gap-2 px-3 text-sm font-medium">
                  <Wrench className="size-4" aria-hidden />
                  {t("outOfService")}
                </div>
              )}

              {bars.map((bar) => (
                <StayBar
                  key={bar.stay.id}
                  bar={bar}
                  today={today}
                  label={t("stayLabel", {
                    guest: bar.stay.guestName,
                    room: room.number,
                    status: t(`status.${bar.stay.status}`),
                  })}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
