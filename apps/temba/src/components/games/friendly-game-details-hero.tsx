"use client";

import { useEffect, useState } from "react";

import { DividedFigurePair } from "~/components/home/home-all-time";
import { WinLossMark } from "~/components/home/home-recent-form-row";
import {
  formatAbsoluteDay,
  formatGameClock,
  formatPlayedRelativeDay,
} from "~/lib/format-game-start";
import {
  formatHeroCountdown,
  formatHeroKickoffTrailer,
  formatHomeKickoff,
} from "~/lib/home-countdown";
import { formatPricePerPlayerCents } from "~/lib/price-per-player";

/**
 * The hero-relevant slice of the Friendly Match this Game's details page is
 * about (game-details redesign, TEM-179). Individual Friendly games always
 * have exactly one Match; `byId.ts` exposes it as `matches[0]`.
 */
export type FriendlyGameDetailsHeroMatch = {
  startTime: Date | null;
  durationInMinutes: number | null;
  slot1GameTeamId: string | null;
  slot2GameTeamId: string | null;
  sets: {
    id: string;
    slot1GamesWon: number | null;
    slot2GamesWon: number | null;
  }[];
  outcome: {
    slot1SetWins: number;
    slot2SetWins: number;
    result: "slot1" | "slot2" | "draw" | "none";
  };
};

export type FriendlyGameDetailsHeroPhase =
  | "upcoming"
  | "ongoing"
  | "needs_results"
  | "final";

function ScheduleSubline({
  venueName,
  venueCity,
  courtName,
}: {
  venueName: string | null;
  venueCity: string | null;
  courtName: string | null;
}) {
  const line = [venueName, courtName, venueCity].filter(Boolean).join(" · ");
  if (!line) {
    return null;
  }
  return <p className="text-dim text-meta mt-2">{line}</p>;
}

/**
 * Viewer-perspective read of the Match's outcome (Final hero only): which
 * slot the viewer's Game team sat in, so set scores and the W/L mark read
 * from "my score" rather than "slot 1's score". A viewer who isn't seated
 * on either team (e.g. an organizer who never played) has no true
 * perspective — this falls back to slot 1 rather than guessing, which is a
 * reasonable default for a case the design brief does not address.
 */
function viewerPerspective(
  match: FriendlyGameDetailsHeroMatch,
  viewerGameTeamId: string | null,
) {
  const viewerSlot: 1 | 2 =
    viewerGameTeamId && match.slot2GameTeamId === viewerGameTeamId ? 2 : 1;
  const opponentSlot: 1 | 2 = viewerSlot === 1 ? 2 : 1;
  const { result } = match.outcome;
  const verdict: "won" | "lost" | "draw" | null =
    result === "none"
      ? null
      : result === "draw"
        ? "draw"
        : result === `slot${viewerSlot}`
          ? "won"
          : "lost";
  const viewerSetWins =
    viewerSlot === 1 ? match.outcome.slot1SetWins : match.outcome.slot2SetWins;
  const opponentSetWins =
    opponentSlot === 1
      ? match.outcome.slot1SetWins
      : match.outcome.slot2SetWins;
  // A never-played Set (e.g. a Match that finished 2-0 in a best-of-three)
  // has null games-won on both slots — drop it from the scoreline rather
  // than rendering "null" for a Set that never happened.
  const sets = match.sets.flatMap((set) => {
    const viewerGames =
      viewerSlot === 1 ? set.slot1GamesWon : set.slot2GamesWon;
    const opponentGames =
      viewerSlot === 1 ? set.slot2GamesWon : set.slot1GamesWon;
    if (viewerGames == null || opponentGames == null) {
      return [];
    }
    return [{ id: set.id, viewerGames, opponentGames }];
  });
  return { verdict, viewerSetWins, opponentSetWins, sets };
}

function priceFigureValue(pricePerPlayerCents: number | null) {
  if (pricePerPlayerCents == null) {
    return "—";
  }
  return formatPricePerPlayerCents(pricePerPlayerCents) ?? "—";
}

function durationFigureValue(durationInMinutes: number | null) {
  return durationInMinutes != null ? `${durationInMinutes}m` : "—";
}

