const TAB_PREFIX: Record<string, string> = {
  "(home)": "",
  games: "/games",
  challenges: "/challenges",
  groups: "/groups",
  profile: "/profile",
};

/**
 * The Series page inside the current tab's stack, so the tab bar does not
 * switch and Back returns to the row that opened it.
 */
export function seriesPath(segments: readonly string[], seriesId: string) {
  const tab = segments.find((segment) => segment in TAB_PREFIX) ?? "(home)";
  return `${TAB_PREFIX[tab] ?? ""}/series/${seriesId}`;
}
