import { messagesFor } from "@repo/i18n/messages";
import type { Locale } from "@repo/i18n/locale";

import { formatGameDay } from "./format-game-start";
import { filsToMajorInput } from "./price-per-player";
import type { ResultMarkVariant } from "./result-mark";
import {
  americanoSlotsPerRound,
  americanoOutcome,
  type AmericanoOutcome,
  type AmericanoTableRow,
} from "./tournament-americano";
import type { TournamentShareCard } from "./tournament-finished";
import type { TournamentMatchState } from "./tournament-round-state";

export type AmericanoViewMatch = {
  roundNumber: number;
  courtName: string | null;
  startTime: Date | string | null;
  state: TournamentMatchState;
  slot1PlayerIds: readonly string[];
  slot2PlayerIds: readonly string[];
  slot1GamesWon: number | null;
  slot2GamesWon: number | null;
};

export type AmericanoViewerMatch<Match extends AmericanoViewMatch> = {
  match: Match;
  roundNumber: number;
  partnerId: string | null;
  opponentIds: readonly string[];
  /** The viewer's pair's games and the other pair's, once a score is in. */
  mine: number | null;
  theirs: number | null;
  /** Only a confirmed score has an outcome: it is what the table counts. */
  outcome: AmericanoOutcome | null;
};

/** The viewer's own Match in every Round, first Round first. */
export function viewerAmericanoMatches<Match extends AmericanoViewMatch>(
  matches: readonly Match[],
  viewerId: string | null,
): AmericanoViewerMatch<Match>[] {
  if (!viewerId) {
    return [];
  }
  return matches
    .flatMap((match) => {
      const slot = match.slot1PlayerIds.includes(viewerId)
        ? 1
        : match.slot2PlayerIds.includes(viewerId)
          ? 2
          : null;
      if (slot == null) {
        return [];
      }
      const pair = slot === 1 ? match.slot1PlayerIds : match.slot2PlayerIds;
      const opponents =
        slot === 1 ? match.slot2PlayerIds : match.slot1PlayerIds;
      const mine = slot === 1 ? match.slot1GamesWon : match.slot2GamesWon;
      const theirs = slot === 1 ? match.slot2GamesWon : match.slot1GamesWon;
      return [
        {
          match,
          roundNumber: match.roundNumber,
          partnerId: pair.find((player) => player !== viewerId) ?? null,
          opponentIds: opponents,
          mine,
          theirs,
          outcome:
            match.state === "confirmed" && mine != null && theirs != null
              ? americanoOutcome(mine, theirs)
              : null,
        },
      ];
    })
    .sort((left, right) => left.roundNumber - right.roundNumber);
}

/** The Match to show first: the viewer's in the Round on court, else their next. */
export function viewerAmericanoFocus<Match extends AmericanoViewMatch>(
  games: readonly AmericanoViewerMatch<Match>[],
  currentRoundNumber: number | null,
) {
  const live = games.find(
    (game) =>
      game.roundNumber === currentRoundNumber &&
      game.match.state !== "confirmed" &&
      game.match.state !== "cancelled",
  );
  if (live) {
    return live;
  }
  return (
    games.find(
      (game) =>
        game.match.state === "scheduled" ||
        game.match.state === "on_court" ||
        game.match.state === "awaiting_confirmation",
    ) ?? null
  );
}

export type AmericanoPlayedSummary = {
  finished: boolean;
  place: number | null;
  playerCount: number;
  roundCount: number;
  matchMinutes: number;
  gamesWon: number;
  partnerCount: number;
  /** The viewer's Matches in Round order: an outcome once confirmed, else null. */
  results: (AmericanoOutcome | null)[];
  viewer: { markName: string };
  winner: {
    markName: string;
    name: string;
    gamesWon: number;
    isViewer: boolean;
  } | null;
};

/** One Played card for the whole day: where the viewer finished and who won it. */
export function americanoPlayedSummary(input: {
  players: readonly { gamePlayerId: string; name: string }[];
  matches: readonly AmericanoViewMatch[];
  table: readonly AmericanoTableRow[];
  viewerGamePlayerId: string;
  roundCount: number;
  matchMinutes: number;
  finished: boolean;
}): AmericanoPlayedSummary | null {
  const nameOf = (gamePlayerId: string) =>
    input.players.find((player) => player.gamePlayerId === gamePlayerId)
      ?.name ?? "";
  const viewerRow = input.table.find(
    (row) => row.playerId === input.viewerGamePlayerId,
  );
  if (!viewerRow) {
    return null;
  }
  const played = viewerAmericanoMatches(
    input.matches,
    input.viewerGamePlayerId,
  );
  const top = input.table[0];
  return {
    finished: input.finished,
    place: input.finished ? viewerRow.place : null,
    playerCount: input.players.length,
    roundCount: input.roundCount,
    matchMinutes: input.matchMinutes,
    gamesWon: viewerRow.gamesWon,
    partnerCount: new Set(
      played.flatMap((entry) => (entry.partnerId ? [entry.partnerId] : [])),
    ).size,
    results: played.map((entry) => entry.outcome),
    viewer: { markName: nameOf(input.viewerGamePlayerId) },
    winner:
      input.finished && top
        ? {
            markName: nameOf(top.playerId),
            name: nameOf(top.playerId),
            gamesWon: top.gamesWon,
            isViewer: top.playerId === input.viewerGamePlayerId,
          }
        : null,
  };
}

