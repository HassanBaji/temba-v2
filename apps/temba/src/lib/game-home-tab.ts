export type GameHomeTab = "overview" | "players" | "results";

export function gameHomeTabFromQuery(
  tab: string | null | undefined,
): GameHomeTab {
  if (tab === "players" || tab === "results" || tab === "overview") {
    return tab;
  }
  return "overview";
}

export function gameHomeTabQuery(tab: GameHomeTab) {
  return tab === "overview" ? "" : `?tab=${tab}`;
}
