import { messagesFor } from "@repo/i18n/messages";
import type { Locale } from "@repo/i18n/locale";

import { formatAbsoluteDay } from "./format-game-start";
import {
  kingCourtCount,
  kingCourtMoves,
  kingCourtTag,
  kingFinalOrderOf,
  kingFirstNames,
  kingFullNames,
  kingPairName,
  startingCourtsOf,
  type KingCourtTag,
} from "./tournament-king";

export type KingViewTeam = {
  id: string;
  sideIndex: number | null;
  startCourt?: number | null;
  finalPlace?: number | null;
  members: readonly { id: string; name: string }[];
};

type KingGame = {
  name: string | null;
  windowStart: Date | string | null;
  venue: { name: string } | null;
  teamsAllowed: number | null;
  viewerUserId: string;
  gameTeams: readonly KingViewTeam[];
};

export function isCompleteKingTeam(team: KingViewTeam) {
  return team.members.length === 2;
}

export function viewerKingTeam<Team extends KingViewTeam>(
  teams: readonly Team[],
  viewerUserId: string,
): Team | null {
  return (
    teams.find((team) =>
      team.members.some((member) => member.id === viewerUserId),
    ) ?? null
  );
}

/** Courts the drawn field fills: the posted courts, never fewer than the plan. */
export function kingDrawnCourtCount(
  game: Pick<KingGame, "teamsAllowed" | "gameTeams">,
) {
  const posted = startingCourtsOf(game.gameTeams);
  const last = posted[posted.length - 1]?.court ?? 0;
  return Math.max(
    last,
    kingCourtCount(game.gameTeams.filter(isCompleteKingTeam).length),
  );
}

export type KingYourCourt = {
  court: number;
  opponent: KingViewTeam | null;
  win: { court: number; stays: boolean };
  lose: { court: number; stays: boolean };
};

/** Where the viewer's team starts, who it plays first, and where each result sends it. */
export function kingYourCourt(game: KingGame): KingYourCourt | null {
  const team = viewerKingTeam(game.gameTeams, game.viewerUserId);
  if (!team?.startCourt) {
    return null;
  }
  const courtCount = kingDrawnCourtCount(game);
  const moves = kingCourtMoves(team.startCourt, courtCount);
  const opponent =
    game.gameTeams.find(
      (other) => other.id !== team.id && other.startCourt === team.startCourt,
    ) ?? null;
  return {
    court: team.startCourt,
    opponent,
    win: { court: moves.win, stays: moves.winStays },
    lose: { court: moves.lose, stays: moves.loseStays },
  };
}

export type KingCourtRow = {
  court: number;
  tag: KingCourtTag | "yours";
  teams: KingViewTeam[];
};

/** The posted starting courts, the viewer's court tagged in place of its position. */
export function kingStartingCourtRows(game: KingGame): KingCourtRow[] {
  const courtCount = kingDrawnCourtCount(game);
  const viewerTeam = viewerKingTeam(game.gameTeams, game.viewerUserId);
  return startingCourtsOf(game.gameTeams).map((entry) => ({
    court: entry.court,
    tag:
      entry.court !== 1 && viewerTeam?.startCourt === entry.court
        ? "yours"
        : kingCourtTag(entry.court, courtCount),
    teams: entry.teams,
  }));
}

export type KingPodiumRow = {
  gameTeamId: string;
  place: number | null;
  markName: string;
  isViewer: boolean;
  smallLine: string;
  mainLine: string;
  detailLine: string | null;
};

export type KingFinishedView = {
  name: string;
  dateLine: string | null;
  summary: string;
  podiumLabel: string;
  podium: KingPodiumRow[];
  table: { team: KingViewTeam; place: number | null; isViewer: boolean }[];
};

/** The finished screen: the king first, then the viewer's place, then the whole order. */
export function kingFinishedView(
  game: KingGame,
  locale: Locale,
): KingFinishedView {
  const m = messagesFor(locale).tournamentKing;
  const complete = game.gameTeams.filter(isCompleteKingTeam);
  const teamCount = complete.length;
  const { placed, unplaced, king } = kingFinalOrderOf(complete);
  const viewerTeam = viewerKingTeam(complete, game.viewerUserId);
  const podium: KingPodiumRow[] = [];
  if (king) {
    const viewerIsKing = king.id === viewerTeam?.id;
    podium.push({
      gameTeamId: king.id,
      place: 1,
      markName: king.members[0]?.name ?? "",
      isViewer: viewerIsKing,
      smallLine: m.finished.kingSmall,
      mainLine: viewerIsKing
        ? kingPairName(king.members, game.viewerUserId, locale)
        : kingFullNames(king.members),
      detailLine: m.finished.heldCourtOne,
    });
  }
  if (viewerTeam && viewerTeam.id !== king?.id) {
    const place = viewerTeam.finalPlace ?? null;
    podium.push({
      gameTeamId: viewerTeam.id,
      place,
      markName: viewerTeam.members[0]?.name ?? "",
      isViewer: true,
      smallLine: kingPairName(viewerTeam.members, game.viewerUserId, locale),
      mainLine:
        place != null
          ? m.finished.placeOf(place, teamCount)
          : m.finished.notPlaced,
      detailLine: viewerTeam.startCourt
        ? m.finished.startedOn(viewerTeam.startCourt)
        : null,
    });
  }
  return {
    name: game.name ?? m.shape.title,
    dateLine: game.windowStart
      ? m.finished.dateLine(formatAbsoluteDay(game.windowStart, locale))
      : null,
    summary: m.finished.summary(
      game.venue?.name ?? null,
      teamCount,
      kingDrawnCourtCount(game),
    ),
    podiumLabel: m.finished.podiumLabel,
    podium,
    table: [...placed, ...unplaced].map((team) => ({
      team,
      place: team.finalPlace ?? null,
      isViewer: team.id === viewerTeam?.id,
    })),
  };
}

/** A King of the court Game on the Played list: where the viewer finished and who was king. */
export type KingPlayedSummary = {
  posted: boolean;
  place: number | null;
  teamCount: number;
  courtCount: number;
  startCourt: number | null;
  viewerTeam: { markName: string; name: string };
  king: { markName: string; name: string; isViewer: boolean } | null;
};

export function kingPlayedSummary(
  game: Pick<KingGame, "teamsAllowed" | "gameTeams" | "viewerUserId"> & {
    finalOrderPostedAt?: Date | string | null;
  },
  locale: Locale,
): KingPlayedSummary | null {
  const complete = game.gameTeams.filter(isCompleteKingTeam);
  const viewerTeam = viewerKingTeam(complete, game.viewerUserId);
  if (!viewerTeam) {
    return null;
  }
  const posted = game.finalOrderPostedAt != null;
  const king = posted ? kingFinalOrderOf(complete).king : null;
  return {
    posted,
    place: posted ? (viewerTeam.finalPlace ?? null) : null,
    teamCount: complete.length,
    courtCount: kingDrawnCourtCount(game),
    startCourt: viewerTeam.startCourt ?? null,
    viewerTeam: {
      markName: viewerTeam.members[0]?.name ?? "",
      name: kingPairName(viewerTeam.members, game.viewerUserId, locale),
    },
    king: king
      ? {
          markName: king.members[0]?.name ?? "",
          name: kingFirstNames(king.members),
          isViewer: king.id === viewerTeam.id,
        }
      : null,
  };
}
