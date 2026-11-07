import { footballBibName } from "@repo/domain/football-lineup";
import { formatGameSideLabel } from "@repo/domain/game-side-label";
import {
  MARK_KINDS,
  MARK_META,
  MARKS_PER_GAME,
  formatMarksClose,
  givableKinds,
  isMarkRefusal,
  isMvpRefusal,
  markName,
  markRefusedCopy,
  markRelation,
  markRelationCopy,
  marksClosedCopy,
  mvpDecidedByCopy,
  mvpModeCopy,
  mvpRefusedCopy,
  voteProgressCopy,
  type CoinKind,
  type GameMarks,
  type GameMarksParticipant,
  type MarkKind,
  type MarkRelation,
  type MatchSlot,
} from "@repo/domain/marks";
import type { FootballBib } from "@repo/domain/football-lineup";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

const SLOTS: readonly MatchSlot[] = [1, 2];

export function firstName(name: string): string {
  const first = name.trim().split(/\s+/)[0] ?? "";
  return first.length > 0 ? first : name;
}

function participantOf(data: GameMarks, userId: string) {
  return data.participants.find((participant) => participant.userId === userId);
}

function viewerSlot(data: GameMarks): MatchSlot {
  return (
    data.participants.find((participant) => participant.isViewer)?.slot ?? 1
  );
}

function marksReceived(participant: GameMarksParticipant | undefined) {
  return (participant?.received ?? []).reduce(
    (total, entry) => total + entry.count,
    0,
  );
}

function nameOf(data: GameMarks, userId: string, locale: Locale) {
  return (
    participantOf(data, userId)?.name ?? messagesFor(locale).common.someone
  );
}

function joinParts(parts: (string | null)[], locale: Locale): string | null {
  const shown = parts.filter((part): part is string => Boolean(part));
  return shown.length > 0
    ? shown.join(messagesFor(locale).common.listSeparator)
    : null;
}

function sentences(parts: (string | null)[], locale: Locale): string {
  return messagesFor(locale).webMarks.sentences(
    parts.filter((part): part is string => Boolean(part)),
  );
}

/** The side's Bib on football, "Team A" or "Team B" on padel. */
export function marksSideLabel(
  data: GameMarks,
  slot: MatchSlot,
  locale: Locale,
): string {
  if (data.sport === "football") {
    const bib =
      data.participants.find((participant) => participant.slot === slot)?.bib ??
      null;
    return footballBibName(bib, slot, locale);
  }
  return formatGameSideLabel("friendly_game", slot, locale);
}

function sideBib(data: GameMarks, slot: MatchSlot): FootballBib | null {
  return (
    data.participants.find((participant) => participant.slot === slot)?.bib ??
    null
  );
}

function footballHints(participant: GameMarksParticipant, locale: Locale) {
  const m = messagesFor(locale);
  return [
    participant.keeper ? m.football.board.seatKeeper : null,
    participant.goals ? m.game.played.goals(participant.goals) : null,
  ];
}

/** The MVP once the question is final: the one row that carries the gold coin. */
function settledMvpId(data: GameMarks): string | null {
  return data.mvp.state === "decided" && data.mvp.settledAt
    ? data.mvp.userId
    : null;
}

/** "Dynamo to Ali, Good Game to Bo". */
function givenPairs(data: GameMarks, locale: Locale): string | null {
  const m = messagesFor(locale);
  return joinParts(
    data.viewer.given.map((mark) =>
      m.marks.give.gaveTo(
        markName(mark.kind, locale),
        firstName(nameOf(data, mark.receiverUserId, locale)),
      ),
    ),
    locale,
  );
}

/**
 * The marks section shows from completion: while the window is open, and
 * after it closes only when there is something to show. A Game with no
 * window (not completed, reopened, or no Marks at all) shows nothing.
 */
export function marksSectionVisible(data: GameMarks | undefined): boolean {
  if (!data?.window) {
    return false;
  }
  return (
    data.window.state === "open" ||
    data.marks.length > 0 ||
    settledMvpId(data) !== null
  );
}