/** 2a: players, Rounds and what each player pays. */
export function americanoHeroStats(
  game: {
    playersAllowed: number | null;
    roundCount: number | null;
    matchMinutes: number | null;
    pricePerPlayerFils: number | null;
  },
  locale: Locale,
): { value: string; label: string }[] {
  const messages = messagesFor(locale);
  const m = messages.tournamentAmericano.hero;
  const stats = [
    { value: String(game.playersAllowed ?? 0), label: m.players },
    {
      value: String(game.roundCount ?? 0),
      label: m.rounds(game.matchMinutes ?? 0),
    },
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

/** When each Round starts before they are made: back to back from the start. */
export function americanoRoundStarts(input: {
  windowStart: Date | string | null;
  roundCount: number;
  matchMinutes: number | null;
  players: number;
  recordedCourts: number;
}): { roundNumber: number; start: Date }[] {
  if (!input.windowStart || !input.matchMinutes || input.roundCount < 1) {
    return [];
  }
  const start = new Date(input.windowStart).getTime();
  const step =
    input.matchMinutes *
    americanoSlotsPerRound(input.players, input.recordedCourts) *
    60 *
    1000;
  return Array.from({ length: input.roundCount }, (_, index) => ({
    roundNumber: index + 1,
    start: new Date(start + index * step),
  }));
}

/** 4b: the one Played card for the whole day. */
export function americanoPlayedCardModel(
  game: {
    name: string | null;
    windowStart: Date | null;
    displayTime: Date;
    venue: { name: string };
    americano: AmericanoPlayedSummary;
  },
  locale: Locale,
) {
  const m = messagesFor(locale).tournamentAmericano;
  const day = game.americano;
  return {
    headline:
      day.place != null
        ? m.played.finished(day.place, day.playerCount)
        : m.played.toCome,
    place: day.place,
    day: formatGameDay(game.windowStart ?? game.displayTime, locale, {
      weekday: "short",
    }),
    title: game.name ?? m.shape.title,
    summary: m.played.sub(
      game.venue.name,
      day.playerCount,
      day.roundCount,
      day.matchMinutes,
    ),
    viewerLine: m.played.youLine(day.gamesWon, day.partnerCount),
    winner: day.winner
      ? {
          markName: day.winner.markName,
          isViewer: day.winner.isViewer,
          line: m.played.wonBy(day.winner.name, day.winner.gamesWon),
          trailing: m.played.standings,
        }
      : null,
  };
}

/** "+7", "−2" or "0": a game difference as the table prints it. */
export function signedDifference(value: number) {
  if (value > 0) {
    return `+${value}`;
  }
  return value < 0 ? `−${Math.abs(value)}` : "0";
}

export function americanoResultMark(
  outcome: AmericanoOutcome | null,
): ResultMarkVariant {
  if (outcome === "drawn") {
    return "draw";
  }
  return outcome ?? "not-played";
}

const SHARE_TABLE_ROWS = 6;

/**
 * The square card a finished Americano shares: the viewer's place, games won
 * and results, or the top of the table for someone who did not play.
 */
export function americanoShareCard(
  input: {
    name: string | null;
    windowStart: Date | string | null;
    venueName: string | null;
    players: readonly { gamePlayerId: string; name: string }[];
    matches: readonly AmericanoViewMatch[];
    table: readonly AmericanoTableRow[];
    viewerGamePlayerId: string | null;
    finished: boolean;
  },
  locale: Locale,
): TournamentShareCard | null {
  if (!input.finished || input.table.length === 0) {
    return null;
  }
  const messages = messagesFor(locale);
  const m = messages.tournamentRounds.shareCard;
  const a = messages.tournamentAmericano;
  const name = input.name ?? a.shape.title;
  const nameOf = (gamePlayerId: string) =>
    input.players.find((player) => player.gamePlayerId === gamePlayerId)
      ?.name ?? "";
  const base = {
    tag: a.chip,
    eyebrow: m.eyebrow(
      name,
      input.windowStart ? formatGameDay(input.windowStart, locale) : null,
      input.venueName,
    ),
  };
  const viewer = input.table.find(
    (row) => row.playerId === input.viewerGamePlayerId,
  );
  if (viewer) {
    const placing = m.ordinal(viewer.place);
    const placingNote =
      viewer.place === 1 ? m.wonTheDay : a.share.ofPlayers(input.table.length);
    const placingLine = m.placingLine(placing, placingNote);
    const player = nameOf(viewer.playerId);
    return {
      ...base,
      kind: "placing",
      placing,
      placingNote,
      markName: player,
      team: player,
      record: a.share.record(
        viewer.gamesWon,
        viewer.won,
        viewer.drawn,
        viewer.lost,
      ),
      results: viewerAmericanoMatches(input.matches, viewer.playerId).map(
        (entry) => americanoResultMark(entry.outcome),
      ),
      imageLabel: m.imageLabel(placingLine, player),
      message: m.message(name, placingLine, player),
    };
  }
  const title = m.tableTitle;
  const rows = input.table.slice(0, SHARE_TABLE_ROWS).map((row) => ({
    place: String(row.place),
    markName: nameOf(row.playerId),
    team: nameOf(row.playerId),
    points: a.share.gamesWon(row.gamesWon),
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
      rows
        .map((row) => m.tableLine(row.place, row.team, row.points))
        .join("\n"),
    ),
  };
}
