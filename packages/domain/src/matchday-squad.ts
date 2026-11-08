import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

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
