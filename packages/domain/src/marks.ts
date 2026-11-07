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

export const MVP_MODES = ["vote", "organizer", "none"] as const;

export type MvpMode = (typeof MVP_MODES)[number];

export const MVP_DECIDED_BY = ["vote", "organizer", "tie_break"] as const;

export type MvpDecidedBy = (typeof MVP_DECIDED_BY)[number];

export type MvpState = "none" | "pending" | "tie" | "decided";

export function isMvpMode(value: unknown): value is MvpMode {
  return (MVP_MODES as readonly unknown[]).includes(value);
}

export type MvpVote = { voterUserId: string; candidateUserId: string };

/** What the Game row holds before settlement: the Organizer's pick or tie-break. */
export type MvpPick = { userId: string; decidedBy: MvpDecidedBy };

/** Who votes for the MVP: the participants with an account. */
export function mvpEligibleVoterIds(
  participants: readonly MarkParticipant[],
): string[] {
  return participants
    .filter((participant) => !participant.isUnclaimed)
    .map((participant) => participant.userId);
}

/**
 * The votes that count: from an eligible voter, for another participant. A
 * vote whose voter or candidate has left the Match since no longer counts.
 */
export function countedMvpVotes(
  votes: readonly MvpVote[],
  participants: readonly MarkParticipant[],
): MvpVote[] {
  const voters = new Set(mvpEligibleVoterIds(participants));
  const candidates = new Set(
    participants.map((participant) => participant.userId),
  );
  return votes.filter(
    (vote) =>
      voters.has(vote.voterUserId) &&
      candidates.has(vote.candidateUserId) &&
      vote.voterUserId !== vote.candidateUserId,
  );
}

export type MvpTally = {
  cast: number;
  /** Most votes first, then by id so the order is stable. */
  counts: { userId: string; votes: number }[];
  /** Every candidate on the top count; more than one is a tie. */
  leaders: string[];
};

export function mvpTally(votes: readonly MvpVote[]): MvpTally {
  const byCandidate = new Map<string, number>();
  for (const vote of votes) {
    byCandidate.set(
      vote.candidateUserId,
      (byCandidate.get(vote.candidateUserId) ?? 0) + 1,
    );
  }
  const counts = [...byCandidate]
    .map(([userId, count]) => ({ userId, votes: count }))
    .sort(
      (left, right) =>
        right.votes - left.votes || left.userId.localeCompare(right.userId),
    );
  const top = counts[0]?.votes ?? 0;
  return {
    cast: votes.length,
    counts,
    leaders: counts
      .filter((entry) => entry.votes === top)
      .map((entry) => entry.userId),
  };
}

export type MvpOutcome = {
  state: MvpState;
  userId: string | null;
  decidedBy: MvpDecidedBy | null;
  tiedUserIds: string[] | null;
  /** The question is answered for good and may be settled now. */
  final: boolean;
};

export type MvpQuestion = {
  mode: MvpMode;
  window: MarksWindow | null;
  participants: readonly MarkParticipant[];
  votes: readonly MvpVote[];
  pick: MvpPick | null;
};

const NO_MVP: MvpOutcome = {
  state: "none",
  userId: null,
  decidedBy: null,
  tiedUserIds: null,
  final: true,
};

const MVP_PENDING: MvpOutcome = {
  state: "pending",
  userId: null,
  decidedBy: null,
  tiedUserIds: null,
  final: false,
};

function decided(
  userId: string,
  decidedBy: MvpDecidedBy,
  final: boolean,
): MvpOutcome {
  return { state: "decided", userId, decidedBy, tiedUserIds: null, final };
}

/**
 * How a Game's MVP stands. The Organizer's pick may change until the window
 * closes. A vote tallies once everyone eligible has voted or the window has
 * closed; a tie goes to the Organizer, and no pick by the close is no MVP,
 * never a guess.
 */
