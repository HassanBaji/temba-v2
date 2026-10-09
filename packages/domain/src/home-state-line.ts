const SMALL = [
  "Zero",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
] as const;

function cardinal(count: number): string {
  return SMALL[count] ?? String(count);
}

/** One line of Home header state. Prefers invites; otherwise booked games. */
export function homeStateLine(
  pendingInviteCount: number,
  bookedGameCount: number,
): string | null {
  if (pendingInviteCount > 0) {
    return pendingInviteCount === 1
      ? "One invite waiting"
      : `${cardinal(pendingInviteCount)} invites waiting`;
  }
  if (bookedGameCount > 0) {
    return bookedGameCount === 1
      ? "One game booked"
      : `${cardinal(bookedGameCount)} games booked`;
  }
  return null;
}