export type MvpRowModel = {
  state: "pending" | "decided";
  title: string;
  line: string;
  /** The MVP, once decided. */
  userId: string | null;
  action: { sheet: "vote" | "pick"; label: string } | null;
};

/**
 * The MVP row in the hero (2a, 2f): only while the window is open or an
 * MVP exists. Never a tally before settlement, only how many have voted.
 */
export function mvpRowModel(
  data: GameMarks,
  locale: Locale,
): MvpRowModel | null {
  const { mvp, window: marksWindow, viewer } = data;
  if (mvp.mode === "none" || !marksWindow) {
    return null;
  }
  const m = messagesFor(locale);
  const mm = m.webMarks;
  const when = formatMarksClose(marksWindow.closesAt, locale);

  if (mvp.state === "decided" && mvp.userId) {
    const participant = participantOf(data, mvp.userId);
    const how =
      mvp.settledAt && mvp.decidedBy
        ? mvpDecidedByCopy(mvp.decidedBy, mvp.votes, locale)
        : marksWindow.state === "open"
          ? mm.mvp.pickChangeable(when)
          : m.marks.mvp.organizerPick;
    const goals = participant?.goals ?? 0;
    const received = marksReceived(participant);
    const facts = [
      goals > 0 ? m.game.played.goals(goals) : null,
      received > 0 ? mm.marksCount(received) : null,
    ].filter((part): part is string => Boolean(part));
    const [first, second] = facts;
    return {
      state: "decided",
      title: mm.mvp.title(nameOf(data, mvp.userId, locale)),
      line: sentences(
        [how, first && second ? mm.and(first, second) : (first ?? null)],
        locale,
      ),
      userId: mvp.userId,
      action: viewer.canPickMvp
        ? { sheet: "pick", label: m.marks.mvp.changePick }
        : null,
    };
  }

  if (marksWindow.state === "closed") {
    return null;
  }

  const line =
    mvp.mode === "organizer"
      ? mm.mvp.organizerPending(when)
      : mvp.state === "tie"
        ? mvp.tiedUserIds
          ? m.marks.mvp.tieNotice(mvp.tiedUserIds.length)
          : mm.mvp.tieWaiting(when)
        : mm.mvp.votePending(
            mvpModeCopy("vote", locale).label,
            voteProgressCopy(mvp.votes, marksWindow.closesAt, locale),
          );
  return {
    state: "pending",
    title: m.marks.mvp.notDecided,
    line,
    userId: null,
    action: viewer.canVote
      ? { sheet: "vote", label: m.marks.mvp.vote }
      : viewer.canPickMvp
        ? { sheet: "pick", label: m.marks.mvp.pick }
        : null,
  };
}

export type GiveRowModel = {
  title: string;
  line: string;
  coins: MarkKind[];
  actionLabel: string;
};

/** "Give your marks" for a seated account holder while the window is open. */
export function giveRowModel(
  data: GameMarks,
  locale: Locale,
): GiveRowModel | null {
  const { window: marksWindow, viewer } = data;
  if (marksWindow?.state !== "open" || !viewer.isParticipant) {
    return null;
  }
  const m = messagesFor(locale);
  const closes = m.webMarks.closesAt(
    formatMarksClose(marksWindow.closesAt, locale),
  );
  const coins = viewer.given.map((mark) => mark.kind);
  if (viewer.remaining > 0) {
    return {
      title: m.marks.give.title,
      line: sentences([m.marks.give.toGive(viewer.remaining), closes], locale),
      coins,
      actionLabel: m.marks.give.choosePlayer,
    };
  }
  return {
    title: m.marks.give.youGave(viewer.given.length, MARKS_PER_GAME),
    line: sentences([givenPairs(data, locale), closes], locale),
    coins,
    actionLabel: m.common.edit,
  };
}

export type ClosedCardModel = {
  title: string;
  line: string;
  coins: MarkKind[];
};

