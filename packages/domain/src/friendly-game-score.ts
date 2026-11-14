import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { formatMatchSlotLabel } from "./game-side-label";

export type FriendlyScorePhase =
  | "upcoming"
  | "ongoing"
  | "needs_results"
  | "final";

export type FriendlyScoreSide = {
  sideIndex: number;
  gameTeamId: string | null;
  left: { userId: string; name: string } | null;
  right: { userId: string; name: string } | null;
};

export type FriendlyScoreSet = {
  slot1GamesWon: number | null;
  slot2GamesWon: number | null;
};

export type SetBoxState =
  | "locked"
  | "unplayed"
  | "enterable"
  | "readonly"
  | "solid"
  | "outline";

export function scoreIncompleteMessage(locale: Locale) {
  return messagesFor(locale).game.score.incompleteMessage;
}

export function scorePhaseFlags(phase: FriendlyScorePhase) {
  return {
    isUpcoming: phase === "upcoming" || phase === "ongoing",
    isFinal: phase === "final",
  };
}

export function scoreCanEnter(
  phase: FriendlyScorePhase,
  matchCanScoreSets: boolean,
) {
  return phase === "needs_results" && matchCanScoreSets;
}

export function scoreNameByUserId(sides: readonly FriendlyScoreSide[]) {
  const map = new Map<string, string>();
  for (const side of sides) {
    if (side.left) {
      map.set(side.left.userId, side.left.name);
    }
    if (side.right) {
      map.set(side.right.userId, side.right.name);
    }
  }
  return map;
}

export function scoreTeamNamesLabel(side: FriendlyScoreSide, locale: Locale) {
  const m = messagesFor(locale).game.score;
  return m.pairNames(side.left?.name ?? m.open, side.right?.name ?? m.open);
}

/**
 * Side 1 always backs Match slot 1 and side 2 slot 2, even before either
 * side's Game team exists yet.
 */
export function scoreGamesWonForSide(set: FriendlyScoreSet, sideIndex: number) {
  return sideIndex === 1 ? set.slot1GamesWon : set.slot2GamesWon;
}

export function scoreSetNeverPlayed(set: FriendlyScoreSet) {
  return set.slot1GamesWon == null && set.slot2GamesWon == null;
}

/**
 * The Set columns the score card shows. A final score is the Sets that were
 * played: an empty Set shell left from entry is no part of it.
 */
export function scoreShownSets<T extends FriendlyScoreSet>(
  phase: FriendlyScorePhase,
  sets: readonly T[],
): T[] {
  if (phase !== "final") {
    return [...sets];
  }
  const played = sets.filter((set) => !scoreSetNeverPlayed(set));
  return played.length > 0 ? played : [...sets];
}

export function scoreSetBoxState(input: {
  phase: FriendlyScorePhase;
  neverPlayed: boolean;
  canEnter: boolean;
  isWinningSide: boolean;
}): SetBoxState {
  const { isUpcoming, isFinal } = scorePhaseFlags(input.phase);
  if (isUpcoming) {
    return "locked";
  }
  if (isFinal) {
    if (input.neverPlayed) {
      return "unplayed";
    }
    return input.isWinningSide ? "solid" : "outline";
  }
  return input.canEnter ? "enterable" : "readonly";
}

export function scoreSetBoxAccessibleLabel(
  state: SetBoxState,
  label: string,
  value: number | null,
  locale: Locale,
) {
  const m = messagesFor(locale).game.score;
  if (state === "solid") {
    return m.wonSet(label, value ?? 0);
  }
  if (state === "outline") {
    return m.lostSet(label, value ?? 0);
  }
  if (state === "readonly") {
    return value == null ? m.notEntered(label) : m.entered(label, value);
  }
  return label;
}

export function scoreFooterNote(
  phase: FriendlyScorePhase,
  confirmedAtLabel: string | null,
  locale: Locale,
  confirmedByOrganizer = false,
  stampedByName: string | null = null,
) {
  const m = messagesFor(locale).game.score;
  if (phase === "final" && stampedByName) {
    return messagesFor(locale).rating.verifier.stamp.stampedFinal(
      stampedByName,
    );
  }
  if (phase === "final" && confirmedByOrganizer) {
    return m.confirmedByOrganizer;
  }
  if (phase === "final") {
    return confirmedAtLabel
      ? m.confirmedByAllOn(confirmedAtLabel)
      : m.confirmedByAll;
  }
  if (phase === "needs_results") {
    return m.noScoreYet;
  }
  return m.scoringOpens;
}

