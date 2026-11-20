import { latinDigits } from "@repo/i18n/digits";

import { firstName } from "./game-card";
import { isFootballGame } from "./game-shape";
import { isAmericano } from "./tournament-americano";
import {
  currentRoundNumber,
  type TournamentMatchState,
  type TournamentRoundState,
} from "./tournament-round-state";
import { hasKnockout, hasPools } from "./tournament-rounds";

/** The three Board screens of a Social, in rotation order. Product copy calls `table` Standings. */
export const LIVE_BOARD_SCREENS = ["on_court", "table", "next_up"] as const;

export type LiveBoardScreen = (typeof LIVE_BOARD_SCREENS)[number];

export const LIVE_BOARD_COLOR_SCHEMES = ["dark", "light"] as const;

export type LiveBoardColorScheme = (typeof LIVE_BOARD_COLOR_SCHEMES)[number];

export const LIVE_BOARD_ROTATE_SECONDS = [5, 10, 20] as const;

export const LIVE_BOARD_MESSAGE_MAX = 80;

export const LIVE_BOARD_TV_NAME_MAX = 40;

export const LIVE_BOARD_CODE_LENGTH = 6;

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

export type BoardScreenOnShow = {
  screen: LiveBoardScreen;
  /** The screen the rotation shows next; null while one screen is held. */
  next: LiveBoardScreen | null;
  secondsToNext: number | null;
  /** Counts up each time a list too long for one screen should turn its page. */
  turn: number;
};

/**
 * The Board screen on show at `now`, out of the screens that have something
 * to show. Every TV and the control read the same rotation start, so they
 * agree without talking to each other. A held screen with nothing to show
 * gives way to On court.
 */
export function boardScreenOnShow(
  rotation: LiveBoardRotation,
  now: Date,
  screens: readonly LiveBoardScreen[] = LIVE_BOARD_SCREENS,
): BoardScreenOnShow {
  const shown = screens.length > 0 ? screens : LIVE_BOARD_SCREENS;
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
      screen: shown.includes(rotation.heldScreen)
        ? rotation.heldScreen
        : shown[0]!,
      next: null,
      secondsToNext: null,
      turn: step,
    };
  }
  const index = step % shown.length;
  return {
    screen: shown[index]!,
    next: shown.length > 1 ? shown[(index + 1) % shown.length]! : null,
    secondsToNext: shown.length > 1 ? seconds - (elapsed % seconds) : null,
    turn: Math.floor(step / shown.length),
  };
}

export type BoardRotationChange = {
  rotate?: boolean;
  rotateSeconds?: number;
  heldScreen?: LiveBoardScreen;
};

/**
 * What a change from the board control does to the rotation, or null when it
 * leaves the rotation alone. Showing a screen holds the board on it;
 * switching rotation off holds the screen on show; switching it on, or
 * changing its pace, starts again from On court on every TV at once.
 */
export function changeBoardRotation(
  rotation: LiveBoardRotation,
  change: BoardRotationChange,
  now: Date,
  screens: readonly LiveBoardScreen[] = LIVE_BOARD_SCREENS,
): (LiveBoardRotation & { rotationStartedAt: Date }) | null {
  if (
    change.rotate === undefined &&
    change.rotateSeconds === undefined &&
    change.heldScreen === undefined
  ) {
    return null;
  }
  const heldScreen =
    change.heldScreen ??
    (change.rotate === false && rotation.rotate
      ? boardScreenOnShow(rotation, now, screens).screen
      : rotation.heldScreen);
  return {
    rotate: change.rotate ?? (change.heldScreen ? false : rotation.rotate),
    rotateSeconds: change.rotateSeconds ?? rotation.rotateSeconds,
    heldScreen,
    rotationStartedAt: now,
  };
}

export type LiveBoardOnShow =
  | { kind: "scoreboard" }
  | { kind: "waiting" }
  | { kind: "final" }
  | ({ kind: "screen" } & BoardScreenOnShow);

/**
 * What a board's TVs show at `now`, for the control and the On TV card: a
 * one-Match board's scoreboard, a Social waiting for its first Round or
 * stopped on its final table, or the Board screen the rotation is on. The
 * status is the API's reading of the Social (`phase` and `screens`).
 */
