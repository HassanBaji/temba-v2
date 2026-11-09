import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { gameCardRosterOccupancy } from "./game-card";
import {
  isDrawnTournamentSummaryRow,
  tournamentCardAction,
  tournamentCardActionLabel,
  tournamentTeamsLine,
  type TournamentCardInput,
} from "./tournament-card";

type Occupant = { name: string; isViewer: boolean } | null;

export type HomeComingUpSource = TournamentCardInput & {
  id: string;
  rated: boolean;
  matchId: string | null;
  format: string;
  sport?: string | null;
  poolCount: number | null;
  name: string | null;
  venue: { name: string } | null;
  startTime: Date | string;
  registeredUserCount: number;
  playersAllowed: number | null;
  sides: readonly { left: Occupant; right: Occupant }[];
};

export type HomeComingUpGameRow = {
  kind: "game";
  id: string;
  rated: boolean;
  rowKey: string;
  venueName: string;
  startsAt: Date;
  seatsTaken: number;
  seatsTotal: number;
  sport?: string | null;
  /** "7/10" for a Roster registration Game, which shows a count instead of seat bars. */
  occupancyLabel?: string | null;
};

export type HomeComingUpTournamentRow = {
  kind: "tournament";
  id: string;
  rated: boolean;
  rowKey: string;
  title: string;
  startsAt: Date;
  teamsLine: string;
  /** Null once the viewer is in: the row itself opens the Game. */
  actionLabel: string | null;
};

export type HomeComingUpRow = HomeComingUpGameRow | HomeComingUpTournamentRow;

function tournamentTitle(game: HomeComingUpSource, locale: Locale) {
  return (
    game.name ??
    game.venue?.name ??
    messagesFor(locale).home.comingUp.tournamentFallback
  );
}

function toRow(game: HomeComingUpSource, locale: Locale): HomeComingUpRow {
  const m = messagesFor(locale).home.comingUp;
  const startsAt = new Date(game.startTime);
  if (isDrawnTournamentSummaryRow(game)) {
    const action = tournamentCardAction(game);
    return {
      kind: "tournament",
      id: game.id,
      rated: game.rated,
      rowKey: game.id,
      title: tournamentTitle(game, locale),
      startsAt,
      teamsLine: tournamentTeamsLine(game, locale),
      actionLabel:
        action === "view" ? null : tournamentCardActionLabel(action, locale),
    };
  }
  return {
    kind: "game",
    id: game.id,
    rated: game.rated,
    rowKey: game.matchId ?? game.id,
    venueName: game.venue?.name ?? m.gameFallback,
    startsAt,
    seatsTaken: game.registeredUserCount,
    seatsTotal: game.playersAllowed ?? game.sides.length * 2,
    sport: game.sport ?? null,
    occupancyLabel: gameCardRosterOccupancy(game)?.label ?? null,
  };
}

/** A drawn tournament is one row for the whole tournament, never one per Match. */
export function homeComingUpRows(
  games: readonly HomeComingUpSource[],
  locale: Locale,
) {
  return games.map((game) => toRow(game, locale));
}

export function homeComingUpSeatBars(
  game: Pick<HomeComingUpGameRow, "seatsTaken" | "seatsTotal">,
  locale: Locale,
): { bars: ("taken" | "open")[]; spokenLabel: string } {
  const m = messagesFor(locale).home.comingUp;
  const open = Math.max(0, game.seatsTotal - game.seatsTaken);
  return {
    bars: [
      ...Array.from({ length: game.seatsTaken }, () => "taken" as const),
      ...Array.from({ length: open }, () => "open" as const),
    ],
    spokenLabel: open === 0 ? m.allSeatsFilled : m.openSeats(open),
  };
}