/** 2f: what the viewer gave, once the window has closed. */
export function closedCardModel(
  data: GameMarks,
  locale: Locale,
): ClosedCardModel | null {
  const { window: marksWindow, viewer } = data;
  if (marksWindow?.state !== "closed" || !viewer.isParticipant) {
    return null;
  }
  const m = messagesFor(locale);
  return {
    title: m.marks.give.youGave(viewer.given.length, MARKS_PER_GAME),
    line: sentences(
      [givenPairs(data, locale), marksClosedCopy(marksWindow.closesAt, locale)],
      locale,
    ),
    coins: viewer.given.map((mark) => mark.kind),
  };
}

export type RosterRow = {
  userId: string;
  name: string;
  /** The name as typed, for the avatar: `name` reads "You" on the viewer's row. */
  fullName: string;
  image: string | null;
  isViewer: boolean;
  sub: string | null;
  coins: CoinKind[];
  /** `×N` marks received; null with none. */
  count: string | null;
  coinsSpoken: string | null;
};

export type RosterSide = {
  slot: MatchSlot;
  label: string;
  bib: FootballBib | null;
  rows: RosterRow[];
};

export type RosterModel = {
  title: string;
  meta: string;
  sides: RosterSide[];
  footnote: string | null;
};

function rosterRow(
  data: GameMarks,
  participant: GameMarksParticipant,
  locale: Locale,
): RosterRow {
  const m = messagesFor(locale);
  const isMvp = settledMvpId(data) === participant.userId;
  const coins: CoinKind[] = [
    ...(isMvp ? (["mvp"] as const) : []),
    ...participant.received.map((entry) => entry.kind),
  ];
  const received = marksReceived(participant);
  const spokenCoins = joinParts(
    [
      isMvp ? markName("mvp", locale) : null,
      ...participant.received.map(
        (entry) =>
          `${markName(entry.kind, locale)} ${m.marks.count(entry.count)}`,
      ),
    ],
    locale,
  );
  return {
    userId: participant.userId,
    name: participant.isViewer ? m.common.you : participant.name,
    fullName: participant.name,
    image: participant.image,
    isViewer: participant.isViewer,
    sub: joinParts(
      [
        participant.isUnclaimed ? m.group.addPlayer.notOnTembaYet : null,
        ...footballHints(participant, locale),
        isMvp ? markName("mvp", locale) : null,
      ],
      locale,
    ),
    coins,
    count: received > 0 ? m.marks.count(received) : null,
    coinsSpoken:
      coins.length > 0 && spokenCoins
        ? m.webMarks.roster.coinsSpoken(participant.name, spokenCoins)
        : null,
  };
}

/** "Marks so far" (2a) and "Marks" (2f): both sides, each participant's coins. */
export function rosterModel(data: GameMarks, locale: Locale): RosterModel {
  const m = messagesFor(locale);
  const rows = data.participants.map((participant) =>
    rosterRow(data, participant, locale),
  );
  const anyCoins = rows.some((row) => row.coins.length > 0);
  return {
    title:
      data.window?.state === "closed"
        ? m.webMarks.roster.closedTitle
        : m.webMarks.roster.openTitle,
    meta: m.marks.soFar(data.summary.given, data.summary.givers),
    sides: SLOTS.map((slot) => ({
      slot,
      label: marksSideLabel(data, slot, locale),
      bib: sideBib(data, slot),
      rows: rows.filter((_, index) => data.participants[index]?.slot === slot),
    })).filter((side) => side.rows.length > 0),
    footnote: anyCoins ? m.webMarks.roster.footnote : null,
  };
}

export type GivePlayerRow = {
  userId: string;
  name: string;
  image: string | null;
  sub: string | null;
  /** The mark the viewer gave this player, with its Take back. */
  given: MarkKind | null;
  givenName: string | null;
  retractSpoken: string | null;
  canPick: boolean;
};

export type GivePlayerGroup = {
  relation: MarkRelation;
  title: string;
  caption: string;
  rows: GivePlayerRow[];
};

