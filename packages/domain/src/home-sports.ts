import { DEFAULT_SPORT, SPORTS, type Sport } from "./sport";

/**
 * The sports Home shows: the ones on the User's profile. A User who has not
 * picked any yet sees both.
 */
export function homeSports(
  sports: readonly string[] | null | undefined,
): Sport[] {
  const picked = SPORTS.filter((sport) => sports?.includes(sport));
  return picked.length > 0 ? picked : [...SPORTS];
}

/** The chosen sport, else the sport of the next game, else the first one played. */
export function homeSport(
  chosen: Sport | null,
  sports: readonly Sport[],
  nextSport: Sport | null,
): Sport {
  if (chosen && sports.includes(chosen)) {
    return chosen;
  }
  if (nextSport && sports.includes(nextSport)) {
    return nextSport;
  }
  return sports[0] ?? DEFAULT_SPORT;
}
