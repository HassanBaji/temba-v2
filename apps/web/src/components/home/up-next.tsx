"use client";

import {
  ArrowRight,
  MapPin,
  Plus,
  Search,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { SportGlyph } from "~/components/temba/sport-glyph";
import { Hatch } from "~/components/ui/hatch";
import { Surface } from "~/components/ui/surface";
import { formatGameClock } from "@repo/domain/format-game-start";
import { UNRATED_LABEL } from "@repo/domain/game-rating-impact";
import { formatHomeKickoff } from "@repo/domain/home-countdown";
import { homeComingUpRows } from "@repo/domain/home-coming-up";
import {
  homeNextGameActions,
  homeNextGameStatus,
} from "@repo/domain/home-next-game";
import type { HomeNoGamesCreateAction } from "@repo/domain/home-no-games";
import { homeNextGameSeats } from "@repo/domain/home-seats";
import { SPORT_LABELS, type Sport } from "@repo/domain/sport";
import { useNow } from "~/hooks/use-now";
import { cn } from "~/lib/utils";

import { createHref, gameHref } from "./home-model";
import {
  minutesBetween,
  startsInLabel,
  upNextHeroDay,
  upNextRowView,
  type UpNextItem,
  type UpNextRowView,
} from "./up-next-model";

const FOCUS_RING =
  "focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]";

export function UpNextHeading({ label }: { label: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="text-lead font-semibold">Up next</h2>
      <p className="text-eyebrow text-muted-foreground font-mono uppercase">
        {label}
      </p>
    </div>
  );
}

function Chip({ sport, kind }: { sport: Sport; kind: string }) {
  return (
    <span className="border-dimrule text-eyebrow rounded-xs inline-flex shrink-0 items-center gap-1.5 border py-[3px] pl-1.5 pr-2 font-mono uppercase">
      <SportGlyph sport={sport} className="text-paper size-[13px]" />
      <span>
        {SPORT_LABELS[sport]}
        <span className="text-dim">{` / ${kind}`}</span>
      </span>
    </span>
  );
}

function CardAction({
  href,
  label,
  icon: Icon,
  primary = false,
}: {
  href: string;
  label: string;
  icon?: LucideIcon;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "text-meta flex h-9 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border px-3 transition-opacity hover:opacity-85",
        FOCUS_RING,
        primary
          ? "border-paper bg-paper text-ink flex-1 font-semibold"
          : "border-dimrule text-paper",
      )}
    >
      {Icon ? <Icon aria-hidden="true" className="size-3.5" /> : null}
      {label}
    </Link>
  );
}

function HeroFrame({
  href,
  sport,
  kind,
  when,
  spoken,
  children,
  actions,
}: {
  href: string;
  sport: Sport;
  kind: string;
  when: { day: string; emphasis: string | null };
  spoken: string;
  children: React.ReactNode;
  actions: React.ReactNode;
}) {
  return (
    <Surface as="article" tone="ink" radius="surface" className="p-[18px]">
      <Link
        href={href}
        aria-label={spoken}
        className={cn("-m-1 flex flex-col gap-3.5 rounded-lg p-1", FOCUS_RING)}
      >
        <div className="flex items-center justify-between gap-3">
          <Chip sport={sport} kind={kind} />
          <p className="text-meta text-dim min-w-0 truncate">
            {when.day}
            {when.emphasis ? (
              <span className="text-paper">{`, ${when.emphasis}`}</span>
            ) : null}
          </p>
        </div>
        {children}
      </Link>
      <div className="border-dimrule mt-3.5 flex gap-1.5 border-t pt-3.5">
        {actions}
      </div>
    </Surface>
  );
}

