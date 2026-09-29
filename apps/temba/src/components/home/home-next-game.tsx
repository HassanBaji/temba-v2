"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useCreateAccess } from "~/components/create-access-gate";
import { HomeSeatRow } from "~/components/home/home-seat-row";
import { Button } from "~/components/ui/button";
import { formatHomeCountdown, formatHomeKickoff } from "~/lib/home-countdown";
import {
  homeNextGameActions,
  type HomeNextGamePhase,
} from "~/lib/home-next-game";
import { homeNoGamesCreateAction } from "~/lib/home-no-games";
import type { HomeSeatView } from "~/lib/home-seats";
import { api } from "~/trpc/react";

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
  const { primary, detailsHref } = homeNextGameActions({
    gameId: id,
    phase,
    hasOpenSeat: seats.some((seat) => !seat.filled),
  });
  const secondaryLine = [courtLabel, formatLabel].filter(Boolean).join(" · ");

  return (
    <article className="surface-ink bg-ink text-paper rounded-xl p-[22px]">
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
        <Button asChild variant="inverse" className="flex-1">
          <Link href={primary.href}>{primary.label}</Link>
        </Button>
        {detailsHref ? (
          <Button asChild variant="outline-inverse" className="flex-1">
            <Link href={detailsHref}>Details</Link>
          </Button>
        ) : null}
      </div>
    </article>
  );
}

export function HomeNoGames() {
  const { hasCreateAccess } = useCreateAccess();
  const createGroups = api.games.listCreateGroups.useQuery(undefined, {
    enabled: hasCreateAccess,
  });
  const createAction = homeNoGamesCreateAction({
    hasCreateAccess,
    createGroupCount: createGroups.data?.length,
  });

  return (
    <div className="border-rule bg-paper rounded-xl border p-[22px]">
      <p className="text-lead font-semibold">No games booked</p>
      <p className="text-muted-foreground text-meta mt-1">
        {createAction?.kind === "group"
          ? "Create a Group first, then you can create a Game."
          : "Browse available games."}
      </p>
      <div className="mt-4 flex gap-2">
        {createAction ? (
          <Button asChild className="flex-1">
            <Link href={createAction.href}>{createAction.label}</Link>
          </Button>
        ) : null}
        <Button asChild variant="outline" className="flex-1">
          <Link href="/dashboard/games">Browse</Link>
        </Button>
      </div>
    </div>
  );
}
