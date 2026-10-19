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
  if (games !== -1 && segments[games + 1] === "new") {
    return true;
  }
  const book = segments.indexOf("book");
  if (book === -1) {
    return false;
  }
  const area = segments[book + 1];
  return (
    area === "bookings" ||
    (area === "venues" && segments[book + 2] !== undefined)
  );
}