export function mvpOutcome(question: MvpQuestion): MvpOutcome {
  if (question.mode === "none") {
    return NO_MVP;
  }
  if (!question.window) {
    return MVP_PENDING;
  }
  const closed = question.window.state === "closed";
  const seated = (userId: string) =>
    question.participants.some((participant) => participant.userId === userId);

  if (question.mode === "organizer") {
    const pick = question.pick;
    if (pick?.decidedBy === "organizer" && seated(pick.userId)) {
      return decided(pick.userId, "organizer", closed);
    }
    return closed ? NO_MVP : MVP_PENDING;
  }

  const tally = mvpTally(
    countedMvpVotes(question.votes, question.participants),
  );
  const eligible = mvpEligibleVoterIds(question.participants).length;
  const everyoneVoted = eligible > 0 && tally.cast >= eligible;
  if (!everyoneVoted && !closed) {
    return MVP_PENDING;
  }
  const [leader, ...others] = tally.leaders;
  if (!leader) {
    return NO_MVP;
  }
  if (others.length === 0) {
    return decided(leader, "vote", true);
  }
  const pick = question.pick;
  if (pick?.decidedBy === "tie_break" && tally.leaders.includes(pick.userId)) {
    return decided(pick.userId, "tie_break", true);
  }
  if (closed) {
    return NO_MVP;
  }
  return {
    state: "tie",
    userId: null,
    decidedBy: null,
    tiedUserIds: tally.leaders,
    final: false,
  };
}

export const MVP_REFUSALS = [
  "wrong_mode",
  "not_voter",
  "not_organizer",
  "self",
  "not_candidate",
  "closed",
] as const;

export type MvpRefusal = (typeof MVP_REFUSALS)[number];

export function isMvpRefusal(value: unknown): value is MvpRefusal {
  return (MVP_REFUSALS as readonly unknown[]).includes(value);
}

type MvpVerdict = { ok: true } | { ok: false; reason: MvpRefusal };

/** Whether a voter may vote for a candidate: vote mode, window open, the vote still pending. */
export function canCastMvpVote(
  args: MvpQuestion & {
    settled: boolean;
    voterUserId: string;
    candidateUserId: string;
  },
): MvpVerdict {
  if (args.mode !== "vote") {
    return { ok: false, reason: "wrong_mode" };
  }
  if (!mvpEligibleVoterIds(args.participants).includes(args.voterUserId)) {
    return { ok: false, reason: "not_voter" };
  }
  if (
    args.window?.state !== "open" ||
    args.settled ||
    mvpOutcome(args).state !== "pending"
  ) {
    return { ok: false, reason: "closed" };
  }
  if (args.voterUserId === args.candidateUserId) {
    return { ok: false, reason: "self" };
  }
  if (
    !args.participants.some(
      (participant) => participant.userId === args.candidateUserId,
    )
  ) {
    return { ok: false, reason: "not_candidate" };
  }
  return { ok: true };
}

/**
 * Whether an Organizer may make `userId` the MVP while the window is open: any
 * participant but themselves in organizer mode, or one of the tied in a vote
 * that tied, themselves included, because the players put them there.
 */
export function canPickMvp(
  args: MvpQuestion & {
    settled: boolean;
    isOrganizer: boolean;
    pickerUserId: string;
    userId: string;
  },
): MvpVerdict {
  if (!args.isOrganizer) {
    return { ok: false, reason: "not_organizer" };
  }
  if (args.mode === "none") {
    return { ok: false, reason: "wrong_mode" };
  }
  if (args.window?.state !== "open" || args.settled) {
    return { ok: false, reason: "closed" };
  }
  if (args.mode === "organizer") {
    if (args.userId === args.pickerUserId) {
      return { ok: false, reason: "self" };
    }
    if (
      !args.participants.some(
        (participant) => participant.userId === args.userId,
      )
    ) {
      return { ok: false, reason: "not_candidate" };
    }
    return { ok: true };
  }
  const outcome = mvpOutcome(args);
  if (outcome.final) {
    return { ok: false, reason: "closed" };
  }
  if (outcome.state !== "tie") {
    return { ok: false, reason: "wrong_mode" };
  }
  if (!outcome.tiedUserIds?.includes(args.userId)) {
    return { ok: false, reason: "not_candidate" };
  }
  return { ok: true };
}

/** The MVP part of `marks.forGame`. The tally shows only once settled; the tied only to an Organizer. */
export type GameMvp = {
  mode: MvpMode;
  state: MvpState;
  userId: string | null;
  decidedBy: MvpDecidedBy | null;
  decidedAt: Date | null;
  settledAt: Date | null;
  votes: { cast: number; eligible: number };
  tally: { userId: string; votes: number }[] | null;
  tiedUserIds: string[] | null;
  closesAt: Date | null;
};

export type StoredMvp = {
  userId: string | null;
  decidedBy: MvpDecidedBy | null;
  decidedAt: Date | null;
  settledAt: Date | null;
};

export type MvpViewer = {
  canVote: boolean;
  vote: string | null;
  isOrganizer: boolean;
  canPickMvp: boolean;
};

/**
 * The MVP as one viewer may see it. Before settlement nobody sees the tally,
 * only how many have voted and their own vote; the tied players show only to
 * an Organizer. Once settled the stored decision stands.
 */
