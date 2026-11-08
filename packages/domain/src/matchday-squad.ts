import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import {
  footballSlotCode,
  type FootballPosition,
  type FootballRole,
} from "./football-lineup";
import { formatWeekday } from "./format-game-start";
import { sideSizeLabel } from "./game-shape";
import { displayLabelFromStoredBand, type LevelBand } from "./level-bands";

/** Seats beyond the side on a Matchday squad. */
export const SQUAD_RESERVE_SEATS = 3;

/**
 * `empty` with nobody named, `partial` short of the side, `named` at the side
 * or more, `locked` once the Score is entered or the Match is completed.
 */
export type SquadState = "empty" | "partial" | "named" | "locked";

export function squadSeatCount(sideSize: number) {
  return sideSize + SQUAD_RESERVE_SEATS;
}

export function squadState(
  namedCount: number,
  sideSize: number,
  options: { locked?: boolean } = {},
): SquadState {
  if (options.locked) {
    return "locked";
  }
  if (namedCount <= 0) {
    return "empty";
  }
  return namedCount < sideSize ? "partial" : "named";
}

/** Both sides have at least the side's worth named, so a Score may be entered. */
export function squadsReadyForScore(states: readonly SquadState[]) {
  return (
    states.length === 2 &&
    states.every((state) => state === "named" || state === "locked")
  );
}

export type SquadSeat<T> = {
  index: number;
  kind: "side" | "reserve";
  label: string;
  player: T | null;
};

/**
 * A side's `side + 3` seats in naming order: the first `sideSize` are the
 * side, the last three are labelled Reserve so an empty Reserve never reads
 * as a missing player.
 */
export function squadSeats<T>(
  named: readonly T[],
  sideSize: number,
  locale: Locale,
): SquadSeat<T>[] {
  const m = messagesFor(locale).challenge.squad;
  return Array.from({ length: squadSeatCount(sideSize) }, (_, index) => {
    const kind = index < sideSize ? "side" : "reserve";
    return {
      index,
      kind,
      label: kind === "side" ? m.side : m.reserve,
      player: named[index] ?? null,
    };
  });
}

/** "6 of 9 named, 6 + 3 reserves", "4 + 5 to name, 4 of 9", "Nobody named yet, 0 of 9". */
export function squadCounterLine(
  namedCount: number,
  sideSize: number,
  locale: Locale,
) {
  const m = messagesFor(locale).challenge.squad;
  const seats = squadSeatCount(sideSize);
  if (namedCount <= 0) {
    return m.counterEmpty(seats);
  }
  if (namedCount < sideSize) {
    return m.counterShort(namedCount, seats - namedCount, seats);
  }
  return m.counterNamed(namedCount, seats, sideSize, SQUAD_RESERVE_SEATS);
}

/**
 * The Name your squad sheet: who is selected, in naming order. A side nobody
 * has named yet starts with the Captain, when the Captain is on the Roster.
 */
export function initialSquadSelection(
  namedUserIds: readonly string[],
  captainUserId: string | null,
  rosterUserIds: readonly string[],
): string[] {
  if (namedUserIds.length > 0) {
    return [...namedUserIds];
  }
  return captainUserId && rosterUserIds.includes(captainUserId)
    ? [captainUserId]
    : [];
}

/** Tapping a Roster row: off the squad if on it, else appended while a seat is free. */
export function toggleSquadSelection(
  selected: readonly string[],
  userId: string,
  sideSize: number,
): string[] {
  if (selected.includes(userId)) {
    return selected.filter((id) => id !== userId);
  }
  if (selected.length >= squadSeatCount(sideSize)) {
    return [...selected];
  }
  return [...selected, userId];
}

export function squadSelectionIsFull(
  selected: readonly string[],
  sideSize: number,
) {
  return selected.length >= squadSeatCount(sideSize);
}

/** Saving the same names in the same order changes nothing. */
export function squadSelectionChanged(
  saved: readonly string[],
  selected: readonly string[],
) {
  return (
    saved.length !== selected.length ||
    saved.some((userId, index) => selected[index] !== userId)
  );
}

/**
 * The sheet's copy: "Your squad for Friday", the help line, "6 of 9 named
 * from 12 on the roster", the side and Reserve counters, the short-side or
 * full line, the footer, and "Confirm squad, N named".
 */
export function squadSheetCopy(
  input: {
    sideSize: number;
    selectedCount: number;
    rosterCount: number;
    kickoff: Date | string | null;
  },
  locale: Locale,
) {
  const m = messagesFor(locale).challenge.squad.sheet;
  const seats = squadSeatCount(input.sideSize);
  const short = Math.max(0, input.sideSize - input.selectedCount);
  return {
    title: input.kickoff
      ? m.title(formatWeekday(input.kickoff, "long", locale))
      : m.titleUndated,
    help: m.help(
      sideSizeLabel(input.sideSize, locale),
      input.sideSize,
      SQUAD_RESERVE_SEATS,
    ),
    counter: m.counter(input.selectedCount, seats, input.rosterCount),
    sideCounter: m.sideCounter(input.sideSize),
    reserveCounter: m.reserveCounter(SQUAD_RESERVE_SEATS),
    stateLine:
      short > 0
        ? m.short(short)
        : input.selectedCount >= seats
          ? m.full(seats)
          : null,
    footer: m.footer,
    confirmLabel: m.confirm(input.selectedCount),
  };
}

export type SquadPlayer = {
  userId: string;
  name: string;
  role: FootballRole | null;
  position: FootballPosition | null;
  levelBand?: LevelBand | null;
  unclaimed?: boolean;
};

function roleName(role: FootballRole | null, locale: Locale) {
  const m = messagesFor(locale).team.seat;
  return role === "keeper" ? m.keeper : m.outfield;
}

/** "GK · C+" for a Roster row or a named tile: the position code and the Level band. */
export function squadPlayerMeta(player: SquadPlayer, locale: Locale) {
  return [
    footballSlotCode(player.role, player.position, locale),
    player.levelBand ? displayLabelFromStoredBand(player.levelBand) : null,
  ]
    .filter((part): part is string => part != null)
    .join(" · ");
}

/** A side's seats for the grid: named tiles with their role, hatched empties, each with its label. */
export function squadSeatViews(
  named: readonly SquadPlayer[],
  sideSize: number,
  locale: Locale,
) {
  const m = messagesFor(locale).challenge.squad;
  return squadSeats(named, sideSize, locale).map((seat) => ({
    key: seat.player ? seat.player.userId : `seat-${seat.index}`,
    kind: seat.kind,
    label: seat.label,
    player: seat.player
      ? {
          userId: seat.player.userId,
          name: seat.player.name,
          meta: squadPlayerMeta(seat.player, locale),
          unclaimed: seat.player.unclaimed ?? false,
        }
      : null,
    accessibilityLabel: seat.player
      ? m.seatNamed(
          seat.label,
          seat.player.name,
          roleName(seat.player.role, locale),
        )
      : m.seatEmpty(seat.label),
  }));
}

/** "Name your squad" while nobody is named on the side, "Edit your squad" after. */
export function squadButtonCopy(
  namedCount: number,
  teamName: string,
  locale: Locale,
) {
  const m = messagesFor(locale).challenge.squad;
  return namedCount > 0
    ? { label: m.editYourSquad, accessibilityLabel: m.editSquadFor(teamName) }
    : { label: m.nameYourSquad, accessibilityLabel: m.nameSquadFor(teamName) };
}
