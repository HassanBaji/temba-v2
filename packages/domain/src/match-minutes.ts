/** A Social's match length: 10 to 120 minutes, in steps of 5. */
export const MATCH_MINUTES_MIN = 10;
export const MATCH_MINUTES_MAX = 120;
export const MATCH_MINUTES_STEP = 5;

export function isMatchMinutes(minutes: number) {
  return (
    Number.isInteger(minutes) &&
    minutes >= MATCH_MINUTES_MIN &&
    minutes <= MATCH_MINUTES_MAX &&
    minutes % MATCH_MINUTES_STEP === 0
  );
}

/** The next match length up or down, or `null` past either end. */
export function matchMinutesStep(minutes: number, direction: 1 | -1) {
  const next = minutes + direction * MATCH_MINUTES_STEP;
  return isMatchMinutes(next) ? next : null;
}
