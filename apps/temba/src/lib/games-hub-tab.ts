export type GamesHubTab = "my-games" | "history";

export function gamesHubTabFromQuery(
  tab: string | null | undefined,
): GamesHubTab {
  if (tab === "history") {
    return tab;
  }
  return "my-games";
}

export function gamesHubTabQuery(tab: GamesHubTab) {
  return tab === "my-games" ? "" : `?tab=${tab}`;
}
