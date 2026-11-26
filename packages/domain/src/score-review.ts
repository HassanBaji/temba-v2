import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { formatGameClock } from "./format-game-start";
import { scoreTeamFirstNames } from "./friendly-game-court";
import {
  scoreCanConfirm,
  scoreOrganizerCanConfirm,
  type FriendlyScoreSet,
  type ScoreConfirmWindow,
  type ScoreConfirmation,
  type SetBoxState,
} from "./friendly-game-score";
import { matchOutcome } from "./match-outcome";
import { setWinsForGames } from "./set-wins-for-games";

/**
 * Why a player changed an entered padel score (ADR-0114). Optional: the
 * change itself is what the other side confirms.
 */
export const SCORE_CHANGE_REASONS = [
  "set_score_wrong",
  "sets_swapped",
  "not_finished",
  "other",
] as const;

export type ScoreChangeReason = (typeof SCORE_CHANGE_REASONS)[number];

export type ScoreChange = {
  reason: ScoreChangeReason | null;
  previousSets: FriendlyScoreSet[];
};

/**
 * Who put in the score a Match is waiting on, and what it replaced when it
 * was a change to an entered score.
 */
export type ScoreEntry = {
  enteredByUserId: string;
  enteredByName: string;
  enteredAt: Date | string;
  change: ScoreChange | null;
};

type ReviewPhase = "upcoming" | "ongoing" | "needs_results" | "final";

/**
 * A padel Match with a score in and not yet confirmed. From here the score
 * is read-only until a player chooses to change it: the action is to confirm
 * it or dispute it, not to fill in a form.
 */
export function scoreInReview(input: {
  phase: ReviewPhase;
  hasResult: boolean;
}) {
  return (
    input.hasResult &&
    (input.phase === "ongoing" || input.phase === "needs_results")
  );
}

/**
 * A Set box while the score is in review: solid for the side that won the
 * Set, outline for the side that lost it, hatched for a Set not played.
 */
export function scoreReviewBoxState(input: {
  set: FriendlyScoreSet;
  sideIndex: number;
  editing: boolean;
}): SetBoxState {
  if (input.editing) {
    return "enterable";
  }
  const wins = setWinsForGames(
    input.set.slot1GamesWon,
    input.set.slot2GamesWon,
  );
  if (!wins) {
    return "unplayed";
  }
  if (wins.slot1SetWins === wins.slot2SetWins) {
    return "readonly";
  }
  const sideWon =
    input.sideIndex === 1 ? wins.slot1SetWins > 0 : wins.slot2SetWins > 0;
  return sideWon ? "solid" : "outline";
}

function sameGames(left: FriendlyScoreSet, right: FriendlyScoreSet) {
  return (
    left.slot1GamesWon === right.slot1GamesWon &&
    left.slot2GamesWon === right.slot2GamesWon
  );
}

