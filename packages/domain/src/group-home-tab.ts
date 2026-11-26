export type GroupHomeTab = "standing" | "games" | "members" | "series";

export function groupHomeTabFromQuery(
  tab: string | null | undefined,
): GroupHomeTab {
  if (
    tab === "games" ||
    tab === "members" ||
    tab === "standing" ||
    tab === "series"
  ) {
    return tab;
  }
  return "standing";
}

/** Only a Verified Group has a Series tab; elsewhere it falls back to Standing. */
export function groupHomeShownTab(
  tab: GroupHomeTab,
  verified: boolean,
): GroupHomeTab {
  return tab === "series" && !verified ? "standing" : tab;
}

export function groupHomeTabQuery(tab: GroupHomeTab) {
  return tab === "standing" ? "" : `?tab=${tab}`;
}
