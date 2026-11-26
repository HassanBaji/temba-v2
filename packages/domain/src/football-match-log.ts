import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { shortName, type BoardPlayer, type Side } from "./football-board";

export const MATCH_LOG_KINDS = [
  "goal",
  "own_goal",
  "warning",
  "red_card",
] as const;

export type MatchLogKind = (typeof MATCH_LOG_KINDS)[number];

export const RED_CARD_REASONS = [
  "second_warning",
  "serious_foul",
  "violent_conduct",
  "dissent",
  "other",
] as const;

export type RedCardReason = (typeof RED_CARD_REASONS)[number];

export const MATCH_LOG_MINUTE_MIN = 1;
export const MATCH_LOG_MINUTE_MAX = 999;
export const MATCH_LOG_LINES_MAX = 200;

/**
 * One line of a football Match log. `side` is the side the line counts for:
 * the scoring side for a goal and an own goal, the player's side for a card.
 * A goal's `userId` is null when nobody saw who scored.
 */
export type MatchLogLine = {
  id: string;
  kind: MatchLogKind;
  side: Side;
  userId: string | null;
  minute: number;
  loggedAt: Date;
  reason: RedCardReason | null;
};

export type LogPlayer = { userId: string; sideIndex: Side | null };

/** When a line is logged, against the Game's kick-off and final whistle. */
export type Clock = { kickoff: Date | null; end?: Date | null };

type Stamp = Clock & { id: string; at: Date };

export function otherSide(side: Side): Side {
  return side === 1 ? 2 : 1;
}

function clampMinute(minute: number) {
  return Math.min(
    MATCH_LOG_MINUTE_MAX,
    Math.max(MATCH_LOG_MINUTE_MIN, Math.round(minute)),
  );
}

/**
 * The minute of the game a moment falls in, counted from kick-off as football
 * counts it: the first 60 seconds are the 1st minute. A line logged after
 * the final whistle takes the game's last minute.
 */
export function matchMinute(clock: Clock, at: Date) {
  if (!clock.kickoff) {
    return MATCH_LOG_MINUTE_MIN;
  }
  const minutes = (moment: Date) =>
    Math.ceil((moment.getTime() - clock.kickoff!.getTime()) / 60_000);
  const minute = minutes(at);
  return clampMinute(clock.end ? Math.min(minute, minutes(clock.end)) : minute);
}

/** Oldest first: by minute, then by the time each line was logged. */
export function chronological(lines: readonly MatchLogLine[]) {
  return [...lines].sort(
    (a, b) =>
      a.minute - b.minute ||
      a.loggedAt.getTime() - b.loggedAt.getTime() ||
      a.id.localeCompare(b.id),
  );
}

export function newestFirst(lines: readonly MatchLogLine[]) {
  return chronological(lines).reverse();
}

function stamped(stamp: Stamp) {
  return {
    id: stamp.id,
    minute: matchMinute(stamp, stamp.at),
    loggedAt: stamp.at,
  };
}

export function isGoalLine(line: Pick<MatchLogLine, "kind">) {
  return line.kind === "goal" || line.kind === "own_goal";
}

export function playerMarks(lines: readonly MatchLogLine[], userId: string) {
  let goals = 0;
  let warnings = 0;
  let sentOff = false;
  for (const line of lines) {
    if (line.userId !== userId) {
      continue;
    }
    if (line.kind === "goal") {
      goals += 1;
    } else if (line.kind === "warning") {
      warnings += 1;
    } else if (line.kind === "red_card") {
      sentOff = true;
    }
  }
  return { goals, warnings, sentOff };
}

export function logGoal(
  lines: readonly MatchLogLine[],
  player: LogPlayer,
  stamp: Stamp,
): MatchLogLine[] {
  if (!player.sideIndex) {
    return [...lines];
  }
  return [
    ...lines,
    {
      ...stamped(stamp),
      kind: "goal",
      side: player.sideIndex,
      userId: player.userId,
      reason: null,
    },
  ];
}

/** Plus on a side: a goal nobody saw the scorer of. */
export function logUnknownGoal(
  lines: readonly MatchLogLine[],
  side: Side,
  stamp: Stamp,
): MatchLogLine[] {
  return [
    ...lines,
    { ...stamped(stamp), kind: "goal", side, userId: null, reason: null },
  ];
}

