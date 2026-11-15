/** Public lists Public Games the viewer may join (ADR-0071). */
export type GamesHubTab = "my-games" | "public" | "history";

export function gamesHubTabFromQuery(
  tab: string | null | undefined,
): GamesHubTab {
  if (tab === "history" || tab === "public") {
    return tab;
  }
  return "my-games";
}

export function gamesHubTabQuery(tab: GamesHubTab) {
  return tab === "my-games" ? "" : `?tab=${tab}`;
}
