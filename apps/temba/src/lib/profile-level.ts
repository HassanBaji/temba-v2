export function confirmationFraction(
  ratedMatchCount: number,
  ratedMatchesRemaining: number,
): number {
  const denom = ratedMatchCount + ratedMatchesRemaining;
  if (denom <= 0) {
    return 0;
  }
  return ratedMatchCount / denom;
}

export type LastMatchMovement = "up" | "down" | "held";

export function lastMatchMovement(
  history: readonly string[],
): LastMatchMovement | null {
  if (history.length < 2) {
    return null;
  }
  const previous = Number.parseFloat(history[history.length - 2] ?? "");
  const latest = Number.parseFloat(history[history.length - 1] ?? "");
  if (Number.isNaN(previous) || Number.isNaN(latest)) {
    return null;
  }
  const previousDisplay = Number(previous.toFixed(1));
  const latestDisplay = Number(latest.toFixed(1));
  if (latestDisplay > previousDisplay) {
    return "up";
  }
  if (latestDisplay < previousDisplay) {
    return "down";
  }
  return "held";
}