export function liveBoardOnShow(
  kind: LiveBoardKind,
  status: { phase: LiveBoardPhase; screens: LiveBoardScreen[] } | null,
  rotation: LiveBoardRotation,
  now: Date,
): LiveBoardOnShow {
  if (kind !== "social") {
    return { kind: "scoreboard" };
  }
  if (status?.phase === "waiting" || status?.phase === "final") {
    return { kind: status.phase };
  }
  return {
    kind: "screen",
    ...boardScreenOnShow(rotation, now, status?.screens),
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

/** "Layla & Nora": first names only, so a pair stays on one line at a distance. */
export function boardSideLabel(players: readonly string[], joiner: string) {
  return players.map(firstName).join(joiner);
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

export type PadelScoreboardPlayer = {
  name: string;
  levelBand: string | null;
};

export type PadelScoreboard = {
  kind: "padel_match";
  sides: [PadelScoreboardPlayer[], PadelScoreboardPlayer[]];
  sets: { score1: number | null; score2: number | null }[];
  completed: boolean;
  courtName: string | null;
  ratingScope: "temba" | "group" | "unrated";
};

export type FootballScoreboardRole = "gk" | "def" | "mid" | "fwd";

export type FootballScoreboardSide = {
  bib: string | null;
  goals: number | null;
  players: { name: string; role: FootballScoreboardRole | null }[];
  scorers: { name: string; goals: number }[];
};

export type FootballScoreboard = {
  kind: "football";
  /** Null until the Organizer publishes the two Football sides. */
  sides: [FootballScoreboardSide, FootballScoreboardSide] | null;
  completed: boolean;
  courtName: string | null;
  sideSize: number | null;
  playersAllowed: number | null;
  mvpName: string | null;
  hasMvp: boolean;
};

export type LiveBoardContent =
  | SocialBoardContent
  | PadelScoreboard
  | FootballScoreboard;

export type LiveBoardPhase = "waiting" | "live" | "final";

export type SocialBoardClock =
  | { kind: "left"; seconds: number }
  | { kind: "starts"; seconds: number }
  /** The Organizer paused the Round clock; the seconds left are held. */
  | { kind: "paused"; seconds: number }
  /** The Round waits for the Organizer to start it; the seconds are its full length. */
  | { kind: "ready"; seconds: number };

/**
 * A board's Round clock as the Organizer runs it. Off (`byHand` false), the
 * clock follows the posted schedule. On, a Round starts when the Organizer
 * starts it, and the clock is a stopwatch: the time banked before the last
 * pause, plus the time since it was last set running.
 */
export type LiveBoardRoundClock = {
  byHand: boolean;
  /** The Round the clock was started for. */
  roundNumber: number | null;
  startedAt: Date | null;
  /** Null while the clock is paused. */
  runningSince: Date | null;
  elapsedMs: number;
};

export const ROUND_CLOCK_ON_SCHEDULE: LiveBoardRoundClock = {
  byHand: false,
  roundNumber: null,
  startedAt: null,
  runningSince: null,
  elapsedMs: 0,
};

export const ROUND_CLOCK_ACTIONS = [
  "start",
  "pause",
  "resume",
  "by_hand",
  "schedule",
] as const;

export type RoundClockAction = (typeof ROUND_CLOCK_ACTIONS)[number];

/** What the posted schedule says of a Round: when it starts, or when it ends once under way. */
export type BoardRoundSchedule = {
  startsAt: Date | null;
  endsAt: Date | null;
};

/** The Round a board's clock runs for, as the control reads it. */
export type BoardClockRound = {
  roundNumber: number;
  lengthSeconds: number;
  schedule: BoardRoundSchedule;
};

export type SocialBoardView = {
  phase: LiveBoardPhase;
  /** The Round on court, or the next one to start. */
  current: LiveBoardRound | null;
  next: LiveBoardRound | null;
  then: LiveBoardRound | null;
  /** The last Round the table counts; 0 before any Round is played. */
  tableAfterRound: number;
  /** The Board screens with something to show, in rotation order. */
  screens: LiveBoardScreen[];
  clock: SocialBoardClock | null;
};

function hasMatches(round: LiveBoardRound) {
  return round.matches.length > 0;
}

function isSettledRound(round: LiveBoardRound) {
  return round.state === "played" || round.state === "cancelled";
}

function secondsBetween(from: number, to: number) {
  return Math.max(0, Math.ceil((to - from) / 1000));
}

export function boardRoundSchedule(
  round: LiveBoardRound,
  matchMinutes: number,
): BoardRoundSchedule {
  if (isSettledRound(round)) {
    return { startsAt: null, endsAt: null };
  }
  if (round.state === "scheduled") {
    return { startsAt: round.startTime, endsAt: null };
  }
  const starts = round.matches.flatMap((match) =>
    match.startTime ? [new Date(match.startTime).getTime()] : [],
  );
  return {
    startsAt: null,
    endsAt:
      starts.length === 0
        ? null
        : new Date(Math.max(...starts) + matchMinutes * 60 * 1000),
  };
}

function scheduleClock(
  schedule: BoardRoundSchedule,
  now: Date,
): SocialBoardClock | null {
  if (schedule.endsAt) {
    return {
      kind: "left",
      seconds: secondsBetween(now.getTime(), schedule.endsAt.getTime()),
    };
  }
  return schedule.startsAt
    ? {
        kind: "starts",
        seconds: secondsBetween(now.getTime(), schedule.startsAt.getTime()),
      }
    : null;
}

function isClockStartedFor(clock: LiveBoardRoundClock, roundNumber: number) {
  return clock.roundNumber === roundNumber && clock.startedAt != null;
}

/**
 * What a board's Round clock reads at `now`: the schedule's count while the
 * clock follows it, the Organizer's stopwatch once they run it by hand. By
 * hand, a Round the Organizer has not started reads its full length.
 */
export function boardRoundClock(
  clock: LiveBoardRoundClock,
  round: BoardClockRound,
  now: Date,
): SocialBoardClock | null {
  if (!clock.byHand) {
    return scheduleClock(round.schedule, now);
  }
  if (!isClockStartedFor(clock, round.roundNumber)) {
    return { kind: "ready", seconds: round.lengthSeconds };
  }
  const running = clock.runningSince
    ? Math.max(0, now.getTime() - clock.runningSince.getTime())
    : 0;
  const seconds = Math.max(
    0,
    Math.ceil((round.lengthSeconds * 1000 - clock.elapsedMs - running) / 1000),
  );
  return { kind: clock.runningSince ? "left" : "paused", seconds };
}

/** The schedule's count carried over when the Organizer takes the clock mid-Round. */
function takenFromSchedule(
  round: BoardClockRound,
  now: Date,
): LiveBoardRoundClock {
  const startedAt = round.schedule.endsAt
    ? new Date(round.schedule.endsAt.getTime() - round.lengthSeconds * 1000)
    : null;
  return startedAt && startedAt <= now
    ? {
        byHand: true,
        roundNumber: round.roundNumber,
        startedAt,
        runningSince: startedAt,
        elapsedMs: 0,
      }
    : { ...ROUND_CLOCK_ON_SCHEDULE, byHand: true };
}

/**
 * What a tap on the board control does to the Round clock, or null when it
 * changes nothing (pausing a clock that is not running, say), so two
 * Organizers tapping the same button do not undo each other. Starting,
 * pausing or resuming takes the clock off the schedule: from then on every
 * Round waits to be started, until the clock is handed back. Taking it while
 * the schedule's count is running keeps that count.
 */
export function changeRoundClock(
  clock: LiveBoardRoundClock,
  action: RoundClockAction,
  round: BoardClockRound,
  now: Date,
): LiveBoardRoundClock | null {
  if (action === "schedule") {
    return clock.byHand ? ROUND_CLOCK_ON_SCHEDULE : null;
  }
  if (action === "start") {
    return {
      byHand: true,
      roundNumber: round.roundNumber,
      startedAt: now,
      runningSince: now,
      elapsedMs: 0,
    };
  }
  const taken: LiveBoardRoundClock = clock.byHand
    ? clock
    : takenFromSchedule(round, now);
  if (action === "by_hand") {
    return clock.byHand ? null : taken;
  }
  if (!isClockStartedFor(taken, round.roundNumber)) {
    return null;
  }
  if (action === "pause") {
    return taken.runningSince
      ? {
          ...taken,
          runningSince: null,
          elapsedMs:
            taken.elapsedMs +
            Math.max(0, now.getTime() - taken.runningSince.getTime()),
        }
      : null;
  }
  return taken.runningSince ? null : { ...taken, runningSince: now };
}

const SCORED_MATCH_STATES: readonly TournamentMatchState[] = [
  "awaiting_confirmation",
  "confirmed",
  "not_finished",
];

/**
 * A Round as the board shows it while the Organizer runs the clock: on court
 * from the moment they start it, whatever its posted time, and waiting until
 * then. A Round with a score saved is on court either way, so a clock nobody
 * started never leaves the room reading "Soon" over a Round being played.
 */
function roundByHand(
  round: LiveBoardRound,
  clock: LiveBoardRoundClock,
): LiveBoardRound {
  if (isSettledRound(round)) {
    return round;
  }
  const started = isClockStartedFor(clock, round.roundNumber);
  if (
    !started &&
    round.matches.some((match) => SCORED_MATCH_STATES.includes(match.state))
  ) {
    return round;
  }
  return started
    ? {
        ...round,
        state: "on_court",
        startTime: clock.startedAt,
        matches: round.matches.map((match) =>
          match.state === "scheduled" ? { ...match, state: "on_court" } : match,
        ),
      }
    : {
        ...round,
        state: "scheduled",
        startTime: null,
        matches: round.matches.map((match) =>
          match.state === "scheduled" || match.state === "on_court"
            ? { ...match, state: "scheduled", startTime: null }
            : match,
        ),
      };
}

/**
 * The last Round a Social's table counts: the end of the unbroken run of
 * settled Rounds from Round 1. A Round still on court, and any Round after
 * it, waits, so the table never runs ahead of the Round it says it is after.
 */
export function boardTableRound(rounds: readonly LiveBoardRound[]) {
  let last = 0;
  for (const round of [...rounds].sort(
    (left, right) => left.roundNumber - right.roundNumber,
  )) {
    if (!isSettledRound(round)) {
      break;
    }
    last = round.roundNumber;
  }
  return last;
}

/**
 * A Social is over once every Round of its schedule is posted and settled,
 * a Match that did not finish included, and at least one Round was played.
 */
export function isSocialBoardFinished(rounds: readonly LiveBoardRound[]) {
  return (
    rounds.length > 0 &&
    rounds.every(isSettledRound) &&
    rounds.some((round) => round.state === "played")
  );
}

/**
 * Which Rounds a Social's board shows, which Board screens have something to
 * show and what its clock counts. Next up drops out of the rotation while
 * there is no next Round posted. With the Round clock run by hand, the Round
 * on court is read through it (`roundByHand`).
 */
export function socialBoardView(
  content: SocialBoardContent,
  now: Date,
  roundClock: LiveBoardRoundClock = ROUND_CLOCK_ON_SCHEDULE,
): SocialBoardView {
  const rounds = [...content.rounds].sort(
    (left, right) => left.roundNumber - right.roundNumber,
  );
  const tableAfterRound = boardTableRound(rounds);
  const currentNumber = currentRoundNumber(rounds.filter(hasMatches));
  const posted =
    rounds.find((round) => round.roundNumber === currentNumber) ?? null;
  if (!posted) {
    return {
      phase: content.finished ? "final" : "waiting",
      current: null,
      next: null,
      then: null,
      tableAfterRound,
      screens: [],
      clock: null,
    };
  }
  const upcoming = rounds.filter(
    (round) =>
      round.roundNumber > posted.roundNumber && round.state !== "cancelled",
  );
  const next = upcoming[0] ?? null;
  const current = roundClock.byHand ? roundByHand(posted, roundClock) : posted;
  const over = content.finished || isSettledRound(posted);
  // By hand, a Round on court that nobody started has no clock to show.
  const unstarted =
    roundClock.byHand &&
    current.state !== "scheduled" &&
    !isClockStartedFor(roundClock, current.roundNumber);
  return {
    phase: content.finished ? "final" : "live",
    current,
    next,
    then: upcoming[1] ?? null,
    tableAfterRound,
    screens: LIVE_BOARD_SCREENS.filter(
      (screen) => screen !== "next_up" || (next?.matches.length ?? 0) > 0,
    ),
    clock:
      over || unstarted
        ? null
        : boardRoundClock(
            roundClock,
            boardClockRound(posted, content.matchMinutes),
            now,
          ),
  };
}

/** The Round on court with what the control needs to run its clock. */
export function boardClockRound(
  round: LiveBoardRound,
  matchMinutes: number,
): BoardClockRound {
  return {
    roundNumber: round.roundNumber,
    lengthSeconds: matchMinutes * 60,
    schedule: boardRoundSchedule(round, matchMinutes),
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

export type PadelScoreboardSetState = "side1" | "side2" | "level" | "in_play";

export type PadelScoreboardSet = {
  score1: number | null;
  score2: number | null;
  state: PadelScoreboardSetState;
};

function isFinishedPadelSet(score1: number, score2: number) {
  const high = Math.max(score1, score2);
  return high >= 7 || (high >= 6 && Math.abs(score1 - score2) >= 2);
}

/**
 * A padel Match's Sets in the win, loss and not yet language. Only the last
 * Set of an open Match can be in play: 4-3 saved mid-set is not a Set won.
 */
export function padelScoreboardSets(
  sets: PadelScoreboard["sets"],
  completed: boolean,
): PadelScoreboardSet[] {
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

export function padelScoreboardSetsWon(sets: readonly PadelScoreboardSet[]) {
  return {
    side1: sets.filter((set) => set.state === "side1").length,
    side2: sets.filter((set) => set.state === "side2").length,
  };
}

/** A one-Match board before its start, during it, and once the score is final. */
export function scoreboardPhase(args: {
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
