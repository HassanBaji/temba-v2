const TAB_PREFIX: Record<string, string> = {
  "(home)": "",
  games: "/games",
  groups: "/groups",
  communities: "/communities",
  profile: "/profile",
};

/**
 * The Player profile inside the current tab's stack, so the tab bar does not
 * switch and Back returns to the row that opened it.
 */
export function playerPath(segments: readonly string[], userId: string) {
  const tab = segments.find((segment) => segment in TAB_PREFIX) ?? "(home)";
  const prefix = TAB_PREFIX[tab] ?? "";
  return `${prefix}/players/${userId}`;
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
