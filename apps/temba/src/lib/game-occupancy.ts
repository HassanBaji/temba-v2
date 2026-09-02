/** Seats left at or below this count reads as urgent on a Game card. */
const FILLING_SEATS_LEFT = 2;

export type GameOccupancyTone = "open" | "filling" | "full";

export type GameOccupancy = {
  /** Compact fill label, e.g. `6/8`. */
  label: string;
  seatsLeft: number;
  tone: GameOccupancyTone;
};

/** Null when the Game has no player cap, so cards can omit the meta entirely. */
export function gameOccupancy(
  registeredUserCount: number,
  playersAllowed: number | null | undefined,
): GameOccupancy | null {
  if (playersAllowed == null) {
    return null;
  }

  const seatsLeft = Math.max(0, playersAllowed - registeredUserCount);

  return {
    label: `${registeredUserCount}/${playersAllowed}`,
    seatsLeft,
    tone:
      seatsLeft === 0
        ? "full"
        : seatsLeft <= FILLING_SEATS_LEFT
          ? "filling"
          : "open",
  };
}

export function seatsLeftLabel(seatsLeft: number) {
  return seatsLeft === 1 ? "1 spot left" : `${seatsLeft} spots left`;
}
