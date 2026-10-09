import { formatDayMonth } from "./format-game-start";
import { formatLevel } from "./level";
import { displayLabelFromStoredBand, type LevelBand } from "./level-bands";
import { shortPlayerName } from "./player-name";
import {
  RESULT_MARK_LABEL,
  type MatchOutcome,
  type ResultMarkVariant,
} from "./result-mark";
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
  partnerVenue: string;
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

function ownerTeam(match: PlayerMatchInput) {
  return match.ownerSlot === 1 ? match.slot1 : match.slot2;
}

function opponentTeam(match: PlayerMatchInput) {
  return match.ownerSlot === 1 ? match.slot2 : match.slot1;
}

function opponentNames(match: PlayerMatchInput) {
  return opponentTeam(match).map((player) => shortPlayerName(player.name));
}

/** "with Jonas B, Padelhuset Bromma"; just the Venue when no partner sat. */
function partnerVenueLine(match: PlayerMatchInput, ownerId: string) {
  const partners = ownerTeam(match)
    .filter((player) => player.userId !== ownerId)
    .map((player) => shortPlayerName(player.name));
  const venue = match.game.venueName;
  return partners.length > 0 ? `with ${partners.join(" & ")}, ${venue}` : venue;
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
  ownerId: string,
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
    partnerVenue: partnerVenueLine(match, ownerId),
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

export type LastTenFilter = "all" | "won" | "lost";

export type LastTenFilterChip = {
  filter: LastTenFilter;
  label: string;
  count: number;
};

export const LAST_TEN_FILTER_EMPTY = "No games here.";

/**
 * The Last 10 screen's chips and rows. Counts come from the data, and a draw
 * shows under All only.
 */
export function filterLastTen<T extends { outcome: MatchOutcome }>(
  matches: readonly T[],
  filter: LastTenFilter,
): { chips: LastTenFilterChip[]; matches: T[]; empty: string | null } {
  const shown = matches.slice(0, LAST_TEN_SIZE);
  const won = shown.filter((match) => match.outcome === "won");
  const lost = shown.filter((match) => match.outcome === "lost");
  const filtered = filter === "won" ? won : filter === "lost" ? lost : shown;

  return {
    chips: [
      { filter: "all", label: `All ${shown.length}`, count: shown.length },
      { filter: "won", label: `Won ${won.length}`, count: won.length },
      { filter: "lost", label: `Lost ${lost.length}`, count: lost.length },
    ],
    matches: filtered,
    empty: filtered.length === 0 ? LAST_TEN_FILTER_EMPTY : null,
  };
}

export type PlayerMatchSheetPlayer = {
  userId: string;
  name: string;
  image: string | null;
  /** "B 4.2", or null for the hatched placeholder while Provisional or unrated. */
  level: string | null;
  accessibilityLabel: string;
};

export type PlayerMatchSheetTeam = {
  players: PlayerMatchSheetPlayer[];
  /** One chip per scored Set; `won` draws it ink, otherwise `wash`. */
  sets: { games: number; won: boolean }[];
};

export type PlayerMatchSheetView = {
  matchId: string;
  gameId: string;
  title: string;
  subtitle: string;
  outcome: MatchOutcome;
  badge: string;
  teams: [PlayerMatchSheetTeam, PlayerMatchSheetTeam];
  rating: {
    label: string;
    before: string;
    after: string;
    delta: string;
    accessibilityLabel: string;
  } | null;
  canOpenGame: boolean;
};

export const OPEN_GAME_ACTION = "Open game";

function sheetPlayer(player: PlayerMatchPlayer): PlayerMatchSheetPlayer {
  const level =
    player.levelBand && player.level != null && !player.provisional
      ? `${displayLabelFromStoredBand(player.levelBand)} ${player.level}`
      : null;
  return {
    userId: player.userId,
    name: player.name,
    image: player.image,
    level,
    accessibilityLabel: level
      ? `${player.name}, Level ${level}`
      : `${player.name}, Level still Provisional`,
  };
}

function bandLevel(band: LevelBand, level: number) {
  return `${displayLabelFromStoredBand(band)} ${formatLevel(level)}`;
}

function sheetRating(rating: PlayerMatchRating, ownerName: string) {
  const label = `${shortPlayerName(ownerName)}'s rating`;
  const before = bandLevel(rating.bandBefore, rating.levelBefore);
  const after = bandLevel(rating.bandAfter, rating.levelAfter);
  return {
    label,
    before,
    after,
    delta: levelChangeLabel(rating.levelChange),
    accessibilityLabel: `${label}, ${before} to ${after}, ${deltaWords(rating.levelChange)}`,
  };
}

/** 09d: the Match sheet, with the profile owner's team first. */
export function playerMatchSheetView(
  match: PlayerMatchInput,
  ownerName: string,
): PlayerMatchSheetView {
  const sets = ownerSets(match);

  return {
    matchId: match.matchId,
    gameId: match.gameId,
    title: playerMatchKindLabel(match.game),
    subtitle: `${formatDayMonth(match.playedAt, { weekday: "short" })}, ${match.game.venueName}`,
    outcome: match.outcome,
    badge: RESULT_MARK_LABEL[match.outcome],
    teams: [
      {
        players: ownerTeam(match).map(sheetPlayer),
        sets: sets.map((set) => ({ games: set.us, won: set.us > set.them })),
      },
      {
        players: opponentTeam(match).map(sheetPlayer),
        sets: sets.map((set) => ({ games: set.them, won: set.them > set.us })),
      },
    ],
    rating: match.rating ? sheetRating(match.rating, ownerName) : null,
    canOpenGame: match.canOpenGame,
  };
}