function FinalHero({
  windowStart,
  venueName,
  venueCity,
  courtName,
  match,
  viewerGameTeamId,
}: {
  windowStart: Date;
  venueName: string | null;
  venueCity: string | null;
  courtName: string | null;
  match: FriendlyGameDetailsHeroMatch;
  viewerGameTeamId: string | null;
}) {
  const { verdict, viewerSetWins, opponentSetWins, sets } = viewerPerspective(
    match,
    viewerGameTeamId,
  );
  const verdictWord =
    verdict === "won"
      ? "Win"
      : verdict === "lost"
        ? "Loss"
        : verdict === "draw"
          ? "Draw"
          : null;

  return (
    <article className="border-rule bg-paper text-ink rounded-xl border p-[22px]">
      <div className="text-muted-foreground text-meta flex items-start justify-between gap-3">
        <p className="min-w-0 truncate">{formatAbsoluteDay(windowStart)}</p>
        <p className="shrink-0">Rated match</p>
      </div>

      {verdict && verdictWord ? (
        <div className="mt-3 flex items-center gap-3">
          <WinLossMark outcome={verdict} />
          <span className="font-expanded text-[40px] leading-none">
            {verdictWord}
          </span>
        </div>
      ) : null}

      {sets.length > 0 ? (
        <p className="text-muted-foreground text-meta mt-2 tabular-nums">
          {sets
            .map((set) => `${set.viewerGames}–${set.opponentGames}`)
            .join("  ")}
        </p>
      ) : null}

      <div className="mt-4">
        {venueName ? (
          <p className="text-lead font-semibold">{venueName}</p>
        ) : null}
        <p className="text-muted-foreground text-meta mt-1">
          {[courtName, formatGameClock(windowStart)]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {venueCity ? (
          <p className="text-muted-foreground text-meta">{venueCity}</p>
        ) : null}
      </div>

      <div className="mt-4">
        <DividedFigurePair
          surface="light"
          figures={[
            {
              key: "duration",
              value: durationFigureValue(match.durationInMinutes),
              label: "Duration",
            },
            {
              key: "won-by",
              value: `${viewerSetWins}–${opponentSetWins}`,
              label: "Won by",
            },
          ]}
        />
      </div>
    </article>
  );
}

export function FriendlyGameDetailsHero({
  phase,
  windowStart,
  windowEnd,
  venueName,
  venueCity,
  courtName,
  pricePerPlayerCents,
  match,
  viewerGameTeamId,
  partnerBesideName,
}: {
  phase: FriendlyGameDetailsHeroPhase;
  windowStart: Date | null;
  windowEnd: Date | null;
  venueName: string | null;
  venueCity: string | null;
  courtName: string | null;
  pricePerPlayerCents: number | null;
  match: FriendlyGameDetailsHeroMatch | null;
  viewerGameTeamId: string | null;
  /** Occupant of the other Position on the viewer's side, when both sit. */
  partnerBesideName?: string | null;
}) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  if (!windowStart) {
    return (
      <article className="bg-ink text-paper rounded-xl p-[22px]">
        <p className="text-dim text-meta">Time unset</p>
      </article>
    );
  }

  if (phase === "final") {
    if (!match) {
      return null;
    }
    return (
      <FinalHero
        windowStart={windowStart}
        venueName={venueName}
        venueCity={venueCity}
        courtName={courtName}
        match={match}
        viewerGameTeamId={viewerGameTeamId}
      />
    );
  }

  const kickoff = formatHomeKickoff(windowStart);
  const trailer = formatHeroKickoffTrailer(windowStart, windowEnd);
  const dateLabel = formatAbsoluteDay(windowStart);
  const statusLabel =
    phase === "needs_results"
      ? formatPlayedRelativeDay(windowStart)
      : formatHeroCountdown(phase, windowStart, now);

  const figures =
    phase === "needs_results"
      ? [
          { key: "score", value: "No score", label: "Nobody has added one" },
          {
            key: "duration",
            value: durationFigureValue(match?.durationInMinutes ?? null),
            label: "Duration",
          },
        ]
      : [
          {
            key: "price",
            value: priceFigureValue(pricePerPlayerCents),
            label: "Price",
          },
          {
            key: "duration",
            value: durationFigureValue(match?.durationInMinutes ?? null),
            label: "Duration",
          },
        ];

  const bookedWithPartner = Boolean(partnerBesideName);

  return (
    <article className="bg-ink text-paper rounded-xl p-[22px]">
      <div className="text-dim text-meta flex items-start justify-between gap-3">
        <p className="min-w-0 truncate">
          {/* ADR-0013: booked now, not "Team confirmed" / seats held. */}
          {bookedWithPartner ? "Seats booked" : dateLabel}
        </p>
        {statusLabel ? (
          <p className="min-w-[11ch] shrink-0 text-right tabular-nums">
            {statusLabel}
          </p>
        ) : null}
      </div>
      {bookedWithPartner ? (
        <>
          <p className="font-expanded mt-3 text-[38px] leading-none tracking-[-0.03em]">
            You and {partnerBesideName}
          </p>
          <p className="mt-3 text-[16px] leading-snug">
            {dateLabel}, {kickoff.time}
            {trailer ? ` ${trailer}` : ""}
          </p>
        </>
      ) : (
        <p className="mt-3 flex flex-wrap items-baseline gap-x-2">
          <span className="font-expanded text-[54px] tabular-nums leading-none">
            {kickoff.time}
          </span>
          <span className="text-dim text-[18px] leading-none">{trailer}</span>
        </p>
      )}
      <ScheduleSubline
        venueName={venueName}
        venueCity={venueCity}
        courtName={courtName}
      />
      <div className="mt-4">
        <DividedFigurePair surface="dark" figures={figures} />
      </div>
    </article>
  );
}
