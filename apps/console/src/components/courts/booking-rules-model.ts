/** `Up to the start`, `30 min before`, `2h before`: the design's Last minute line. */
export function describeLeadTime(minLeadMinutes: number) {
  if (minLeadMinutes <= 0) {
    return "Up to the start";
  }
  if (minLeadMinutes % 60 === 0) {
    return `${minLeadMinutes / 60}h before`;
  }
  return `${minLeadMinutes} min before`;
}

export function describeHorizon(bookingHorizonDays: number) {
  return bookingHorizonDays === 1
    ? "Up to 1 day"
    : `Up to ${bookingHorizonDays} days`;
}
