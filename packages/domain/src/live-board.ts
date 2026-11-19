import { latinDigits } from "@repo/i18n/digits";

import { isFootballGame } from "./game-shape";
import { isAmericano } from "./tournament-americano";
import {
  currentRoundNumber,
  type TournamentMatchState,
  type TournamentRoundState,
} from "./tournament-round-state";
import { hasKnockout, hasPools } from "./tournament-rounds";

export const LIVE_BOARD_SCREENS = ["on_court", "standings", "next_up"] as const;

export type LiveBoardScreen = (typeof LIVE_BOARD_SCREENS)[number];

export const LIVE_BOARD_THEMES = ["dark", "light"] as const;

export type LiveBoardTheme = (typeof LIVE_BOARD_THEMES)[number];

export const LIVE_BOARD_ROTATE_SECONDS = [5, 10, 20] as const;

export const LIVE_BOARD_DEFAULT_ROTATE_SECONDS = 10;

export const LIVE_BOARD_MESSAGE_MAX = 80;

export const LIVE_BOARD_TV_NAME_MAX = 40;

export const LIVE_BOARD_CODE_LENGTH = 6;

/** A board closes on its own this long after the Game's window ends. */
export const LIVE_BOARD_CLOSES_AFTER_HOURS = 6;

export type LiveBoardKind = "social" | "padel_match" | "football";

/**
 * What a Game's Live board shows, or null when it has none: a Social with
 * Rounds and a table rotates three Board screens, a Friendly game or a
 * football Game shows one scoreboard. A Knockout and King of the court have
 * no board yet.
 */
export function liveBoardKind(game: {
  format: string;
  sport?: string | null;
  poolCount?: number | null;
  tournamentShape?: string | null;
}): LiveBoardKind | null {
  if (isFootballGame(game)) {
    return "football";
  }
  if (game.format === "friendly_game") {
    return "padel_match";
  }
  if (isAmericano(game.format, game.tournamentShape)) {
    return "social";
  }
  if (
    hasPools(game.format, game.poolCount) &&
    !hasKnockout(game.format, game.tournamentShape)
  ) {
    return "social";
  }
  return null;
}

export function liveBoardClosesAt(windowEnd: Date | string): Date {
  return new Date(
    new Date(windowEnd).getTime() +
      LIVE_BOARD_CLOSES_AFTER_HOURS * 60 * 60 * 1000,
  );
}

export function isLiveBoardOpen(
  board: {
    stoppedAt: Date | string | null;
    gameCancelledAt: Date | string | null;
    windowEnd: Date | string | null;
  },
  now: Date,
) {
  return (
    board.stoppedAt == null &&
    board.gameCancelledAt == null &&
    (board.windowEnd == null || now < liveBoardClosesAt(board.windowEnd))
  );
}

/** "482913" reads "482 913", the way it is typed on a TV remote. */
export function formatBoardCode(code: string) {
  const half = Math.ceil(code.length / 2);
  return `${code.slice(0, half)} ${code.slice(half)}`;
}

/** Six digits however they were typed: spaced, dashed or in Arabic digits. */
export function parseBoardCode(raw: string): string | null {
  const digits = latinDigits(raw).replace(/[\s-]/g, "");
  return new RegExp(`^\\d{${LIVE_BOARD_CODE_LENGTH}}$`).test(digits)
    ? digits
    : null;
}

export function isRotateSeconds(value: number) {
  return LIVE_BOARD_ROTATE_SECONDS.some((seconds) => seconds === value);
}

export function normalizeBoardMessage(value: string | null | undefined) {
  const text = (value ?? "").replace(/\s+/g, " ").trim();
  return text.length === 0 ? null : text.slice(0, LIVE_BOARD_MESSAGE_MAX);
}

export type LiveBoardRotation = {
  rotate: boolean;
  rotateSeconds: number;
  heldScreen: LiveBoardScreen;
  rotationStartedAt: Date | string;
};

export type LiveBoardScene = {
  screen: LiveBoardScreen;
  /** The screen the rotation shows next; null while one screen is held. */
  next: LiveBoardScreen | null;
  secondsToNext: number | null;
  /** Counts up each time a list too long for one screen should turn its page. */
  turn: number;
};

/**
 * The Board screen on show at `now`. Every TV and the control read the same
 * rotation start, so they agree without talking to each other.
 */