function Kickoff({
  startsAt,
  endsAt,
}: {
  startsAt: Date;
  endsAt: Date | null;
}) {
  const kickoff = formatHomeKickoff(startsAt);
  return (
    <div className="flex flex-wrap items-baseline gap-x-2.5">
      <p className="flex items-baseline gap-[5px]">
        <span className="font-expanded text-[52px] tabular-nums leading-none">
          {kickoff.time}
        </span>
        {kickoff.meridiem ? (
          <span className="font-expanded text-[22px] leading-none">
            {kickoff.meridiem}
          </span>
        ) : null}
      </p>
      {endsAt ? (
        <p className="text-meta text-dim">
          {`to ${formatGameClock(endsAt)}`}
          <span className="text-dimrule">{" / "}</span>
          {`${minutesBetween(startsAt, endsAt)} min`}
        </p>
      ) : null}
    </div>
  );
}

function Headline({
  title,
  detail,
  icon: Icon,
}: {
  title: string;
  detail: string | null;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <p
        dir="auto"
        className="text-lead line-clamp-2 text-left font-semibold leading-snug"
      >
        {title}
      </p>
      {detail ? (
        <p className="text-meta text-dim flex min-w-0 items-center gap-1.5">
          {Icon ? (
            <Icon aria-hidden="true" className="size-3.5 shrink-0" />
          ) : null}
          <span dir="auto" className="min-w-0 truncate">
            {detail}
          </span>
        </p>
      ) : null}
    </div>
  );
}

export function UpNextHero({ item }: { item: UpNextItem }) {
  const now = useNow();
  const { game, startsAt, sport } = item;
  const endsAt = game.windowEnd ? new Date(game.windowEnd) : null;
  const day = upNextHeroDay(startsAt, now);
  const href = gameHref({ kind: "game", gameId: game.id });
  const [row] = homeComingUpRows([game]);

  if (row && row.kind !== "game") {
    const subline =
      row.kind === "tournament" ? row.teamsLine : row.opponentLine;
    const label =
      row.kind === "tournament" && row.actionLabel
        ? row.actionLabel
        : "View game";
    return (
      <HeroFrame
        href={href}
        sport={sport}
        kind="Tournament"
        when={{
          day,
          emphasis: row.kind === "tournament_match" ? row.roundTag : null,
        }}
        spoken={`Next up, ${row.title}, ${day} ${formatGameClock(startsAt)}`}
        actions={<CardAction primary href={href} label={label} />}
      >
        <Kickoff startsAt={startsAt} endsAt={null} />
        <Headline title={row.title} detail={subline} />
      </HeroFrame>
    );
  }

  const seats = homeNextGameSeats(
    game.sides,
    game.registeredUserCount,
    game.playersAllowed,
  );
  const { primary, details } = homeNextGameActions({
    gameId: game.id,
    phase: game.phase,
    hasOpenSeat: seats.some((seat) => !seat.filled),
  });
  const status =
    game.phase === "upcoming"
      ? (startsInLabel(startsAt, endsAt ?? startsAt, now) ??
        homeNextGameStatus(game.phase, startsAt, now))
      : homeNextGameStatus(game.phase, startsAt, now);
  const title = game.name ?? game.groupName ?? game.venue?.name ?? "Game";
  const place = [game.venue?.name, game.courtName].filter(Boolean).join(", ");
  const venueLine = [
    game.venue?.name === title ? null : game.venue?.name,
    game.courtName,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <HeroFrame
      href={href}
      sport={sport}
      kind="Game"
      when={{ day, emphasis: status }}
      spoken={`Next up, ${title}, ${day} ${formatGameClock(startsAt)}, ${place}`}
      actions={
        <>
          {details ? (
            <CardAction href={gameHref(details)} label="Details" />
          ) : null}
          <CardAction
            primary
            href={gameHref(primary.target)}
            label={primary.label}
            icon={primary.label === "Invite a player" ? UserPlus : undefined}
          />
        </>
      }
    >
      <Kickoff startsAt={startsAt} endsAt={endsAt} />
      <Headline title={title} detail={venueLine || null} icon={MapPin} />
      {game.rated ? null : (
        <p className="text-meta font-semibold">{UNRATED_LABEL}</p>
      )}
    </HeroFrame>
  );
}