/** The player put it in their own net, so it counts for the other side. */
export function logOwnGoal(
  lines: readonly MatchLogLine[],
  player: LogPlayer,
  stamp: Stamp,
): MatchLogLine[] {
  if (!player.sideIndex) {
    return [...lines];
  }
  return [
    ...lines,
    {
      ...stamped(stamp),
      kind: "own_goal",
      side: otherSide(player.sideIndex),
      userId: player.userId,
      reason: null,
    },
  ];
}

export function logRedCard(
  lines: readonly MatchLogLine[],
  player: LogPlayer,
  reason: RedCardReason | null,
  stamp: Stamp,
): MatchLogLine[] {
  if (!player.sideIndex || playerMarks(lines, player.userId).sentOff) {
    return [...lines];
  }
  return [
    ...lines,
    {
      ...stamped(stamp),
      kind: "red_card",
      side: player.sideIndex,
      userId: player.userId,
      reason,
    },
  ];
}

/**
 * A warning. A player's second warning adds a red card on its own, marked
 * second warning; a player already sent off takes no more cards.
 */
export function logWarning(
  lines: readonly MatchLogLine[],
  player: LogPlayer,
  stamp: Stamp,
): MatchLogLine[] {
  const marks = playerMarks(lines, player.userId);
  if (!player.sideIndex || marks.sentOff) {
    return [...lines];
  }
  const warned: MatchLogLine[] = [
    ...lines,
    {
      ...stamped(stamp),
      kind: "warning",
      side: player.sideIndex,
      userId: player.userId,
      reason: null,
    },
  ];
  if (marks.warnings + 1 < 2) {
    return warned;
  }
  return logRedCard(warned, player, "second_warning", {
    ...stamp,
    id: `${stamp.id}-red`,
  });
}

export type Removal = { lines: MatchLogLine[]; removed: MatchLogLine[] };

/**
 * Takes a line out of the log. Taking out a warning also takes out the red
 * card it gave as a second warning, so Undo brings both back.
 */
export function removeLine(
  lines: readonly MatchLogLine[],
  id: string,
): Removal {
  const line = lines.find((candidate) => candidate.id === id);
  if (!line) {
    return { lines: [...lines], removed: [] };
  }
  const removed = [line];
  const rest = lines.filter((candidate) => candidate.id !== id);
  if (line.kind === "warning" && line.userId) {
    const userId = line.userId;
    const left = playerMarks(rest, userId).warnings;
    const secondRed = rest.find(
      (candidate) =>
        candidate.kind === "red_card" &&
        candidate.userId === userId &&
        candidate.reason === "second_warning",
    );
    if (secondRed && left < 2) {
      removed.push(secondRed);
    }
  }
  const removedIds = new Set(removed.map((candidate) => candidate.id));
  return {
    lines: lines.filter((candidate) => !removedIds.has(candidate.id)),
    removed,
  };
}

export function restoreLines(
  lines: readonly MatchLogLine[],
  removed: readonly MatchLogLine[],
): MatchLogLine[] {
  const ids = new Set(lines.map((line) => line.id));
  return [...lines, ...removed.filter((line) => !ids.has(line.id))];
}

/** Minus on a side takes out the latest goal that counted for it. */
export function removeLatestGoal(
  lines: readonly MatchLogLine[],
  side: Side,
): Removal {
  const latest = newestFirst(lines).find(
    (line) => isGoalLine(line) && line.side === side,
  );
  return latest
    ? removeLine(lines, latest.id)
    : { lines: [...lines], removed: [] };
}

function replaceLine(
  lines: readonly MatchLogLine[],
  id: string,
  change: (line: MatchLogLine) => MatchLogLine,
) {
  return lines.map((line) => (line.id === id ? change(line) : line));
}

/**
 * Names who the line is about. On a goal, a player of the side it counted
 * for makes it their goal and a player of the other side makes it an own
 * goal; either way the side, minute and time stay. A card follows the player
 * to their side.
 */