export type GivePlayersModel = {
  title: string;
  subtitle: string;
  groups: GivePlayerGroup[];
};

/** 2b: everyone but the viewer, their own side first. */
export function givePlayersModel(
  data: GameMarks,
  locale: Locale,
): GivePlayersModel {
  const m = messagesFor(locale);
  const mm = m.webMarks.pickPlayer;
  const own = viewerSlot(data);
  const remaining = data.viewer.remaining;
  const row = (participant: GameMarksParticipant): GivePlayerRow => {
    const given =
      data.viewer.given.find(
        (mark) => mark.receiverUserId === participant.userId,
      )?.kind ?? null;
    const givenName = given ? markName(given, locale) : null;
    return {
      userId: participant.userId,
      name: participant.name,
      image: participant.image,
      sub: joinParts(
        [
          participant.isUnclaimed ? m.group.addPlayer.notOnTembaYet : null,
          ...footballHints(participant, locale),
        ],
        locale,
      ),
      given,
      givenName,
      retractSpoken: givenName
        ? mm.retractSpoken(givenName, participant.name)
        : null,
      canPick: remaining > 0 && given === null,
    };
  };
  const others = data.participants.filter(
    (participant) => !participant.isViewer,
  );
  const otherSlot: MatchSlot = own === 1 ? 2 : 1;
  const groups: GivePlayerGroup[] = [
    {
      relation: "teammate",
      title: mm.ownSide(marksSideLabel(data, own, locale)),
      caption: mm.ownCaption,
      rows: others.filter((participant) => participant.slot === own).map(row),
    },
    {
      relation: "opponent",
      title: mm.otherSide(marksSideLabel(data, otherSlot, locale)),
      caption: mm.otherCaption,
      rows: others
        .filter((participant) => participant.slot === otherSlot)
        .map(row),
    },
  ];
  return {
    title: mm.title,
    subtitle: remaining > 0 ? mm.subtitle(remaining) : m.webMarks.give.noneLeft,
    groups: groups.filter((group) => group.rows.length > 0),
  };
}

export type MarkChoice = { kind: MarkKind; name: string };

export type MarkPickModel = {
  title: string;
  subtitle: string;
  groups: {
    key: "main" | "roasts";
    title: string;
    caption: string | null;
    kinds: MarkChoice[];
  }[];
  footnote: string;
  picked: { line: string; remaining: string; cta: string } | null;
  choose: string;
};

/** Why a kind is not on offer: the other sport's machine, the other side's group. */
function absentKindsNote(
  data: GameMarks,
  relation: MarkRelation,
  locale: Locale,
): string {
  const mm = messagesFor(locale).webMarks.pickMark;
  const sportLines = MARK_KINDS.filter(
    (kind) =>
      MARK_META[kind].group === "anyone" &&
      !MARK_META[kind].sports.includes(data.sport),
  ).map((kind) =>
    MARK_META[kind].sports.includes("padel")
      ? mm.padelOnly(markName(kind, locale))
      : mm.footballOnly(markName(kind, locale)),
  );
  const otherGroup = relation === "teammate" ? "opponent" : "teammate";
  const example = MARK_KINDS.find(
    (kind) => MARK_META[kind].group === otherGroup && !MARK_META[kind].roast,
  );
  const sideLine = example
    ? relation === "teammate"
      ? mm.opponentOnly(markName(example, locale))
      : mm.teammateOnly(markName(example, locale))
    : null;
  return [...sportLines, sideLine].filter(Boolean).join(" ");
}