export function liveBoardScene(
  rotation: LiveBoardRotation,
  now: Date,
): LiveBoardScene {
  const seconds = Math.max(1, rotation.rotateSeconds);
  const elapsed = Math.max(
    0,
    Math.floor(
      (now.getTime() - new Date(rotation.rotationStartedAt).getTime()) / 1000,
    ),
  );
  const step = Math.floor(elapsed / seconds);
  if (!rotation.rotate) {
    return {
      screen: rotation.heldScreen,
      next: null,
      secondsToNext: null,
      turn: step,
    };
  }
  const index = step % LIVE_BOARD_SCREENS.length;
  return {
    screen: LIVE_BOARD_SCREENS[index]!,
    next: LIVE_BOARD_SCREENS[(index + 1) % LIVE_BOARD_SCREENS.length]!,
    secondsToNext: seconds - (elapsed % seconds),
    turn: Math.floor(step / LIVE_BOARD_SCREENS.length),
  };
}

/** One page of a list that does not fit a screen; the page follows `turn`. */
export function boardPage<T>(items: readonly T[], size: number, turn: number) {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const page = ((turn % pages) + pages) % pages;
  return {
    items: items.slice(page * size, page * size + size),
    page,
    pages,
  };
}

export function boardFirstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

/** "Layla & Nora": first names only, so a pair stays on one line at a distance. */
export function boardSideLabel(players: readonly string[], joiner: string) {
  return players.map(boardFirstName).join(joiner);
}

export type LiveBoardSide = {
  id: string;
  players: string[];
};

export type LiveBoardMatch = {
  id: string;
  courtName: string | null;
  startTime: Date | null;
  state: TournamentMatchState;
  side1: LiveBoardSide;
  side2: LiveBoardSide;
  score1: number | null;
  score2: number | null;
};

export type LiveBoardRound = {
  roundNumber: number;
  state: TournamentRoundState;
  startTime: Date | null;
  matches: LiveBoardMatch[];
};

export type LiveBoardRoundMark = "won" | "lost" | "drawn" | "none";

export type LiveBoardTableRow = {
  id: string;
  players: string[];
  place: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gamesFor: number;
  gamesAgainst: number;
  difference: number;
  points: number;
  /** One mark per Round of the schedule, in Round order. */
  rounds: LiveBoardRoundMark[];
};

export type LiveBoardTable = {
  /** Null when the Social has one table. */
  poolIndex: number | null;
  rows: LiveBoardTableRow[];
};

export type SocialBoardContent = {
  kind: "social";
  /** An Americano ranks players on games won; every other Social ranks teams on points. */
  ranks: "teams" | "players";
  roundCount: number;
  matchMinutes: number;
  rounds: LiveBoardRound[];
  tables: LiveBoardTable[];
  finished: boolean;
  finishedAt: Date | null;
};

export type PadelBoardPlayer = {
  name: string;
  levelBand: string | null;
};

export type PadelMatchBoardContent = {
  kind: "padel_match";
  sides: [PadelBoardPlayer[], PadelBoardPlayer[]];
  sets: { score1: number | null; score2: number | null }[];
  completed: boolean;
  courtName: string | null;
  ratingScope: "temba" | "group" | "unrated";
};

export type FootballBoardRole = "gk" | "def" | "mid" | "fwd";

export type FootballBoardSide = {
  bib: string | null;
  goals: number | null;
  players: { name: string; role: FootballBoardRole | null }[];
  scorers: { name: string; goals: number }[];
};

export type FootballBoardContent = {
  kind: "football";
  /** Null until the Organizer publishes the two Football sides. */
  sides: [FootballBoardSide, FootballBoardSide] | null;
  completed: boolean;
  courtName: string | null;
  sideSize: number | null;
  playersAllowed: number | null;
  mvpName: string | null;
  hasMvp: boolean;
};

export type LiveBoardContent =
  | SocialBoardContent
  | PadelMatchBoardContent
  | FootballBoardContent;

export type LiveBoardPhase = "waiting" | "live" | "final";

export type SocialBoardClock =
  | { kind: "left"; seconds: number }
  | { kind: "starts"; seconds: number };

export type SocialBoardView = {
  phase: LiveBoardPhase;
  /** The Round on court, or the next one to start. */
  current: LiveBoardRound | null;
  next: LiveBoardRound | null;
  then: LiveBoardRound | null;
  /** The last Round the table counts; 0 before any Round is played. */
  tableAfterRound: number;
  clock: SocialBoardClock | null;
};

function hasMatches(round: LiveBoardRound) {
  return round.matches.length > 0;
}

function roundEndsAt(round: LiveBoardRound, matchMinutes: number) {
  const starts = round.matches.flatMap((match) =>
    match.startTime ? [new Date(match.startTime).getTime()] : [],
  );
  if (starts.length === 0) {
    return null;
  }
  return Math.max(...starts) + matchMinutes * 60 * 1000;
}

function secondsBetween(from: number, to: number) {
  return Math.max(0, Math.ceil((to - from) / 1000));
}

