"use client";

import { ChevronRight, MapPin } from "lucide-react";
import Link from "next/link";

import { AvatarStack } from "~/components/common/avatar-stack";
import { GAME_FORMAT_LABELS } from "~/components/temba/typed-labels";
import { SPORT_LABELS, type SportValue } from "~/components/temba/sport-badge";
import { Button } from "~/components/ui/button";
import { formatGameClock, formatRelativeDay } from "~/lib/format-game-start";
import { formatLevelRangeLabel } from "~/lib/level-range";
import { cn } from "~/lib/utils";
import type { HubListSide } from "~/server/games";

const HERO_BACKGROUND = "/images/game-hero-background.jpg";

function sportEyebrow(sport: string | null | undefined) {
  if (!sport) {
    return null;
  }
  const label =
    sport in SPORT_LABELS ? SPORT_LABELS[sport as SportValue] : sport;
  return label.toUpperCase();
}

function formatEyebrow(format: string) {
  const label =
    format in GAME_FORMAT_LABELS
      ? GAME_FORMAT_LABELS[format as keyof typeof GAME_FORMAT_LABELS]
      : format.replaceAll("_", " ");
  return label.toUpperCase();
}

function peopleFromSides(sides: HubListSide[]) {
  const people: { name: string; image?: string | null; userId: string }[] = [];
  const seen = new Set<string>();
  for (const side of sides) {
    for (const occupant of [side.left, side.right]) {
      if (!occupant || seen.has(occupant.userId)) {
        continue;
      }
      seen.add(occupant.userId);
      people.push({
        userId: occupant.userId,
        name: occupant.name,
        image: occupant.image,
      });
    }
  }
  return people;
}

export function UpcomingGameHeroCard({
  href,
  startTime,
  sport,
  format,
  venueName,
  registeredUserCount,
  playersAllowed,
  sides,
  levelMinTenths,
  levelMaxTenths,
  className,
}: {
  href: string;
  startTime: Date | string;
  sport: string | null;
  format: string;
  venueName: string | null;
  registeredUserCount: number;
  playersAllowed: number | null;
  sides: HubListSide[];
  levelMinTenths?: number | null;
  levelMaxTenths?: number | null;
  className?: string;
}) {
  const sportLabel = sportEyebrow(sport);
  const formatLabel = formatEyebrow(format);
  const people = peopleFromSides(sides);
  const occupancy =
    playersAllowed != null
      ? `${registeredUserCount}/${playersAllowed}`
      : `${registeredUserCount}`;
  const levelLabel = formatLevelRangeLabel(levelMinTenths, levelMaxTenths);

  return (
    <article
      className={cn(
        "sm:min-h-70 relative isolate flex min-h-60 w-full min-w-0 max-w-full flex-col overflow-hidden rounded-lg bg-black text-white sm:rounded-[1.75rem]",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-cover bg-[position:85%_center] bg-no-repeat sm:bg-right"
        style={{ backgroundImage: `url(${HERO_BACKGROUND})` }}
      />
      <div
        aria-hidden="true"
        className="bg-linear-to-r via-black/92 pointer-events-none absolute inset-0 from-black to-black/45 sm:via-black/90 sm:to-black/35"
      />

      <div className="relative z-10 flex min-w-0 flex-1 flex-col gap-3 p-4 sm:gap-4 sm:p-5">
        <div className="flex min-w-0 items-start justify-between gap-2 sm:gap-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-1 sm:gap-x-3">
            {sportLabel ? (
              <span className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-white/70 sm:text-[11px]">
                {sportLabel}
              </span>
            ) : null}
            <span className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-white/70 sm:text-[11px]">
              {formatLabel}
            </span>
          </div>
          <div className="shrink-0 rounded-xl border border-white/15 bg-black/35 px-2.5 py-1.5 text-center backdrop-blur-sm sm:px-3 sm:py-2">
            <p className="text-sm font-semibold tabular-nums leading-none">
              {occupancy}
            </p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/65">
              Players
            </p>
          </div>
        </div>

        <div className="min-w-0 space-y-2">
          <p className="text-[1.5rem] font-bold leading-tight tracking-[-0.03em] sm:text-[1.75rem]">
            <span className="break-words">
              {formatRelativeDay(startTime, { sameDayLabel: "Today" })}
            </span>
            <span className="mx-1.5 text-white/45">·</span>
            <span className="whitespace-nowrap">
              {formatGameClock(startTime)}
            </span>
          </p>
          {venueName ? (
            <p className="flex min-w-0 items-start gap-1.5 text-sm text-white/75">
              <MapPin
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-white/55"
                strokeWidth={2}
              />
              <span className="min-w-0 break-words">{venueName}</span>
            </p>
          ) : null}
          {levelLabel ? (
            <p className="text-sm text-white/75">{levelLabel}</p>
          ) : null}
        </div>

        {people.length > 0 ? (
          <div className="mt-auto min-w-0 overflow-hidden">
            <AvatarStack
              people={people}
              size="default"
              className="**:data-[slot=avatar-group-count]:bg-white/15 **:data-[slot=avatar-group-count]:text-white **:data-[slot=avatar-group-count]:ring-black *:data-[slot=avatar]:ring-black"
            />
          </div>
        ) : (
          <div className="mt-auto" />
        )}

        <Button
          asChild
          variant="secondary"
          className="h-11 min-h-11 w-full rounded-full bg-white text-black hover:bg-white/90"
        >
          <Link href={href}>
            View game details
            <ChevronRight aria-hidden="true" className="size-4" />
          </Link>
        </Button>
      </div>
    </article>
  );
}
