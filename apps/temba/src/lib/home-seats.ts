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

/** Flatten 2×2 (or any side pair) at the Home call site. Seat UI never sees sides. */
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
