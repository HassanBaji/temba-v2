export type CommunityHomeTab = "groups" | "teams" | "members" | "requests";

export function communityHomeTabFromQuery(
  tab: string | null | undefined,
  available: readonly CommunityHomeTab[],
): CommunityHomeTab {
  return available.find((candidate) => candidate === tab) ?? "groups";
}

export function communityHomeTabQuery(tab: CommunityHomeTab) {
  return tab === "groups" ? "" : `?tab=${tab}`;
}
