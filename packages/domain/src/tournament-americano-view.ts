import { messagesFor } from "@repo/i18n/messages";
import type { Locale } from "@repo/i18n/locale";

import { formatGameDay } from "./format-game-start";
import { filsToMajorInput } from "./price-per-player";
import {
  americanoSlotsPerRound,
  americanoOutcome,
  type AmericanoOutcome,
  type AmericanoStanding,
} from "./tournament-americano";

export type AmericanoViewMatch = {
  roundNumber: number;
  courtName: string | null;
  startTime: Date | string | null;
  state: string;
  slot1PlayerIds: readonly string[];
  slot2PlayerIds: readonly string[];
  slot1GamesWon: number | null;
  slot2GamesWon: number | null;
};

export type AmericanoViewerGame<Match extends AmericanoViewMatch> = {
  match: Match;
  roundNumber: number;
  partnerId: string | null;
  opponentIds: readonly string[];
  /** The viewer's pair's games and the other pair's, once a score is in. */
  mine: number | null;
  theirs: number | null;
  /** Only a confirmed score has an outcome: it is what the Standings count. */
  outcome: AmericanoOutcome | null;
};

/** The viewer's own game in every Round, first Round first. */
export function viewerAmericanoGames<Match extends AmericanoViewMatch>(
  matches: readonly Match[],
  viewerId: string | null,
): AmericanoViewerGame<Match>[] {
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

/** The game to show first: the viewer's in the Round on court, else their next. */
export function viewerAmericanoFocus<Match extends AmericanoViewMatch>(
  games: readonly AmericanoViewerGame<Match>[],
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
  /** The viewer's games in Round order: an outcome once confirmed, else null. */
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
  standings: readonly AmericanoStanding[];
  viewerGamePlayerId: string;
  roundCount: number;
  matchMinutes: number;
  finished: boolean;
}): AmericanoPlayedSummary | null {
  const nameOf = (gamePlayerId: string) =>
    input.players.find((player) => player.gamePlayerId === gamePlayerId)
      ?.name ?? "";
  const viewerRow = input.standings.find(
    (row) => row.playerId === input.viewerGamePlayerId,
  );
  if (!viewerRow) {
    return null;
  }
  const games = viewerAmericanoGames(input.matches, input.viewerGamePlayerId);
  const top = input.standings[0];
  return {
    finished: input.finished,
    place: input.finished ? viewerRow.place : null,
    playerCount: input.players.length,
    roundCount: input.roundCount,
    matchMinutes: input.matchMinutes,
    gamesWon: viewerRow.gamesWon,
    partnerCount: new Set(
      games.flatMap((game) => (game.partnerId ? [game.partnerId] : [])),
    ).size,
    results: games.map((game) => game.outcome),
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
