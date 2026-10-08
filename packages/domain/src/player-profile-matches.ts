import { formatDayMonth } from "./format-game-start";
import type { LevelBand } from "./level-bands";
import { shortPlayerName } from "./player-name";
import type { MatchOutcome, ResultMarkVariant } from "./result-mark";
import { knockoutMatchRoundName } from "./tournament-knockout";

export type PlayerMatchPlayer = {
  userId: string;
  name: string;
  image: string | null;
  levelBand: LevelBand | null;
  level: string | null;
  provisional: boolean;
};

export type PlayerMatchGame = {
  name: string | null;
  format: string;
  groupName: string | null;
  roundNumber: number | null;
  knockoutRound: { round: number; roundCount: number } | null;
  venueName: string;
};

export type PlayerMatchRating = {
  levelBefore: number;
  levelAfter: number;
  bandBefore: LevelBand;
  bandAfter: LevelBand;
  levelChange: number;
};

/** One of the profile owner's Last 10 Matches, as `users.playerProfile` returns it. */
export type PlayerMatchInput = {
  matchId: string;
  gameId: string;
  playedAt: Date | string;
  outcome: MatchOutcome;
  game: PlayerMatchGame;
  ownerSlot: 1 | 2;
  slot1: PlayerMatchPlayer[];
  slot2: PlayerMatchPlayer[];
  sets: { slot1GamesWon: number; slot2GamesWon: number }[];
  rating: PlayerMatchRating | null;
  canOpenGame: boolean;
};

export type PlayerMatchRowView = {
  matchId: string;
  outcome: MatchOutcome;
  opponents: string;
  meta: string;
  sets: string[];
  delta: string | null;
  accessibilityLabel: string;
};

export type LastTenSummary = {
  record: string;
  marks: ResultMarkVariant[];
  ends: { newest: string; oldest: string } | null;
  seeAll: string | null;
};

export const LAST_TEN_SIZE = 10;
export const LAST_TEN_RECENT_ROWS = 3;

const OUTCOME_WORD: Record<MatchOutcome, string> = {
  won: "Won",
  lost: "Lost",
  draw: "Drew",
};

function nonBlank(value: string | null) {
  const trimmed = value?.trim();
  return trimmed === "" ? null : (trimmed ?? null);
}

function tournamentName(game: PlayerMatchGame) {
  return nonBlank(game.name) ?? "Friendly tournament";
}

export function playerMatchKindLabel(game: PlayerMatchGame) {
  if (game.format === "americano") {
    return "Americano";
  }
  if (game.format === "friendly_tournament") {
    if (game.knockoutRound) {
      const { round, roundCount } = game.knockoutRound;
      return `${tournamentName(game)}, ${knockoutMatchRoundName(round, roundCount)}`;
    }
    if (game.roundNumber != null) {
      return `${tournamentName(game)}, Round ${game.roundNumber}`;
    }
    return tournamentName(game);
  }
  return nonBlank(game.groupName) ?? "Friendly game";
}

/** One decimal with a true minus sign: "+0.1", "−0.1", "0.0". */
export function levelChangeLabel(levelChange: number) {
  const tenths = Math.round(levelChange * 10);
  if (tenths === 0) {
    return "0.0";
  }
  const magnitude = (Math.abs(tenths) / 10).toFixed(1);
  return tenths > 0 ? `+${magnitude}` : `−${magnitude}`;
}

/** "Last 10: +0.2" on the Level card, absent when no Match was rated. */
export function levelTrendLabel(trend: { levelChange: number } | null) {
  return trend ? `Last 10: ${levelChangeLabel(trend.levelChange)}` : null;
}

function ownerSets(match: PlayerMatchInput) {
  return match.sets.map((set) =>
    match.ownerSlot === 1
      ? { us: set.slot1GamesWon, them: set.slot2GamesWon }
      : { us: set.slot2GamesWon, them: set.slot1GamesWon },
  );
}

function opponentNames(match: PlayerMatchInput) {
  const opponents = match.ownerSlot === 1 ? match.slot2 : match.slot1;
  return opponents.map((player) => shortPlayerName(player.name));
}

function deltaWords(levelChange: number) {
  const label = levelChangeLabel(levelChange);
  if (label === "0.0") {
    return "rating unchanged";
  }
  return `rating ${levelChange > 0 ? "up" : "down"} ${label.slice(1)}`;
}

export function playerMatchRowView(
  match: PlayerMatchInput,
): PlayerMatchRowView {
  const names = opponentNames(match);
  const kind = playerMatchKindLabel(match.game);
  const sets = ownerSets(match).map((set) => `${set.us}–${set.them}`);
  const spoken = [
    names.length > 0
      ? `${OUTCOME_WORD[match.outcome]} against ${names.join(" and ")}`
      : OUTCOME_WORD[match.outcome],
    formatDayMonth(match.playedAt, { weekday: "long", month: "long" }),
    kind,
    sets.join(" "),
    match.rating ? deltaWords(match.rating.levelChange) : null,
  ];

  return {
    matchId: match.matchId,
    outcome: match.outcome,
    opponents: names.length > 0 ? `vs ${names.join(" & ")}` : "",
    meta: `${formatDayMonth(match.playedAt, { weekday: "short" })}, ${kind}`,
    sets,
    delta: match.rating ? levelChangeLabel(match.rating.levelChange) : null,
    accessibilityLabel: spoken.filter((part) => part).join(", "),
  };
}

function gamesWord(count: number) {
  return count === 1 ? "1 game" : `${count} games`;
}

/**
 * The Last 10 strip reads like Home's Recent form: newest on the left under
 * "Latest", the oldest Match's date on the right, hatched slots for the rest.
 */
export function lastTenSummary(
  matches: readonly Pick<PlayerMatchInput, "outcome" | "playedAt">[],
): LastTenSummary {
  const shown = matches.slice(0, LAST_TEN_SIZE);
  const count = (outcome: MatchOutcome) =>
    shown.filter((match) => match.outcome === outcome).length;
  const drawn = count("draw");
  const oldest = shown.at(-1);

  return {
    record:
      shown.length === 0
        ? "No games yet."
        : `${count("won")} won, ${count("lost")} lost${drawn > 0 ? `, ${drawn} drawn` : ""}`,
    marks: [
      ...shown.map((match) => match.outcome),
      ...Array.from(
        { length: LAST_TEN_SIZE - shown.length },
        () => "not-played" as const,
      ),
    ],
    ends: oldest
      ? {
          newest: "Latest",
          oldest: formatDayMonth(oldest.playedAt, { weekday: "short" }),
        }
      : null,
    seeAll: shown.length > 0 ? `See all ${gamesWord(shown.length)}` : null,
  };
}
