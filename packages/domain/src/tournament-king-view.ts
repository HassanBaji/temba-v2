import { messagesFor } from "@repo/i18n/messages";
import type { Locale } from "@repo/i18n/locale";

import { formatAbsoluteDay, formatGameDay } from "./format-game-start";
import { filsToMajorInput } from "./price-per-player";
import type { TournamentShareCard } from "./tournament-finished";
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

/**
 * The teams of the day. Before the draw, the complete Game teams. Once the
 * courts are posted, the teams on a court that still have a player: a team
 * that lost a player after the draw keeps its court and its place.
 */
export function kingFieldTeams<Team extends KingViewTeam>(
  teams: readonly Team[],
): Team[] {
  const onCourt = teams.filter(
    (team) => team.startCourt != null && team.members.length > 0,
  );
  return onCourt.length > 0
    ? onCourt
    : teams.filter((team) => team.members.length === 2);
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
  const field = kingFieldTeams(game.gameTeams);
  const posted = startingCourtsOf(field);
  const last = posted[posted.length - 1]?.court ?? 0;
  return Math.max(last, kingCourtCount(field.length));
}

export type KingYourCourt = {
  court: number;
  opponent: KingViewTeam | null;
  win: { court: number; stays: boolean };
  lose: { court: number; stays: boolean };
};

/** Where the viewer's team starts, who it plays first, and where each result sends it. */
export function kingYourCourt(game: KingGame): KingYourCourt | null {
  const field = kingFieldTeams(game.gameTeams);
  const team = viewerKingTeam(field, game.viewerUserId);
  if (!team?.startCourt) {
    return null;
  }
  const courtCount = kingDrawnCourtCount(game);
  const moves = kingCourtMoves(team.startCourt, courtCount);
  const opponent =
    field.find(
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
  const field = kingFieldTeams(game.gameTeams);
  const viewerTeam = viewerKingTeam(field, game.viewerUserId);
  return startingCourtsOf(field).map((entry) => ({
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
  /** Every team of the day: the placed ones first, then those not placed. */
  order: { team: KingViewTeam; place: number | null; isViewer: boolean }[];
};

/** The finished screen: the king first, then the viewer's place, then the whole order. */
export function kingFinishedView(
  game: KingGame,
  locale: Locale,
): KingFinishedView {
  const m = messagesFor(locale).tournamentKing;
  const field = kingFieldTeams(game.gameTeams);
  const teamCount = field.length;
  const { placed, unplaced, king } = kingFinalOrderOf(field);
  const viewerTeam = viewerKingTeam(field, game.viewerUserId);
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
    order: [...placed, ...unplaced].map((team) => ({
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
  const field = kingFieldTeams(game.gameTeams);
  const viewerTeam = viewerKingTeam(field, game.viewerUserId);
  if (!viewerTeam) {
    return null;
  }
  const posted = game.finalOrderPostedAt != null;
  const king = posted ? kingFinalOrderOf(field).king : null;
  return {
    posted,
    place: posted ? (viewerTeam.finalPlace ?? null) : null,
    teamCount: field.length,
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

/** 2a: how many teams, how many courts, and what a player pays. */
export function kingHeroStats(
  game: {
    teamsAllowed: number | null;
    pricePerPlayerFils: number | null;
    sides: readonly unknown[];
  },
  locale: Locale,
): { value: string; label: string }[] {
  const messages = messagesFor(locale);
  const m = messages.tournamentKing.hero;
  const teamCount = game.teamsAllowed ?? game.sides.length;
  const stats = [
    { value: String(teamCount), label: m.teams },
    { value: String(kingCourtCount(teamCount)), label: m.courts },
  ];
  const fils = game.pricePerPlayerFils;
  if (fils != null) {
    stats.push(
      fils === 0
        ? { value: messages.createGame.price.free, label: m.entry }
        : {
            value: filsToMajorInput(fils),
            label: m.perPlayer(messages.createGame.price.currency),
          },
    );
  }
  return stats;
}

const SHARE_ORDER_ROWS = 6;

/**
 * The square card a finished King of the court shares: the viewer's place
 * when they have one, else the top of the final order.
 */
export function kingShareCard(
  game: KingGame,
  locale: Locale,
): TournamentShareCard | null {
  const messages = messagesFor(locale);
  const k = messages.tournamentKing;
  const m = messages.tournamentRounds.shareCard;
  const field = kingFieldTeams(game.gameTeams);
  const { placed } = kingFinalOrderOf(field);
  if (placed.length === 0) {
    return null;
  }
  const name = game.name ?? k.shape.title;
  const base = {
    tag: k.shape.title,
    eyebrow: m.eyebrow(
      name,
      game.windowStart ? formatGameDay(game.windowStart, locale) : null,
      game.venue?.name ?? null,
    ),
  };
  const viewerTeam = viewerKingTeam(field, game.viewerUserId);
  if (viewerTeam?.finalPlace != null) {
    const placing = m.ordinal(viewerTeam.finalPlace);
    const placingNote =
      viewerTeam.finalPlace === 1
        ? k.finished.kingSmall
        : m.ofTeams(field.length);
    const placingLine = m.placingLine(placing, placingNote);
    const team = kingFullNames(viewerTeam.members);
    return {
      ...base,
      kind: "placing",
      placing,
      placingNote,
      markName: viewerTeam.members[0]?.name ?? "",
      team,
      record: null,
      results: [],
      imageLabel: m.imageLabel(placingLine, team),
      message: m.message(name, placingLine, team),
    };
  }
  const title = k.finalOrder.title;
  const rows = placed.slice(0, SHARE_ORDER_ROWS).map((team) => ({
    place: String(team.finalPlace),
    markName: team.members[0]?.name ?? "",
    team: kingFullNames(team.members),
    points: null,
    isViewer: false,
  }));
  return {
    ...base,
    kind: "table",
    title,
    rows,
    imageLabel: m.tableImageLabel(name, title),
    message: m.tableMessage(
      name,
      title,
      rows.map((row) => m.tableLine(row.place, row.team, null)).join("\n"),
    ),
  };
}

type KingPlayedGame = {
  name: string | null;
  windowStart: Date | null;
  displayTime: Date;
  venue: { name: string };
  kingOfTheCourt: KingPlayedSummary;
};

/** The Played card's lines, the same in the web and mobile Apps. */
export function kingPlayedCardModel(game: KingPlayedGame, locale: Locale) {
  const m = messagesFor(locale).tournamentKing;
  const king = game.kingOfTheCourt;
  return {
    headline: !king.posted
      ? m.card.toCome
      : king.place != null
        ? m.card.finishedPlace(king.place, king.teamCount)
        : m.card.notPlaced(king.teamCount),
    place: king.place,
    day: formatGameDay(game.windowStart ?? game.displayTime, locale, {
      weekday: "short",
    }),
    title: game.name ?? m.shape.title,
    summary: m.finished.summary(
      game.venue.name,
      king.teamCount,
      king.courtCount,
    ),
    viewerTeam: king.viewerTeam,
    startedLine:
      king.startCourt != null ? m.card.startedOn(king.startCourt) : null,
    king: king.king
      ? {
          ...king.king,
          label: m.card.kingOfTheCourt,
          trailing: m.card.finalOrder,
        }
      : null,
  };
}