function socialBoardClock(
  round: LiveBoardRound | null,
  matchMinutes: number,
  now: Date,
): SocialBoardClock | null {
  if (!round || round.state === "played" || round.state === "cancelled") {
    return null;
  }
  if (round.state === "scheduled") {
    return round.startTime
      ? {
          kind: "starts",
          seconds: secondsBetween(
            now.getTime(),
            new Date(round.startTime).getTime(),
          ),
        }
      : null;
  }
  const endsAt = roundEndsAt(round, matchMinutes);
  return endsAt == null
    ? null
    : { kind: "left", seconds: secondsBetween(now.getTime(), endsAt) };
}

/**
 * Which Rounds a Social's board shows and what its clock counts. The table
 * counts finished Rounds only, so it says which Round it is after.
 */
export function socialBoardView(
  content: SocialBoardContent,
  now: Date,
): SocialBoardView {
  const rounds = [...content.rounds].sort(
    (left, right) => left.roundNumber - right.roundNumber,
  );
  const tableAfterRound = rounds
    .filter((round) => round.state === "played")
    .reduce((last, round) => Math.max(last, round.roundNumber), 0);
  const currentNumber = currentRoundNumber(rounds.filter(hasMatches));
  const current =
    rounds.find((round) => round.roundNumber === currentNumber) ?? null;
  if (!current) {
    return {
      phase: content.finished ? "final" : "waiting",
      current: null,
      next: null,
      then: null,
      tableAfterRound,
      clock: null,
    };
  }
  const upcoming = rounds.filter(
    (round) =>
      round.roundNumber > current.roundNumber && round.state !== "cancelled",
  );
  return {
    phase: content.finished ? "final" : "live",
    current,
    next: upcoming[0] ?? null,
    then: upcoming[1] ?? null,
    tableAfterRound,
    clock: content.finished
      ? null
      : socialBoardClock(current, content.matchMinutes, now),
  };
}

/** "11:38" for a round clock; an hour or more reads "1:05:00". */
export function formatBoardClock(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = String(seconds % 60).padStart(2, "0");
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${rest}`
    : `${minutes}:${rest}`;
}

/** The lead a side holds on a court: the trailing side is drawn quieter. */
export function boardScoreLead(
  score1: number | null,
  score2: number | null,
): "side1" | "side2" | "level" | "none" {
  if (score1 == null || score2 == null) {
    return "none";
  }
  if (score1 === score2) {
    return "level";
  }
  return score1 > score2 ? "side1" : "side2";
}

export type PadelBoardSetState = "side1" | "side2" | "level" | "in_play";

export type PadelBoardSet = {
  score1: number | null;
  score2: number | null;
  state: PadelBoardSetState;
};

function isFinishedPadelSet(score1: number, score2: number) {
  const high = Math.max(score1, score2);
  return high >= 7 || (high >= 6 && Math.abs(score1 - score2) >= 2);
}

/**
 * A padel Match's Sets in the win, loss and not yet language. Only the last
 * Set of an open Match can be in play: 4-3 saved mid-set is not a Set won.
 */
export function padelBoardSets(
  sets: PadelMatchBoardContent["sets"],
  completed: boolean,
): PadelBoardSet[] {
  return sets.map((set, index) => {
    const { score1, score2 } = set;
    if (score1 == null || score2 == null) {
      return { score1, score2, state: "in_play" };
    }
    const open =
      !completed &&
      index === sets.length - 1 &&
      !isFinishedPadelSet(score1, score2);
    if (open) {
      return { score1, score2, state: "in_play" };
    }
    if (score1 === score2) {
      return { score1, score2, state: "level" };
    }
    return { score1, score2, state: score1 > score2 ? "side1" : "side2" };
  });
}

export function padelBoardSetsWon(sets: readonly PadelBoardSet[]) {
  return {
    side1: sets.filter((set) => set.state === "side1").length,
    side2: sets.filter((set) => set.state === "side2").length,
  };
}

/** A one-Match board before its start, during it, and once the score is final. */
export function matchBoardPhase(args: {
  windowStart: Date | string;
  completed: boolean;
  ready: boolean;
  now: Date;
}): LiveBoardPhase {
  if (args.completed) {
    return "final";
  }
  return args.ready && new Date(args.windowStart) <= args.now
    ? "live"
    : "waiting";
}

/** Whole minutes since the start, held at the window's length once it ends. */
export function boardMinutesPlayed(
  windowStart: Date | string,
  windowEnd: Date | string,
  now: Date,
) {
  const start = new Date(windowStart).getTime();
  const end = new Date(windowEnd).getTime();
  const until = Math.min(now.getTime(), end);
  return Math.max(0, Math.floor((until - start) / 60000));
}

/** "1:12" of match time: hours and minutes since the start. */
export function formatBoardMatchTime(minutes: number) {
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
}
