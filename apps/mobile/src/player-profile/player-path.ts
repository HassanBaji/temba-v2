import type { Sport } from "@repo/domain/sport";

const TAB_PREFIX: Record<string, string> = {
  "(home)": "",
  games: "/games",
  groups: "/groups",
  communities: "/communities",
  profile: "/profile",
};

/**
 * The Player profile inside the current tab's stack, so the tab bar does not
 * switch and Back returns to the row that opened it. Opens on `sport` when
 * given.
 */
export function playerPath(
  segments: readonly string[],
  userId: string,
  sport?: Sport,
) {
  const tab = segments.find((segment) => segment in TAB_PREFIX) ?? "(home)";
  const prefix = TAB_PREFIX[tab] ?? "";
  const path = `${prefix}/players/${userId}`;
  return sport ? `${path}?sport=${sport}` : path;
}

/** The Last 10 screen, opened on one Match's sheet when `matchId` is given. */
export function playerMatchesPath(
  segments: readonly string[],
  userId: string,
  matchId?: string,
) {
  const path = `${playerPath(segments, userId)}/matches`;
  return matchId ? `${path}?match=${matchId}` : path;
}