/** The Set numbers, from 1, whose games differ between two scores. */
export function scoreChangedSetNumbers(
  before: readonly FriendlyScoreSet[],
  after: readonly FriendlyScoreSet[],
) {
  const count = Math.max(before.length, after.length);
  const empty = { slot1GamesWon: null, slot2GamesWon: null };
  return Array.from({ length: count }, (_, index) => index + 1).filter(
    (setNumber) =>
      !sameGames(before[setNumber - 1] ?? empty, after[setNumber - 1] ?? empty),
  );
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

function playedSetsText(sets: readonly FriendlyScoreSet[]) {
  return sets
    .flatMap((set) =>
      set.slot1GamesWon == null || set.slot2GamesWon == null
        ? []
        : [`${set.slot1GamesWon}–${set.slot2GamesWon}`],
    )
    .join(", ");
}

/** "Layla & Rashed won 2–1." under the boxes, or that the Sets are level. */
export function scoreResultLine(
  sets: readonly FriendlyScoreSet[],
  sides: readonly {
    sideIndex: number;
    left: { name: string } | null;
    right: { name: string } | null;
  }[],
  locale: Locale,
) {
  const m = messagesFor(locale).game.scoreReview;
  const outcome = matchOutcome(sets);
  if (outcome.result === "none") {
    return null;
  }
  const high = Math.max(outcome.slot1SetWins, outcome.slot2SetWins);
  const low = Math.min(outcome.slot1SetWins, outcome.slot2SetWins);
  if (outcome.result === "draw") {
    return m.levelInSets(`${high}–${low}`);
  }
  const winner = sides.find(
    (side) => side.sideIndex === (outcome.result === "slot1" ? 1 : 2),
  );
  return winner
    ? m.sideWon(scoreTeamFirstNames(winner, locale), `${high}–${low}`)
    : null;
}

/** Who entered or changed the score and when, or whose score is being changed. */
export function scoreEntryLine(
  input: { entry: ScoreEntry | null; viewerUserId: string; editing: boolean },
  locale: Locale,
) {
  const { entry } = input;
  if (!entry) {
    return null;
  }
  const m = messagesFor(locale).game.scoreReview;
  const own = entry.enteredByUserId === input.viewerUserId;
  if (input.editing) {
    return own ? m.changingOwn : m.changing(firstName(entry.enteredByName));
  }
  const time = formatGameClock(entry.enteredAt, locale);
  if (entry.change) {
    return own ? m.changedByYou(time) : m.changedBy(entry.enteredByName, time);
  }
  return own ? m.enteredByYou(time) : m.enteredBy(entry.enteredByName, time);
}

/**
 * What a changed score replaced, for everyone asked to confirm it: the one
 * Set that moved, or the whole score when more did, and the reason given.
 */
export function scoreChangeNote(
  input: {
    entry: ScoreEntry | null;
    viewerUserId: string;
    sets: readonly FriendlyScoreSet[];
  },
  locale: Locale,
) {
  const change = input.entry?.change;
  if (!input.entry || !change) {
    return null;
  }
  const m = messagesFor(locale).game.scoreReview;
  const own = input.entry.enteredByUserId === input.viewerUserId;
  const name = firstName(input.entry.enteredByName);
  const changed = scoreChangedSetNumbers(change.previousSets, input.sets);
  const [setNumber] = changed;
  const before = setNumber ? change.previousSets[setNumber - 1] : undefined;
  const after = setNumber ? input.sets[setNumber - 1] : undefined;
  const oneSet =
    changed.length === 1 &&
    before != null &&
    after != null &&
    playedSetsText([before]) !== "" &&
    playedSetsText([after]) !== "";
  const from = oneSet
    ? playedSetsText([before])
    : playedSetsText(change.previousSets);
  const to = oneSet ? playedSetsText([after]) : playedSetsText(input.sets);
  const title =
    oneSet && setNumber
      ? own
        ? m.youChangedSet(setNumber, from, to)
        : m.changedSet(name, setNumber, from, to)
      : own
        ? m.youChangedScore(from, to)
        : m.changedScore(name, from, to);
  const reason = change.reason
    ? m.reasonGiven(m.reasonPhrases[change.reason])
    : null;
  return {
    title,
    subline: [reason, m.otherSideAsked].filter(Boolean).join(" "),
  };
}

export function scoreChangeReasonOptions(locale: Locale) {
  const m = messagesFor(locale).game.scoreReview;
  return SCORE_CHANGE_REASONS.map((value) => ({
    value,
    label: m.reasons[value],
  }));
}

export type ScoreReviewActionKind = "confirm" | "edit" | "cancel" | "send";

export type ScoreReviewAction = {
  kind: ScoreReviewActionKind;
  label: string;
  primary: boolean;
  enabled: boolean;
};

export type ScoreReviewBar = {
  title: string;
  subline: string | null;
  actions: ScoreReviewAction[];
};

function viewerResultLine(
  sets: readonly FriendlyScoreSet[],
  previousSets: readonly FriendlyScoreSet[] | null,
  viewerSlot: 1 | 2,
  locale: Locale,
) {
  const m = messagesFor(locale).game.scoreReview;
  const verdict = (score: readonly FriendlyScoreSet[]) => {
    const outcome = matchOutcome(score);
    const own = viewerSlot === 1 ? outcome.slot1SetWins : outcome.slot2SetWins;
    const other =
      viewerSlot === 1 ? outcome.slot2SetWins : outcome.slot1SetWins;
    return {
      tally: `${own}–${other}`,
      result:
        outcome.result === "none"
          ? ("none" as const)
          : own === other
            ? ("level" as const)
            : own > other
              ? ("won" as const)
              : ("lost" as const),
    };
  };
  const now = verdict(sets);
  if (now.result === "none") {
    return null;
  }
  if (now.result === "level") {
    return m.levelAt(now.tally);
  }
  const still =
    previousSets != null && verdict(previousSets).result === now.result;
  if (now.result === "won") {
    return still ? m.teamStillWon(now.tally) : m.teamWon(now.tally);
  }
  return still ? m.teamStillLost(now.tally) : m.teamLost(now.tally);
}

/**
 * The bottom bar once a padel score is in (ADR-0114). A player whose side
 * has yet to confirm gets two actions: confirm the score, or dispute it and
 * send a corrected one. A player whose side is confirmed waits and may still
 * edit. While a change is being made the bar cancels it or sends it, and
 * sends only once something differs. Null for a viewer with nothing to do.
 */
export function scoreReviewBar(
  input: {
    editing: boolean;
    changedSetNumbers: readonly number[];
    draftValid: boolean;
    canConfirm: boolean;
    /** The viewer confirms as an Organizer, whose word is final (ADR-0044). */
    confirmIsFinal: boolean;
    canEdit: boolean;
    viewerUserId: string;
    viewerSlot: 1 | 2 | null;
    entry: ScoreEntry | null;
    sets: readonly FriendlyScoreSet[];
  },
  locale: Locale,
): ScoreReviewBar | null {
  const game = messagesFor(locale).game;
  const m = game.scoreReview;

  if (input.editing) {
    const [firstChanged] = input.changedSetNumbers;
    return {
      title: m.editTitle,
      subline:
        firstChanged == null
          ? m.nothingChanged
          : m.setsChanged(input.changedSetNumbers.length, firstChanged),
      actions: [
        { kind: "cancel", label: m.cancel, primary: false, enabled: true },
        {
          kind: "send",
          label: m.send,
          primary: true,
          enabled: firstChanged != null && input.draftValid,
        },
      ],
    };
  }

  if (!input.canConfirm && !input.canEdit) {
    return null;
  }
  const { entry } = input;
  const own = entry?.enteredByUserId === input.viewerUserId;
  const changed = entry?.change != null;
  const title = own
    ? changed
      ? m.youChangedTitle
      : m.youEnteredTitle
    : entry
      ? changed
        ? m.changedTitle(firstName(entry.enteredByName))
        : m.enteredTitle(firstName(entry.enteredByName))
      : game.cta.addTheScore;
  const edit: ScoreReviewAction[] = input.canEdit
    ? [
        {
          kind: "edit",
          label: input.canConfirm && !own ? m.dispute : m.editScore,
          primary: false,
          enabled: true,
        },
      ]
    : [];

  if (!input.canConfirm) {
    return {
      title,
      subline: game.cta.countsOnceOtherSideConfirms,
      actions: edit,
    };
  }
  const result =
    input.viewerSlot == null || input.confirmIsFinal
      ? null
      : viewerResultLine(
          input.sets,
          entry?.change?.previousSets ?? null,
          input.viewerSlot,
          locale,
        );
  const subline = input.confirmIsFinal
    ? game.score.organizerConfirmNote
    : result == null
      ? null
      : changed
        ? m.confirmNewOrChangeBack(result)
        : m.confirmOrChange(result);
  return {
    title,
    subline,
    actions: [
      ...edit,
      { kind: "confirm", label: m.confirm, primary: true, enabled: true },
    ],
  };
}

/**
 * Everything the score card and the bottom bar need while a padel score is
 * in review, from the Game details payload and the viewer's unsent change.
 * `draftSets` is the score as the viewer has edited it, or null when they
 * are not editing.
 */
export function scoreReviewView(
  input: {
    phase: ReviewPhase | null;
    match: {
      sets: readonly FriendlyScoreSet[];
      outcome: { result: string };
      canScoreSets: boolean;
      slot1GameTeamId: string | null;
      slot2GameTeamId: string | null;
    } | null;
    confirmation:
      | (ScoreConfirmation & { viewerConfirmsAsOrganizer?: boolean })
      | null;
    confirmWindow?: ScoreConfirmWindow | null;
    viewerUserId: string;
    viewerGameTeamId: string | null;
    draftSets: readonly FriendlyScoreSet[] | null;
    draftValid: boolean;
  },
  locale: Locale,
): {
  active: boolean;
  bar: ScoreReviewBar | null;
  changedSetNumbers: number[];
} {
  const { match, phase, confirmation } = input;
  const hasResult = match != null && match.outcome.result !== "none";
  if (!match || !phase || !scoreInReview({ phase, hasResult })) {
    return { active: false, bar: null, changedSetNumbers: [] };
  }
  const editing = input.draftSets != null;
  const changedSetNumbers = input.draftSets
    ? scoreChangedSetNumbers(match.sets, input.draftSets)
    : [];
  const confirmIsFinal = scoreOrganizerCanConfirm({
    confirmation,
    hasResult,
    phase,
    isOrganizer: confirmation?.viewerConfirmsAsOrganizer ?? false,
  });
  const viewerSlot =
    input.viewerGameTeamId == null
      ? null
      : match.slot1GameTeamId === input.viewerGameTeamId
        ? 1
        : match.slot2GameTeamId === input.viewerGameTeamId
          ? 2
          : null;
  return {
    active: true,
    changedSetNumbers,
    bar: scoreReviewBar(
      {
        editing,
        changedSetNumbers,
        draftValid: input.draftValid,
        canConfirm:
          confirmIsFinal ||
          scoreCanConfirm({
            confirmation,
            hasResult,
            phase,
            viewerUserId: input.viewerUserId,
            confirmWindow: input.confirmWindow,
          }),
        confirmIsFinal,
        canEdit: match.canScoreSets,
        viewerUserId: input.viewerUserId,
        viewerSlot,
        entry: confirmation?.scoreEntry ?? null,
        sets: match.sets,
      },
      locale,
    ),
  };
}