export function gameMvpView(args: {
  question: MvpQuestion;
  stored: StoredMvp;
  viewerUserId: string;
  isOrganizer: boolean;
}): { mvp: GameMvp; viewer: MvpViewer } {
  const { question, stored } = args;
  const closesAt = question.window?.closesAt ?? null;
  if (question.mode === "none") {
    return {
      mvp: {
        mode: "none",
        state: "none",
        userId: null,
        decidedBy: null,
        decidedAt: null,
        settledAt: null,
        votes: { cast: 0, eligible: 0 },
        tally: null,
        tiedUserIds: null,
        closesAt,
      },
      viewer: {
        canVote: false,
        vote: null,
        isOrganizer: args.isOrganizer,
        canPickMvp: false,
      },
    };
  }

  const voting = question.mode === "vote";
  const counted = voting
    ? countedMvpVotes(question.votes, question.participants)
    : [];
  const eligibleIds = mvpEligibleVoterIds(question.participants);
  const votes = {
    cast: counted.length,
    eligible: voting ? eligibleIds.length : 0,
  };
  const settled = stored.settledAt !== null;
  const open = question.window?.state === "open" && !settled;
  const outcome = mvpOutcome(question);

  const mvp: GameMvp = settled
    ? {
        mode: question.mode,
        state: stored.userId ? "decided" : "none",
        userId: stored.userId,
        decidedBy: stored.userId ? stored.decidedBy : null,
        decidedAt: stored.userId ? stored.decidedAt : null,
        settledAt: stored.settledAt,
        votes,
        tally: voting ? mvpTally(counted).counts : null,
        tiedUserIds: null,
        closesAt,
      }
    : {
        mode: question.mode,
        state: outcome.state,
        userId: outcome.userId,
        decidedBy: outcome.decidedBy,
        decidedAt: outcome.state === "decided" ? stored.decidedAt : null,
        settledAt: null,
        votes,
        tally: null,
        tiedUserIds:
          args.isOrganizer && outcome.state === "tie"
            ? outcome.tiedUserIds
            : null,
        closesAt,
      };

  return {
    mvp,
    viewer: {
      canVote:
        voting &&
        open &&
        outcome.state === "pending" &&
        eligibleIds.includes(args.viewerUserId),
      vote: voting
        ? (question.votes.find((vote) => vote.voterUserId === args.viewerUserId)
            ?.candidateUserId ?? null)
        : null,
      isOrganizer: args.isOrganizer,
      canPickMvp:
        args.isOrganizer &&
        open &&
        (question.mode === "organizer" || outcome.state === "tie"),
    },
  };
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
    canVote: boolean;
    /** The candidate the viewer voted for, in vote mode. */
    vote: string | null;
    isOrganizer: boolean;
    canPickMvp: boolean;
  };
  mvp: GameMvp;
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

export function mvpName(locale: Locale): string {
  return messagesFor(locale).marks.kind.mvp.name;
}

export function mvpModeCopy(
  mode: MvpMode,
  locale: Locale,
): { label: string; description: string; help: string } {
  return messagesFor(locale).marks.mvp.mode[mode];
}

/** `By vote, 7 of 12`, `Organizer’s pick` or `Tied vote, Organizer’s pick`. */
export function mvpDecidedByCopy(
  decidedBy: MvpDecidedBy,
  votes: { cast: number; eligible: number },
  locale: Locale,
): string {
  const m = messagesFor(locale).marks.mvp;
  switch (decidedBy) {
    case "vote":
      return m.byVote(votes.cast, votes.eligible);
    case "organizer":
      return m.organizerPick;
    case "tie_break":
      return m.tieBreak;
  }
}

/** `7 of 12 have voted, closes Fri 7:00 PM`. */
export function voteProgressCopy(
  votes: { cast: number; eligible: number },
  closesAt: Date | string,
  locale: Locale,
): string {
  return messagesFor(locale).marks.mvp.progress(
    votes.cast,
    votes.eligible,
    marksClosesCopy(closesAt, locale),
  );
}

export function mvpRefusedCopy(reason: MvpRefusal, locale: Locale): string {
  const m = messagesFor(locale).marks.mvp.refused;
  switch (reason) {
    case "wrong_mode":
      return m.wrongMode;
    case "not_voter":
      return m.notVoter;
    case "not_organizer":
      return m.notOrganizer;
    case "self":
      return m.self;
    case "not_candidate":
      return m.notCandidate;
    case "closed":
      return m.closed;
  }
}
