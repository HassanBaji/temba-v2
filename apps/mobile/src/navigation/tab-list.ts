export type TabSlot =
  | "home"
  | "games"
  | "book"
  | "groups"
  | "communities"
  | "profile";

export type TabEntry = { slot: TabSlot; title: string };

const TABS: TabEntry[] = [
  { slot: "home", title: "Home" },
  { slot: "games", title: "Games" },
  { slot: "book", title: "Book" },
  { slot: "groups", title: "Groups" },
  { slot: "profile", title: "Profile" },
];

export function visibleTabs(): TabEntry[] {
  return TABS;
}

export function tabBarHidden(segments: readonly string[]): boolean {
  const games = segments.indexOf("games");
  if (games !== -1 && segments[games + 1] !== undefined) {
    return true;
  }
  const book = segments.indexOf("book");
  if (book === -1) {
    return false;
  }
  return segments[book + 2] !== undefined;
}

type TabStackState = { key?: string; routes: readonly { name: string }[] };

// A link from another tab (Home to a Game, say) opens the screen without the
// tab's list beneath it, so tapping the tab has nothing to pop back to.
export function stackMissingRoot(
  stack: TabStackState | undefined,
): stack is TabStackState & { key: string } {
  return stack?.key !== undefined && stack.routes[0]?.name !== "index";
}