function SeatBars({ bars }: { bars: readonly ("taken" | "open")[] }) {
  return (
    <span className="flex h-4 gap-[3px]">
      {bars.map((kind, index) =>
        kind === "taken" ? (
          <span key={index} className="bg-ink w-[7px] rounded-[2px]" />
        ) : (
          <Hatch key={index} className="w-[7px] rounded-[2px]" />
        ),
      )}
    </span>
  );
}

function Trailing({ row }: { row: UpNextRowView }) {
  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 flex-col items-end gap-[5px]"
    >
      <SportGlyph sport={row.sport} className="text-muted-foreground size-4" />
      {row.trailing?.kind === "bars" ? (
        <SeatBars bars={row.trailing.bars} />
      ) : row.trailing?.kind === "tag" ? (
        <span className="text-eyebrow font-mono uppercase">
          {row.trailing.label}
        </span>
      ) : row.trailing ? (
        <span className="text-eyebrow text-muted-foreground tabular-nums">
          {row.trailing.label}
        </span>
      ) : null}
    </span>
  );
}

export function UpNextList({ items }: { items: readonly UpNextItem[] }) {
  const now = useNow();
  return (
    <Surface
      radius="card"
      className="border-rule divide-rule divide-y overflow-hidden border"
    >
      {items.length > 0 ? (
        <ul className="divide-rule divide-y">
          {items.map((item) => {
            const row = upNextRowView(item, now);
            return (
              <li key={row.key}>
                <Link
                  href={gameHref({ kind: "game", gameId: item.game.id })}
                  aria-label={row.spoken}
                  className={cn(
                    "hover:bg-wash flex min-h-14 items-center gap-3.5 px-4 py-3.5 transition-colors",
                    FOCUS_RING,
                    "focus-visible:ring-inset",
                  )}
                >
                  <span aria-hidden="true" className="w-[58px] shrink-0">
                    <span className="font-expanded text-lead block">
                      {row.day}
                    </span>
                    <span className="text-eyebrow text-muted-foreground block truncate">
                      {row.time}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">
                      {row.title}
                    </span>
                    {row.detail ? (
                      <span className="text-meta text-muted-foreground block truncate">
                        {row.detail}
                      </span>
                    ) : null}
                  </span>
                  <Trailing row={row} />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
      <Link
        href="/dashboard/games"
        className={cn(
          "text-meta hover:bg-wash flex min-h-11 items-center justify-between px-4 font-semibold transition-colors",
          FOCUS_RING,
          "focus-visible:ring-inset",
        )}
      >
        All games
        <ArrowRight aria-hidden="true" className="size-3.5" />
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
        "border-rule bg-paper hover:bg-wash flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border font-semibold transition-colors",
        FOCUS_RING,
      )}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {label}
    </Link>
  );
}

export function UpNextEmpty({
  createAction,
}: {
  createAction: HomeNoGamesCreateAction;
}) {
  return (
    <Surface radius="surface" className="border-rule overflow-hidden border">
      <div className="border-rule relative flex flex-col gap-3 border-b px-[18px] pb-4 pt-[18px]">
        <Hatch className="absolute inset-0 shadow-none" />
        <p className="border-rule bg-paper text-eyebrow rounded-xs relative self-start border px-2 py-[3px] font-mono uppercase">
          This week
          <span className="text-muted-foreground">{" / Free"}</span>
        </p>
        <h3 className="font-expanded text-h1-lg relative">
          Your week
          <br />
          is open.
        </h3>
        <p className="text-meta text-muted-foreground relative">
          Join an open game, or start one with your group.
        </p>
      </div>
      <div className="flex gap-2 px-[18px] pb-4 pt-3">
        <OutlineTile
          href="/dashboard/games"
          label="Find a game"
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
