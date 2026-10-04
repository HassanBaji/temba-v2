import {
  formatAbsoluteDay,
  formatGameClock,
  formatPlayedRelativeDay,
} from "./format-game-start";
import type { FriendlyGameDetails } from "./friendly-game-details";
import { friendlyGameDetailsPlan } from "./friendly-game-details";
import {
  formatHeroCountdown,
  formatHeroKickoffTrailer,
  formatHomeKickoff,
} from "./home-countdown";
import { formatPricePerPlayerFils } from "./price-per-player";
import { surfaceToneForPhase, type SurfaceTone } from "./surface-tone";

export type FriendlyGameHeroPhase =
  | "upcoming"
  | "ongoing"
  | "needs_results"
  | "final";

export type FriendlyGameHeroMatch = {
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

export type FriendlyGameHeroInput = {
  phase: FriendlyGameHeroPhase;
  windowStart: Date | null;
  windowEnd: Date | null;
  venueName: string | null;
  venueCity: string | null;
  courtName: string | null;
  pricePerPlayerFils: number | null;
  match: FriendlyGameHeroMatch | null;
  viewerGameTeamId: string | null;
  partnerBesideName: string | null;
};

export function friendlyGameHeroInput(
  game: FriendlyGameDetails,
): FriendlyGameHeroInput | null {
  if (!game.phase || game.phase === "cancelled") {
    return null;
  }
  const plan = friendlyGameDetailsPlan(game);
  const first = plan.firstMatch;
  return {
    phase: game.phase,
    windowStart: game.windowStart,
    windowEnd: game.windowEnd,
    venueName: game.venue?.name ?? null,
    venueCity: game.venue?.city ?? null,
    courtName: first?.courtName ?? null,
    pricePerPlayerFils: game.pricePerPlayerFils,
    match: first
      ? {
          startTime: first.startTime,
          durationInMinutes: first.durationInMinutes,
          slot1GameTeamId: first.slot1GameTeamId,
          slot2GameTeamId: first.slot2GameTeamId,
          sets: first.sets,
          outcome: first.outcome,
        }
      : null,
    viewerGameTeamId: plan.viewerGameTeamId,
    partnerBesideName: plan.partnerBesideName,
  };
}

export type FriendlyGameHeroVerdict = "won" | "lost" | "draw";

export const HERO_VERDICT_WORD: Record<FriendlyGameHeroVerdict, string> = {
  won: "Win",
  lost: "Loss",
  draw: "Draw",
};

/**
 * Viewer-perspective read of the Match's outcome: which slot the viewer's
 * Game team sat in. A viewer on neither team (an organizer who never played)
 * falls back to slot 1 rather than guessing.
 */
export function friendlyGameViewerPerspective(
  match: FriendlyGameHeroMatch,
  viewerGameTeamId: string | null,
) {
  const viewerSlot: 1 | 2 =
    viewerGameTeamId && match.slot2GameTeamId === viewerGameTeamId ? 2 : 1;
  const { result } = match.outcome;
  const verdict: FriendlyGameHeroVerdict | null =
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
    viewerSlot === 1 ? match.outcome.slot2SetWins : match.outcome.slot1SetWins;
  // A never-played Set has null games won on both slots: drop it rather than
  // render "null" for a Set that never happened.
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

export function heroPriceFigure(pricePerPlayerFils: number | null) {
  if (pricePerPlayerFils == null) {
    return "—";
  }
  return formatPricePerPlayerFils(pricePerPlayerFils) ?? "—";
}

export function heroDurationFigure(durationInMinutes: number | null) {
  return durationInMinutes != null ? `${durationInMinutes}m` : "—";
}

export type FriendlyGameHeroFigure = {
  key: string;
  value: string;
  label: string;
};

export type FriendlyGameHeroModel =
  | { kind: "time_unset"; tone: "ink" }
  | {
      kind: "final";
      tone: "paper";
      dateLabel: string;
      tag: string;
      verdict: FriendlyGameHeroVerdict | null;
      verdictWord: string | null;
      setLine: string | null;
      venueName: string | null;
      courtClockLine: string;
      venueCity: string | null;
      figures: FriendlyGameHeroFigure[];
    }
  | {
      kind: "scheduled";
      tone: SurfaceTone;
      phase: Exclude<FriendlyGameHeroPhase, "final">;
      leftLabel: string;
      statusLabel: string | null;
      partnerName: string | null;
      kickoffTime: string;
      trailer: string;
      dateLine: string;
      scheduleLine: string | null;
      figures: FriendlyGameHeroFigure[];
    };

export function friendlyGameHeroModel(
  input: FriendlyGameHeroInput,
  now: Date,
): FriendlyGameHeroModel | null {
  const { windowStart, phase, match } = input;
  if (!windowStart) {
    return { kind: "time_unset", tone: "ink" };
  }

  if (phase === "final") {
    if (!match) {
      return null;
    }
    const { verdict, viewerSetWins, opponentSetWins, sets } =
      friendlyGameViewerPerspective(match, input.viewerGameTeamId);
    return {
      kind: "final",
      tone: "paper",
      dateLabel: formatAbsoluteDay(windowStart),
      tag: "Rated match",
      verdict,
      verdictWord: verdict ? HERO_VERDICT_WORD[verdict] : null,
      setLine:
        sets.length > 0
          ? sets
              .map((set) => `${set.viewerGames}–${set.opponentGames}`)
              .join("  ")
          : null,
      venueName: input.venueName,
      courtClockLine: [input.courtName, formatGameClock(windowStart)]
        .filter(Boolean)
        .join(" · "),
      venueCity: input.venueCity,
      figures: [
        {
          key: "duration",
          value: heroDurationFigure(match.durationInMinutes),
          label: "Duration",
        },
        {
          key: "won-by",
          value: `${viewerSetWins}–${opponentSetWins}`,
          label: "Won by",
        },
      ],
    };
  }

  const kickoff = formatHomeKickoff(windowStart);
  const trailer = formatHeroKickoffTrailer(windowStart, input.windowEnd);
  const dateLabel = formatAbsoluteDay(windowStart);
  const statusLabel =
    phase === "needs_results"
      ? formatPlayedRelativeDay(windowStart)
      : formatHeroCountdown(phase, windowStart, now);
  const duration = heroDurationFigure(match?.durationInMinutes ?? null);
  const figures: FriendlyGameHeroFigure[] =
    phase === "needs_results"
      ? [
          { key: "score", value: "No score", label: "Nobody has added one" },
          { key: "duration", value: duration, label: "Duration" },
        ]
      : [
          {
            key: "price",
            value: heroPriceFigure(input.pricePerPlayerFils),
            label: "Price",
          },
          { key: "duration", value: duration, label: "Duration" },
        ];
  const partnerName =
    input.partnerBesideName === "" ? null : input.partnerBesideName;
  const scheduleLine =
    [input.venueName, input.courtName, input.venueCity]
      .filter(Boolean)
      .join(" · ") || null;

  return {
    kind: "scheduled",
    tone: surfaceToneForPhase(phase),
    phase,
    leftLabel: partnerName ? "Seats booked" : dateLabel,
    statusLabel,
    partnerName,
    kickoffTime: kickoff.time,
    trailer,
    dateLine: `${dateLabel}, ${kickoff.time}${trailer ? ` ${trailer}` : ""}`,
    scheduleLine,
    figures,
  };
}