export function changePlayer(
  lines: readonly MatchLogLine[],
  id: string,
  player: LogPlayer,
): MatchLogLine[] {
  const playerSide = player.sideIndex;
  if (!playerSide) {
    return [...lines];
  }
  const line = lines.find((candidate) => candidate.id === id);
  if (
    line?.kind === "red_card" &&
    line.userId !== player.userId &&
    playerMarks(lines, player.userId).sentOff
  ) {
    return [...lines];
  }
  return replaceLine(lines, id, (current) => {
    if (isGoalLine(current)) {
      return {
        ...current,
        userId: player.userId,
        kind: playerSide === current.side ? "goal" : "own_goal",
      };
    }
    return { ...current, userId: player.userId, side: playerSide };
  });
}

export function changeMinute(
  lines: readonly MatchLogLine[],
  id: string,
  minute: number,
): MatchLogLine[] {
  return replaceLine(lines, id, (line) => ({
    ...line,
    minute: clampMinute(minute),
  }));
}

export function changeRedCardReason(
  lines: readonly MatchLogLine[],
  id: string,
  reason: RedCardReason | null,
): MatchLogLine[] {
  return replaceLine(lines, id, (line) =>
    line.kind === "red_card" ? { ...line, reason } : line,
  );
}

type CountedLine = Pick<MatchLogLine, "kind" | "side" | "userId">;

export function logScore(lines: readonly CountedLine[]) {
  const score = { slot1: 0, slot2: 0 };
  for (const line of lines) {
    if (isGoalLine(line)) {
      score[line.side === 1 ? "slot1" : "slot2"] += 1;
    }
  }
  return score;
}

/** Who scored, for `match_goals`: own goals are not the player's goals. */
export function logScorers(lines: readonly CountedLine[]) {
  const goals = new Map<string, number>();
  for (const line of lines) {
    if (line.kind === "goal" && line.userId) {
      goals.set(line.userId, (goals.get(line.userId) ?? 0) + 1);
    }
  }
  return [...goals].map(([userId, count]) => ({ userId, goals: count }));
}

/** The Score once each goal line is in, keyed by line id. */
export function runningScores(lines: readonly MatchLogLine[]) {
  const score = { slot1: 0, slot2: 0 };
  const byLine = new Map<string, { slot1: number; slot2: number }>();
  for (const line of chronological(lines)) {
    if (isGoalLine(line)) {
      score[line.side === 1 ? "slot1" : "slot2"] += 1;
      byLine.set(line.id, { ...score });
    }
  }
  return byLine;
}

export function cardCounts(lines: readonly MatchLogLine[]) {
  return {
    warnings: lines.filter((line) => line.kind === "warning").length,
    redCards: lines.filter((line) => line.kind === "red_card").length,
  };
}

export function sentOffLines(lines: readonly MatchLogLine[]) {
  return chronological(lines).filter((line) => line.kind === "red_card");
}

/**
 * A log for a Score saved before the Match log existed: each named goal and
 * each goal nobody named becomes a line at the time the log is opened.
 */
export function seedLogFromScore(
  score: { slot1: number; slot2: number } | null,
  players: readonly (LogPlayer & { goals: number })[],
  stamp: Clock & { at: Date },
): MatchLogLine[] {
  if (!score) {
    return [];
  }
  let lines: MatchLogLine[] = [];
  let n = 0;
  const next = () => ({ ...stamp, id: `seed-${(n += 1)}` });
  for (const player of players) {
    for (let goal = 0; goal < player.goals; goal += 1) {
      lines = logGoal(lines, player, next());
    }
  }
  const named = logScore(lines);
  for (const side of [1, 2] as const) {
    const missing =
      (side === 1 ? score.slot1 : score.slot2) -
      (side === 1 ? named.slot1 : named.slot2);
    for (let goal = 0; goal < missing; goal += 1) {
      lines = logUnknownGoal(lines, side, next());
    }
  }
  return lines;
}

export type MatchLogPayloadLine = Omit<MatchLogLine, "id">;

/** What `saveFootballScore` takes: the lines oldest first, without ids. */
export function logPayload(
  lines: readonly MatchLogLine[],
): MatchLogPayloadLine[] {
  return chronological(lines).map(({ id: _id, ...line }) => line);
}

