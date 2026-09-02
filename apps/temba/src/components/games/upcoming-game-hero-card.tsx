"use client";

import { ChevronRight, MapPin } from "lucide-react";
import Link from "next/link";

import { AvatarStack } from "~/components/common/avatar-stack";
import { GAME_FORMAT_LABELS } from "~/components/temba/typed-labels";
import { SPORT_LABELS, type SportValue } from "~/components/temba/sport-badge";
import { Button } from "~/components/ui/button";
import { formatGameClock, formatRelativeDay } from "~/lib/format-game-start";
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
  className?: string;
}) {
  const sportLabel = sportEyebrow(sport);
  const formatLabel = formatEyebrow(format);
  const people = peopleFromSides(sides);
  const occupancy =
    playersAllowed != null
      ? `${registeredUserCount}/${playersAllowed}`
      : `${registeredUserCount}`;

  return (
    <article
      className={cn(
        "min-h-70 relative isolate flex flex-col overflow-hidden rounded-[1.75rem] bg-black text-white",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-cover bg-right bg-no-repeat"
        style={{ backgroundImage: `url(${HERO_BACKGROUND})` }}
      />
      <div
        aria-hidden="true"
        className="bg-linear-to-r pointer-events-none absolute inset-0 from-black via-black/90 to-black/35"
      />

      <div className="relative z-10 flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            {sportLabel ? (
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/70">
                {sportLabel}
              </span>
            ) : null}
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/70">
              {formatLabel}
            </span>
          </div>
          <div className="shrink-0 rounded-xl border border-white/15 bg-black/35 px-3 py-2 text-center backdrop-blur-sm">
            <p className="text-sm font-semibold tabular-nums leading-none">
              {occupancy}
            </p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/65">
              Players
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[1.75rem] font-bold leading-tight tracking-[-0.03em]">
            {formatRelativeDay(startTime, { sameDayLabel: "Today" })}
            <span className="mx-1.5 text-white/45">·</span>
            {formatGameClock(startTime)}
          </p>
          {venueName ? (
            <p className="flex items-start gap-1.5 text-sm text-white/75">
              <MapPin
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-white/55"
                strokeWidth={2}
              />
              <span className="min-w-0">{venueName}</span>
            </p>
          ) : null}
        </div>

        {people.length > 0 ? (
          <div className="mt-auto">
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
