export type GroupsTab = "mine" | "public";

export function groupsTabFromQuery(tab: string | null | undefined): GroupsTab {
  if (tab === "public") {
    return tab;
  }
  return "mine";
}

export function groupsTabQuery(tab: GroupsTab) {
  return tab === "mine" ? "" : `?tab=${tab}`;
}
