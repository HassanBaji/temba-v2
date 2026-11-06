import type { Messages } from "@repo/i18n/messages";

export type TabSlot = "home" | "games" | "book" | "groups" | "profile";

export type TabEntry = { slot: TabSlot; title: string };

export function visibleTabs(messages: Messages): TabEntry[] {
  const m = messages.common;
  return [
    { slot: "home", title: m.home },
    { slot: "games", title: m.games },
    { slot: "book", title: m.book },
    { slot: "groups", title: m.groups },
    { slot: "profile", title: m.profile },
  ];
}

export function tabBarHidden(segments: readonly string[]): boolean {
  if (segments.includes("complete-profile")) {
    return true;
  }
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
