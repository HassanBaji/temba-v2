export type HomeSeatView = {
  id: string;
  name: string | null;
  image?: string | null;
  filled: boolean;
  sideLabel?: string;
};

type SideOccupant = {
  userId: string;
  name: string;
  image?: string | null;
} | null;

type SidePair = {
  sideIndex: number;
  left: SideOccupant;
  right: SideOccupant;
};

/** Flatten 2×2 (or any side pair) at the Home call site. `sideLabel` lets the seat row split teams. */
export function flattenSidesToHomeSeats(
  sides: readonly SidePair[],
): HomeSeatView[] {
  const seats: HomeSeatView[] = [];
  for (const side of sides) {
    const sideLabel =
      side.sideIndex === 0 ? "A" : side.sideIndex === 1 ? "B" : undefined;
    seats.push(occupantToSeat(`${side.sideIndex}-left`, side.left, sideLabel));
    seats.push(
      occupantToSeat(`${side.sideIndex}-right`, side.right, sideLabel),
    );
  }
  return seats;
}

/**
 * Hub rows for Friendly tournaments omit sides, so flattening them would
 * look like 0 of 0 / Full. Fall back to the player cap so an empty field
 * still reads as open.
 */
export function homeNextGameSeats(
  sides: readonly SidePair[],
  registeredUserCount: number,
  playersAllowed: number | null | undefined,
): HomeSeatView[] {
  if (sides.length > 0) {
    return flattenSidesToHomeSeats(sides);
  }
  const total = playersAllowed ?? 0;
  if (total < 1) {
    return [];
  }
  return Array.from({ length: total }, (_, index) => ({
    id: `occupancy-${index}`,
    name: null,
    filled: index < registeredUserCount,
  }));
}

export function homeSpotsOpenLabel(open: number, total: number): string | null {
  if (total < 1) {
    return null;
  }
  if (open === 0) {
    return "Full";
  }
  if (open === 1) {
    return "One spot open";
  }
  return `${open} spots open`;
}

function occupantToSeat(
  id: string,
  occupant: SideOccupant,
  sideLabel?: string,
): HomeSeatView {
  if (!occupant) {
    return { id, name: null, filled: false, sideLabel };
  }
  return {
    id,
    name: occupant.name,
    image: occupant.image,
    filled: true,
    sideLabel,
  };
}
