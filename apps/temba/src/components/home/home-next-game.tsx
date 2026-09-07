"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { HomeSeatRow } from "~/components/home/home-seat-row";
import { Button } from "~/components/ui/button";
import { formatHomeCountdown, formatHomeKickoff } from "~/lib/home-countdown";
import type { HomeSeatView } from "~/lib/home-seats";

export type HomeNextGamePhase = "upcoming" | "ongoing" | "needs_results";

export function HomeNextGame({
  id,
  phase,
  venueName,
  courtLabel,
  formatLabel,
  startsAt,
  seats,
}: {
  id: string;
  phase: HomeNextGamePhase;
  venueName: string;
  courtLabel?: string | null;
  formatLabel: string;
  startsAt: Date;
  seats: HomeSeatView[];
}) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const kickoff = formatHomeKickoff(startsAt);
  const countdown =
    phase === "upcoming" ? formatHomeCountdown(startsAt, now) : null;
  const status =
    phase === "ongoing"
      ? "Playing now"
      : phase === "needs_results"
        ? "Add results"
        : countdown;
  const hasOpenSeat = seats.some((seat) => !seat.filled);
  const primary =
    phase === "needs_results"
      ? { href: `/dashboard/games/${id}`, label: "Add results" }
      : phase === "upcoming" && hasOpenSeat
        ? { href: `/dashboard/games/${id}`, label: "Invite a player" }
        : { href: `/dashboard/games/${id}`, label: "View game" };
  const detailsHref = `/dashboard/games/${id}`;
  const secondaryLine = [courtLabel, formatLabel].filter(Boolean).join(" · ");

  return (
    <article className="bg-ink text-paper rounded-xl p-[22px]">
      <div className="text-dim text-meta flex items-start justify-between gap-3">
        <p className="min-w-0 truncate">{venueName}</p>
        {status ? (
          <p className="min-w-[11ch] shrink-0 text-right tabular-nums">
            {status}
          </p>
        ) : null}
      </div>
      <p className="mt-3 flex flex-wrap items-baseline gap-x-2">
        <span className="font-expanded text-[56px] tabular-nums leading-none">
          {kickoff.time}
        </span>
        <span className="text-dim text-[20px] leading-none">
          {kickoff.meridiem} {kickoff.relativeDay}
        </span>
      </p>
      {secondaryLine ? (
        <p className="text-dim text-meta mt-2">{secondaryLine}</p>
      ) : null}
      <div className="mt-4">
        <HomeSeatRow seats={seats} />
      </div>
      <div className="mt-4 flex gap-2">
        <Button asChild className="bg-paper text-ink hover:bg-paper/90 flex-1">
          <Link href={primary.href}>{primary.label}</Link>
        </Button>
        <Button
          asChild
          variant="ghost"
          className="border-dimrule text-paper hover:bg-raised flex-1 border"
        >
          <Link href={detailsHref}>Details</Link>
        </Button>
      </div>
    </article>
  );
}

export function HomeNoGames() {
  return (
    <div className="border-rule bg-paper rounded-xl border p-[22px]">
      <p className="text-lead font-semibold">No games booked</p>
      <p className="text-muted-foreground text-meta mt-1">
        Browse public pickup or create a Game.
      </p>
      <div className="mt-4 flex gap-2">
        <Button asChild className="flex-1">
          <Link href="/dashboard/games/new">Create Game</Link>
        </Button>
        <Button asChild variant="outline" className="flex-1">
          <Link href="/dashboard/games">Browse</Link>
        </Button>
      </div>
    </div>
  );
}
