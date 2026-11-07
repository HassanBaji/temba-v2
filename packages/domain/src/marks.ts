import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import type { FootballBib } from "./football-lineup";
import { formatGameClock, formatWeekday } from "./format-game-start";
import type { Sport } from "./sport";

/** The twelve givable kinds, in display order: teammate, anyone, opponent. */
export const MARK_KINDS = [
  "dynamo",
  "let_him_cook",
  "mr_fumble",
  "sayed_malek",
  "clutch",
  "mr_ice",
  "smash_machine",
  "goal_machine",
  "great_wall",
  "comeback_king",
  "underdog",
  "good_game",
] as const;

export type MarkKind = (typeof MARK_KINDS)[number];

export const GIVER_GROUPS = ["teammate", "anyone", "opponent"] as const;

export type GiverGroup = (typeof GIVER_GROUPS)[number];

export type MarkMeta = {
  group: GiverGroup;
  sports: readonly Sport[];
  roast: boolean;
};

const BOTH_SPORTS: readonly Sport[] = ["padel", "football"];

export const MARK_META: Record<MarkKind, MarkMeta> = {
  dynamo: { group: "teammate", sports: BOTH_SPORTS, roast: false },
  let_him_cook: { group: "teammate", sports: BOTH_SPORTS, roast: false },
  mr_fumble: { group: "teammate", sports: BOTH_SPORTS, roast: true },
  sayed_malek: { group: "teammate", sports: BOTH_SPORTS, roast: true },
  clutch: { group: "anyone", sports: BOTH_SPORTS, roast: false },
  mr_ice: { group: "anyone", sports: BOTH_SPORTS, roast: false },
  smash_machine: { group: "anyone", sports: ["padel"], roast: false },
  goal_machine: { group: "anyone", sports: ["football"], roast: false },
  great_wall: { group: "opponent", sports: BOTH_SPORTS, roast: false },
  comeback_king: { group: "opponent", sports: BOTH_SPORTS, roast: false },
  underdog: { group: "opponent", sports: BOTH_SPORTS, roast: false },
  good_game: { group: "opponent", sports: BOTH_SPORTS, roast: false },
};

export const MARKS_PER_GAME = 3;

export const MARKS_WINDOW_HOURS = 48;

const MS_PER_HOUR = 60 * 60 * 1000;

export function isMarkKind(value: unknown): value is MarkKind {
  return (MARK_KINDS as readonly unknown[]).includes(value);
}

export type MarksWindow = {
  state: "open" | "closed";
  opensAt: Date;
  closesAt: Date;
};

/**
 * The Marks window of a Match: open for 48 hours from its completion, null
 * while it has none (not yet completed, or reopened by a wrong score).
 * Judged by the server clock; clients render `closesAt` and never decide.
 */
export function marksWindow(
  completedAt: Date | null,
  now: Date,
): MarksWindow | null {
  if (!completedAt) {
    return null;
  }
  const closesAt = new Date(
    completedAt.getTime() + MARKS_WINDOW_HOURS * MS_PER_HOUR,
  );
  return {
    state: now.getTime() < closesAt.getTime() ? "open" : "closed",
    opensAt: completedAt,
    closesAt,
  };
}

export type MatchSlot = 1 | 2;

export type MarkRelation = "teammate" | "opponent";

/** By Game team, never by Position: two players on one side are teammates. */
export function markRelation(
  giverSlot: MatchSlot,
  receiverSlot: MatchSlot,
): MarkRelation {
  return giverSlot === receiverSlot ? "teammate" : "opponent";
}

/** The kinds a giver may give a receiver: their giver group plus the anyone group, for the Game's sport. */
export function givableKinds(args: {
  sport: Sport;
  relation: MarkRelation;
}): MarkKind[] {
  return MARK_KINDS.filter((kind) => {
    const meta = MARK_META[kind];
    return (
      (meta.group === "anyone" || meta.group === args.relation) &&
      meta.sports.includes(args.sport)
    );
  });
}

export const MARK_REFUSALS = [
  "self",
  "not_participant",
  "window_closed",
  "cap_reached",
  "already_marked_receiver",
  "kind_not_allowed",
] as const;

export type MarkRefusal = (typeof MARK_REFUSALS)[number];

export function isMarkRefusal(value: unknown): value is MarkRefusal {
  return (MARK_REFUSALS as readonly unknown[]).includes(value);
}