function sameLine(a: MatchLogPayloadLine, b: MatchLogPayloadLine) {
  return (
    a.kind === b.kind &&
    a.side === b.side &&
    a.userId === b.userId &&
    a.minute === b.minute &&
    a.reason === b.reason &&
    a.loggedAt.getTime() === b.loggedAt.getTime()
  );
}

/** Whether two logs, oldest first, say the same thing. */
export function sameLog(
  before: readonly MatchLogPayloadLine[],
  after: readonly MatchLogPayloadLine[],
) {
  return (
    before.length === after.length &&
    before.every((line, index) => sameLine(line, after[index]!))
  );
}

/**
 * Why a saved log cannot stand, or null: each line's player must be on the
 * side the line says, a card and an own goal name their player, only a red
 * card has a reason, and a player is sent off at most once.
 */
export function matchLogProblem(
  lines: readonly MatchLogPayloadLine[],
  sideOf: (userId: string) => Side | null,
  locale: Locale,
) {
  const m = messagesFor(locale).football.matchLog.errors;
  const sentOff = new Set<string>();
  for (const line of lines) {
    if (line.reason && line.kind !== "red_card") {
      return m.reasonOnRedOnly;
    }
    if (!line.userId) {
      if (line.kind !== "goal") {
        return m.linePlayerNeeded;
      }
      continue;
    }
    const playerSide = sideOf(line.userId);
    if (!playerSide) {
      return m.linePlayer;
    }
    const expected =
      line.kind === "own_goal" ? otherSide(line.side) : line.side;
    if (playerSide !== expected) {
      return m.lineSide;
    }
    if (line.kind === "red_card") {
      if (sentOff.has(line.userId)) {
        return m.sentOffOnce;
      }
      sentOff.add(line.userId);
    }
  }
  return null;
}

export type ModeKey = "goal" | "ownGoal" | "warning" | "redCard";

export const LOG_MODES: readonly { key: ModeKey; kind: MatchLogKind }[] = [
  { key: "goal", kind: "goal" },
  { key: "ownGoal", kind: "own_goal" },
  { key: "warning", kind: "warning" },
  { key: "redCard", kind: "red_card" },
];

export function kindKey(kind: MatchLogKind): ModeKey {
  return LOG_MODES.find((mode) => mode.kind === kind)!.key;
}

/** The second line under a log line's name: what it was and for which side. */
export function logLineSub(
  line: Pick<MatchLogLine, "kind" | "side" | "reason">,
  names: { slot1: string; slot2: string },
  locale: Locale,
) {
  const m = messagesFor(locale).football.matchLog;
  const team = line.side === 1 ? names.slot1 : names.slot2;
  switch (line.kind) {
    case "goal":
      return m.sub.goal(team);
    case "own_goal":
      return m.sub.ownGoal(team);
    case "warning":
      return m.sub.warning(team);
    case "red_card":
      return line.reason
        ? m.sub.redCardWhy(team, m.reasons[line.reason])
        : m.sub.redCard(team);
  }
}

/** The Undo bar's words after a line is taken out. */
export function removedLabel(
  line: Pick<MatchLogLine, "kind" | "side" | "userId">,
  name: string | null,
  names: { slot1: string; slot2: string },
  locale: Locale,
) {
  const m = messagesFor(locale).football.matchLog.removed;
  if (!name) {
    return m.unknownGoal(line.side === 1 ? names.slot1 : names.slot2);
  }
  return m[kindKey(line.kind)](name);
}

/** Who a log line is about, as the log shows them: "You" for the viewer. */
export function logLineName(
  line: Pick<MatchLogLine, "kind" | "userId">,
  players: readonly Pick<BoardPlayer, "userId" | "name" | "isViewer">[],
  locale: Locale,
) {
  const m = messagesFor(locale);
  const player = line.userId
    ? players.find((candidate) => candidate.userId === line.userId)
    : null;
  if (player) {
    return player.isViewer ? m.common.you : shortName(player.name);
  }
  return line.kind === "goal"
    ? m.football.matchLog.scorerUnknown
    : m.football.matchLog.playerUnknown;
}