/** 2c: exactly the kinds this giver may give this receiver, Roasts apart. */
export function markPickModel(
  data: GameMarks,
  receiverUserId: string,
  pickedKind: MarkKind | null,
  locale: Locale,
): MarkPickModel | null {
  const receiver = participantOf(data, receiverUserId);
  if (!receiver || receiver.isViewer) {
    return null;
  }
  const m = messagesFor(locale);
  const mm = m.webMarks.pickMark;
  const relation = markRelation(viewerSlot(data), receiver.slot);
  const kinds = givableKinds({ sport: data.sport, relation });
  const choice = (kind: MarkKind) => ({ kind, name: markName(kind, locale) });
  const main = kinds.filter((kind) => !MARK_META[kind].roast).map(choice);
  const roasts = kinds.filter((kind) => MARK_META[kind].roast).map(choice);
  const picked = pickedKind && kinds.includes(pickedKind) ? pickedKind : null;
  const pickedName = picked ? markName(picked, locale) : null;
  return {
    title: mm.title(firstName(receiver.name)),
    subtitle:
      relation === "teammate" ? mm.teammateSubtitle : mm.opponentSubtitle,
    groups: [
      {
        key: "main" as const,
        title: relation === "teammate" ? mm.forTeammate : mm.forOpponent,
        caption: null,
        kinds: main,
      },
      {
        key: "roasts" as const,
        title: mm.roasts,
        caption: mm.roastsCaption,
        kinds: roasts,
      },
    ].filter((group) => group.kinds.length > 0),
    footnote: absentKindsNote(data, relation, locale),
    picked: pickedName
      ? {
          line: mm.picked(pickedName, receiver.name),
          remaining: mm.leftAfter(Math.max(0, data.viewer.remaining - 1)),
          cta: mm.give(pickedName),
        }
      : null,
    choose: mm.choose,
  };
}

export type CandidateRow = {
  userId: string;
  name: string;
  image: string | null;
  sub: string | null;
  coins: MarkKind[];
  marks: string;
};

function candidateRow(
  participant: GameMarksParticipant,
  sub: (string | null)[],
  locale: Locale,
): CandidateRow {
  return {
    userId: participant.userId,
    name: participant.name,
    image: participant.image,
    sub: joinParts(sub, locale),
    coins: participant.received.map((entry) => entry.kind),
    marks: messagesFor(locale).webMarks.marksCount(marksReceived(participant)),
  };
}

export type CandidateSheetModel = {
  title: string;
  subtitle: string;
  rows: CandidateRow[];
  selected: string | null;
  cta: { label: string; enabled: boolean };
};

export type VoteSheetModel = CandidateSheetModel & {
  progress: string;
  tieRule: string;
  current: string | null;
};

/** 2d: any participant but the viewer; never anyone's votes, only the count. */
export function voteSheetModel(
  data: GameMarks,
  picked: string | null,
  locale: Locale,
): VoteSheetModel {
  const m = messagesFor(locale);
  const mm = m.webMarks.vote;
  const rows = data.participants
    .filter((participant) => !participant.isViewer)
    .map((participant) =>
      candidateRow(
        participant,
        [
          marksSideLabel(data, participant.slot, locale),
          ...footballHints(participant, locale),
        ],
        locale,
      ),
    );
  const current = data.viewer.vote;
  const selected =
    [picked, current].find(
      (userId) => userId && rows.some((row) => row.userId === userId),
    ) ?? null;
  return {
    title: mm.title,
    subtitle: mm.subtitle(
      data.window ? formatMarksClose(data.window.closesAt, locale) : "",
    ),
    rows,
    selected,
    progress: mm.progress(data.mvp.votes.cast, data.mvp.votes.eligible),
    tieRule: mm.tieRule,
    current: current ? mm.current(nameOf(data, current, locale)) : null,
    cta: {
      label: selected
        ? mm.cta(firstName(nameOf(data, selected, locale)))
        : m.marks.mvp.vote,
      enabled: selected !== null && selected !== current,
    },
  };
}

export type PickSheetModel = CandidateSheetModel & {
  footnote: string | null;
};

/**
 * 2e: the Organizer's pick, sorted by marks received then goals. In a tied
 * vote only the tied players; in organizer mode anyone but the Organizer.
 */