export type MarkParticipant = {
  userId: string;
  slot: MatchSlot;
  isUnclaimed: boolean;
};

export type GivenMark = { receiverUserId: string; kind: MarkKind };

export function remainingMarks(given: readonly unknown[]): number {
  return Math.max(0, MARKS_PER_GAME - given.length);
}

/**
 * Whether a giver may give `kind` to a receiver on a Match. Givers are
 * participants with an account; receivers are any other participant,
 * Unclaimed players included. `given` is the giver's marks on the Match.
 */
export function canGiveMark(args: {
  giverUserId: string;
  receiverUserId: string;
  kind: MarkKind;
  sport: Sport;
  window: MarksWindow | null;
  participants: readonly MarkParticipant[];
  given: readonly GivenMark[];
}): { ok: true } | { ok: false; reason: MarkRefusal } {
  if (args.giverUserId === args.receiverUserId) {
    return { ok: false, reason: "self" };
  }
  const giver = args.participants.find(
    (participant) => participant.userId === args.giverUserId,
  );
  const receiver = args.participants.find(
    (participant) => participant.userId === args.receiverUserId,
  );
  if (!giver || giver.isUnclaimed || !receiver) {
    return { ok: false, reason: "not_participant" };
  }
  if (args.window?.state !== "open") {
    return { ok: false, reason: "window_closed" };
  }
  if (remainingMarks(args.given) === 0) {
    return { ok: false, reason: "cap_reached" };
  }
  if (args.given.some((mark) => mark.receiverUserId === args.receiverUserId)) {
    return { ok: false, reason: "already_marked_receiver" };
  }
  const relation = markRelation(giver.slot, receiver.slot);
  if (!givableKinds({ sport: args.sport, relation }).includes(args.kind)) {
    return { ok: false, reason: "kind_not_allowed" };
  }
  return { ok: true };
}

export type GameMarksParticipant = {
  userId: string;
  name: string;
  image: string | null;
  slot: MatchSlot;
  /** The side's Bib on a football Game; null on padel. */
  bib: FootballBib | null;
  isUnclaimed: boolean;
  isViewer: boolean;
  /** Goals on a football Game; null on padel. */
  goals: number | null;
  keeper: boolean;
  received: { kind: MarkKind; count: number }[];
};

export type GameMark = {
  id: string;
  kind: MarkKind;
  giverUserId: string;
  receiverUserId: string;
  createdAt: Date;
};

/** What `marks.forGame` returns: everything the Game screen draws its marks from. */
export type GameMarks = {
  gameId: string;
  sport: Sport;
  matchId: string | null;
  window: MarksWindow | null;
  participants: GameMarksParticipant[];
  marks: GameMark[];
  summary: { given: number; givers: number };
  viewer: {
    isParticipant: boolean;
    canGive: boolean;
    remaining: number;
    given: GivenMark[];
  };
};

export function markName(kind: MarkKind, locale: Locale): string {
  return messagesFor(locale).marks.kind[kind].name;
}

export function markDescription(kind: MarkKind, locale: Locale): string {
  return messagesFor(locale).marks.kind[kind].description;
}

export function giverGroupLabel(group: GiverGroup, locale: Locale): string {
  return messagesFor(locale).marks.group[group];
}

/** `Fri 7:00 PM`, on the product clock. */
export function formatMarksClose(closesAt: Date | string, locale: Locale) {
  return `${formatWeekday(closesAt, "short", locale)} ${formatGameClock(closesAt, locale)}`;
}

/** `closes Fri 7:00 PM`. */
export function marksClosesCopy(closesAt: Date | string, locale: Locale) {
  return messagesFor(locale).marks.window.closes(
    formatMarksClose(closesAt, locale),
  );
}

/** `Closed Fri 7:00 PM`. */
export function marksClosedCopy(closesAt: Date | string, locale: Locale) {
  return messagesFor(locale).marks.window.closed(
    formatMarksClose(closesAt, locale),
  );
}

export function markRefusedCopy(reason: MarkRefusal, locale: Locale): string {
  const m = messagesFor(locale).marks.give.refused;
  switch (reason) {
    case "self":
      return m.self;
    case "not_participant":
      return m.notParticipant;
    case "window_closed":
      return m.windowClosed;
    case "cap_reached":
      return m.capReached;
    case "already_marked_receiver":
      return m.alreadyMarkedReceiver;
    case "kind_not_allowed":
      return m.kindNotAllowed;
  }
}
