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

export type GameHomeIntent = "invite" | "results";

export function gameHomeIntentFromQuery(
  intent: string | null | undefined,
): GameHomeIntent | null {
  return intent === "invite" || intent === "results" ? intent : null;
}

export function gameHomeIntentHref(gameId: string, intent: GameHomeIntent) {
  return `/dashboard/games/${gameId}?intent=${intent}`;
}
