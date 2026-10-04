import { initials } from "./initials";

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

export function homeSeatCaption(
  seat: HomeSeatView,
  useInitials: boolean,
): string | null {
  if (!seat.filled || !seat.name) {
    return null;
  }
  if (useInitials) {
    return initials(seat.name);
  }
  const first = seat.name.trim().split(/\s+/)[0];
  return first ?? seat.name;
}

export function homeSeatsBySide(seats: HomeSeatView[]): HomeSeatView[][] {
  const groups: HomeSeatView[][] = [];
  const indexByLabel = new Map<string, number>();

  for (const seat of seats) {
    const label = seat.sideLabel ?? "";
    const existing = indexByLabel.get(label);
    if (existing === undefined) {
      indexByLabel.set(label, groups.length);
      groups.push([seat]);
      continue;
    }
    groups[existing]?.push(seat);
  }

  return groups;
}

export function homeSeatRowSummary(seats: HomeSeatView[]): {
  filled: number;
  total: number;
  useInitials: boolean;
  spotsLabel: string | null;
} {
  const filled = seats.filter((seat) => seat.filled).length;
  return {
    filled,
    total: seats.length,
    useInitials: seats.length > 6,
    spotsLabel: homeSpotsOpenLabel(seats.length - filled, seats.length),
  };
}
