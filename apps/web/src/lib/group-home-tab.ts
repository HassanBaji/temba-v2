export type GroupHomeTab = "standing" | "games" | "members";

export function groupHomeTabFromQuery(
  tab: string | null | undefined,
): GroupHomeTab {
  if (tab === "games" || tab === "members" || tab === "standing") {
    return tab;
  }
  return "standing";
}

export function groupHomeTabQuery(tab: GroupHomeTab) {
  return tab === "standing" ? "" : `?tab=${tab}`;
}