export type ScoreOrganizerSide = { slot: 1 | 2; confirmed: boolean };

export type ScoreConfirmation = {
  confirmedUserIds: string[];
  requiredUserIds: string[];
  viewerHasConfirmed: boolean;
  organizerSides?: ScoreOrganizerSide[];
};

export function scoreConfirmationRows(
  confirmation: ScoreConfirmation,
  viewerUserId: string,
  names: ReadonlyMap<string, string>,
  locale: Locale,
) {
  const m = messagesFor(locale).game.score;
  const confirmed = new Set(confirmation.confirmedUserIds);
  return confirmation.requiredUserIds.map((userId) => {
    const name = names.get(userId) ?? m.player;
    return {
      userId,
      label: userId === viewerUserId ? m.youSuffix(name) : name,
      confirmed: confirmed.has(userId),
      status: confirmed.has(userId) ? m.confirmed : m.waiting,
    };
  });
}

export function scoreShowsConfirmations(input: {
  confirmation: ScoreConfirmation | null;
  hasResult: boolean;
  phase: FriendlyScorePhase;
}) {
  return (
    input.confirmation != null &&
    input.hasResult &&
    input.phase === "needs_results"
  );
}

/**
 * A Public Game's entered score waits 24 hours for one player of the other
 * side (ADR-0071). `viewerMayConfirm` is whether the viewer's side has yet
 * to agree.
 */
export type ScoreConfirmWindow = { closesAt: Date; viewerMayConfirm: boolean };

export function scoreCanConfirm(input: {
  confirmation: ScoreConfirmation | null;
  hasResult: boolean;
  phase: FriendlyScorePhase;
  viewerUserId: string;
  confirmWindow?: ScoreConfirmWindow | null;
}) {
  return (
    input.confirmation != null &&
    input.hasResult &&
    input.phase !== "final" &&
    input.confirmation.requiredUserIds.includes(input.viewerUserId) &&
    !input.confirmation.viewerHasConfirmed &&
    (input.confirmWindow?.viewerMayConfirm ?? true)
  );
}

const MS_PER_MINUTE = 60_000;

/**
 * The time left on a Public Game's confirm window, said to the side it waits
 * on or to everyone else. Once it has run out the score stands and does not
 * count.
 */
export function scoreConfirmWindowLine(
  window: ScoreConfirmWindow | null | undefined,
  now: Date,
  locale: Locale,
): string | null {
  if (!window) {
    return null;
  }
  const m = messagesFor(locale).rating.publicGame;
  const minutes = Math.ceil(
    (new Date(window.closesAt).getTime() - now.getTime()) / MS_PER_MINUTE,
  );
  if (minutes <= 0) {
    return m.stood;
  }
  const left =
    minutes < 60
      ? m.confirmWindow.minutes(minutes)
      : m.confirmWindow.hours(Math.floor(minutes / 60));
  return window.viewerMayConfirm
    ? m.confirmWindow.yours(left)
    : m.confirmWindow.theirs(left);
}

/** A side with no account holder waits on an Organizer's confirmation. */
export function scoreOrganizerWaitingLines(
  confirmation: ScoreConfirmation,
  locale: Locale,
) {
  return (confirmation.organizerSides ?? [])
    .filter((side) => !side.confirmed)
    .map((side) =>
      messagesFor(locale).game.score.organizerWaiting(
        formatMatchSlotLabel("friendly_game", side.slot, locale),
      ),
    );
}

/** An Organizer's confirmation is final: it skips waiting on the players. */
export function scoreOrganizerCanConfirm(input: {
  confirmation: ScoreConfirmation | null;
  hasResult: boolean;
  phase: FriendlyScorePhase;
  isOrganizer: boolean;
}) {
  return (
    input.isOrganizer &&
    input.confirmation != null &&
    input.hasResult &&
    input.phase !== "final"
  );
}

export function organizerConfirmNote(locale: Locale) {
  return messagesFor(locale).game.score.organizerConfirmNote;
}
