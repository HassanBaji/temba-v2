"use client";

import { ArrowRight, Plus, Search, type LucideIcon } from "lucide-react";
import Link from "next/link";

import { SportGlyph } from "~/components/temba/sport-glyph";
import { Hatch } from "~/components/ui/hatch";
import { Surface } from "~/components/ui/surface";
import type { HomeNoGamesCreateAction } from "@repo/domain/home-no-games";
import type { OpenWeekRow } from "@repo/domain/home-open-week";
import type { Sport } from "@repo/domain/sport";
import { useLocale, useMessages } from "~/components/locale-provider";
import { useNow } from "~/hooks/use-now";
import { cn } from "~/lib/utils";

import { createHref, gameHref } from "./home-model";
import { SectionTitle } from "./section-title";
import { upNextRowView, type UpNextItem } from "./up-next-model";

const FOCUS_RING =
  "focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]";

export function UpNextHeading({ label }: { label: string }) {
  const m = useMessages();
  return <SectionTitle title={m.webAuth.home.upNext} meta={label} />;
}

function DayTime({ day, time }: { day: string; time: string }) {
  return (
    <span aria-hidden="true" className="w-[50px] shrink-0">
      <span className="text-eyebrow text-muted-foreground block truncate">
        {day}
      </span>
      <span className="font-expanded block truncate tabular-nums">{time}</span>
    </span>
  );
}

function TitleLines({
  title,
  detail,
  sport,
}: {
  title: string;
  detail: string | null;
  sport: Sport;
}) {
  return (
    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span dir="auto" className="truncate text-start font-semibold">
        {title}
      </span>
      {detail ? (
        <span className="text-eyebrow text-muted-foreground flex min-w-0 items-center gap-1.5">
          <SportGlyph sport={sport} className="size-3 shrink-0" />
          <span dir="auto" className="min-w-0 truncate">
            {detail}
          </span>
        </span>
      ) : null}
    </span>
  );
}

/** The games after the card, then All games as the list's last row. */
export function UpNextList({ items }: { items: readonly UpNextItem[] }) {
  const m = useMessages();
  const locale = useLocale();
  const now = useNow();
  return (
    <Surface
      radius="card"
      className="border-rule divide-rule divide-y overflow-hidden border"
    >
      {items.map((item) => {
        const row = upNextRowView(item, now, locale);
        const trailing =
          row.trailing && row.trailing.kind !== "bars"
            ? row.trailing.label
            : null;
        return (
          <Link
            key={row.key}
            href={gameHref({ kind: "game", gameId: item.game.id })}
            aria-label={row.spoken}
            className={cn(
              "hover:bg-wash flex min-h-14 items-center gap-3 px-4 py-3 transition-colors",
              FOCUS_RING,
              "focus-visible:ring-inset",
            )}
          >
            <DayTime day={row.day} time={row.time} />
            <TitleLines
              title={row.title}
              detail={row.detail}
              sport={row.sport}
            />
            {trailing ? (
              <span
                aria-hidden="true"
                className="text-eyebrow text-muted-foreground shrink-0 tabular-nums"
              >
                {trailing}
              </span>
            ) : null}
          </Link>
        );
      })}
      <Link
        href="/dashboard/games"
        className={cn(
          "hover:bg-wash flex min-h-12 items-center justify-between px-4 font-semibold transition-colors",
          FOCUS_RING,
          "focus-visible:ring-inset",
        )}
      >
        {m.home.upNextCard.allGames}
        <ArrowRight aria-hidden="true" className="size-4 rtl:-scale-x-100" />
      </Link>
    </Surface>
  );
}

function OutlineTile({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "border-rule bg-paper hover:bg-wash flex h-12 flex-1 items-center justify-center gap-2 rounded-lg border font-semibold transition-colors",
        FOCUS_RING,
      )}
    >
      <Icon aria-hidden="true" className="size-4" />
      {label}
    </Link>
  );
}

function OpenGameRow({ row }: { row: OpenWeekRow }) {
  const m = useMessages();
  const href = gameHref({ kind: "game", gameId: row.gameId });
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <Link
        href={href}
        aria-label={m.home.comingUp.parts(
          [row.title, row.day, row.time, row.detail ?? ""].filter(Boolean),
        )}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-3 rounded-md",
          FOCUS_RING,
        )}
      >
        <DayTime day={row.day} time={row.time} />
        <TitleLines title={row.title} detail={row.detail} sport={row.sport} />
      </Link>
      <Link
        href={href}
        aria-label={m.home.upNextCard.joinSpoken(row.title)}
        className={cn(
          "bg-ink text-paper text-meta flex h-9 shrink-0 items-center rounded-md px-3.5 font-semibold transition-opacity hover:opacity-85",
          FOCUS_RING,
        )}
      >
        {m.home.upNextCard.join}
      </Link>
    </li>
  );
}

/** Nothing booked this week: open seats in the User's Groups, then find or create. */
export function UpNextEmpty({
  openGames,
  createAction,
}: {
  openGames: readonly OpenWeekRow[];
  createAction: HomeNoGamesCreateAction;
}) {
  const m = useMessages();
  return (
    <Surface
      radius="surface"
      className="border-rule divide-rule divide-y overflow-hidden border"
    >
      <div className="relative flex flex-col gap-2.5 px-[18px] pb-[18px] pt-[22px]">
        <Hatch className="absolute inset-0 shadow-none" />
        <h3 className="font-expanded text-h1-lg relative whitespace-pre-line">
          {m.webAuth.home.empty.headline}
        </h3>
        <p className="text-meta text-muted-foreground relative">
          {openGames.length > 0
            ? m.home.upNextCard.openWeekBody(openGames.length)
            : m.webAuth.home.empty.description}
        </p>
      </div>
      {openGames.length > 0 ? (
        <ul className="divide-rule divide-y">
          {openGames.map((row) => (
            <OpenGameRow key={row.key} row={row} />
          ))}
        </ul>
      ) : null}
      <div className="flex gap-2 p-4">
        <OutlineTile
          href="/dashboard/games"
          label={m.webAuth.home.empty.findAGame}
          icon={Search}
        />
        <OutlineTile
          href={createHref(createAction)}
          label={createAction.label}
          icon={Plus}
        />
      </div>
    </Surface>
  );
}