export function pickSheetModel(
  data: GameMarks,
  picked: string | null,
  locale: Locale,
): PickSheetModel {
  const m = messagesFor(locale);
  const tied = data.mvp.state === "tie" ? data.mvp.tiedUserIds : null;
  const candidates = data.participants
    .filter((participant) =>
      tied ? tied.includes(participant.userId) : !participant.isViewer,
    )
    .sort(
      (left, right) =>
        marksReceived(right) - marksReceived(left) ||
        (right.goals ?? 0) - (left.goals ?? 0) ||
        left.name.localeCompare(right.name),
    );
  const rows = candidates.map((participant) =>
    candidateRow(
      participant,
      [
        participant.goals ? m.game.played.goals(participant.goals) : null,
        participant.keeper ? m.football.board.seatKeeper : null,
        marksSideLabel(data, participant.slot, locale),
      ],
      locale,
    ),
  );
  const current =
    data.mvp.mode === "organizer" && data.mvp.state === "decided"
      ? data.mvp.userId
      : null;
  const selected =
    [picked, current].find(
      (userId) => userId && rows.some((row) => row.userId === userId),
    ) ?? null;
  return {
    title: m.marks.mvp.pick,
    subtitle: tied
      ? m.marks.mvp.tieNotice(tied.length)
      : m.webMarks.pick.subtitle,
    rows,
    selected,
    footnote: tied ? null : m.webMarks.pick.footnote,
    cta: {
      label: selected
        ? m.marks.mvp.make(firstName(nameOf(data, selected, locale)))
        : m.marks.mvp.pick,
      enabled: selected !== null && selected !== current,
    },
  };
}

export type CoinGiversModel = {
  title: string;
  kinds: {
    kind: CoinKind;
    name: string;
    count: string | null;
    note: string | null;
    givers: {
      userId: string;
      name: string;
      image: string | null;
      relation: string | null;
    }[];
  }[];
};

/** E24: who gave each coin a player holds on this Game, teammate or opponent. */
export function coinGiversModel(
  data: GameMarks,
  receiverUserId: string,
  locale: Locale,
): CoinGiversModel | null {
  const receiver = participantOf(data, receiverUserId);
  if (!receiver) {
    return null;
  }
  const m = messagesFor(locale);
  const isMvp = settledMvpId(data) === receiverUserId;
  const mvpKind = isMvp
    ? [
        {
          kind: "mvp" as const,
          name: markName("mvp", locale),
          count: null,
          note: data.mvp.decidedBy
            ? mvpDecidedByCopy(data.mvp.decidedBy, data.mvp.votes, locale)
            : null,
          givers: [],
        },
      ]
    : [];
  const markKinds = receiver.received.map((entry) => ({
    kind: entry.kind,
    name: markName(entry.kind, locale),
    count: m.marks.count(entry.count),
    note: null,
    givers: data.marks
      .filter(
        (mark) =>
          mark.receiverUserId === receiverUserId && mark.kind === entry.kind,
      )
      .map((mark) => {
        const giver = participantOf(data, mark.giverUserId);
        return {
          userId: mark.giverUserId,
          name: giver?.name ?? m.common.someone,
          image: giver?.image ?? null,
          relation: giver
            ? markRelationCopy(markRelation(giver.slot, receiver.slot), locale)
            : null,
        };
      }),
  }));
  return {
    title: m.webMarks.givers.title(receiver.name),
    kinds: [...mvpKind, ...markKinds],
  };
}

/** The refused-state copy for a give or a take back; the server sends the reason as the message. */
export function markErrorCopy(message: string, locale: Locale): string {
  return isMarkRefusal(message)
    ? markRefusedCopy(message, locale)
    : messagesFor(locale).common.somethingWentWrong;
}

export function mvpErrorCopy(message: string, locale: Locale): string {
  return isMvpRefusal(message)
    ? mvpRefusedCopy(message, locale)
    : messagesFor(locale).common.somethingWentWrong;
}

/** How long until the open window closes and the screen must refetch; null when nothing is due. */
export function msUntilMarksClose(
  data: GameMarks | undefined,
  now: Date,
): number | null {
  if (data?.window?.state !== "open") {
    return null;
  }
  return Math.max(0, data.window.closesAt.getTime() - now.getTime());
}
