export type TabSlot = "home" | "games" | "groups" | "communities" | "profile";

export type TabEntry = { slot: TabSlot; title: string };

const TABS: TabEntry[] = [
  { slot: "home", title: "Home" },
  { slot: "games", title: "Games" },
  { slot: "groups", title: "Groups" },
  { slot: "communities", title: "Communities" },
  { slot: "profile", title: "Profile" },
];

export function visibleTabs(isGroupCreator: boolean): TabEntry[] {
  return isGroupCreator
    ? TABS
    : TABS.filter((tab) => tab.slot !== "communities");
}

export function tabBarHidden(segments: readonly string[]): boolean {
  const games = segments.indexOf("games");
  return games !== -1 && segments[games + 1] === "new";
}
