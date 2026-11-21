import type { Messages } from "@repo/i18n/messages";

export type TabSlot =
  | "home"
  | "games"
  | "challenges"
  | "book"
  | "groups"
  | "profile";

export type TabEntry = { slot: TabSlot; title: string };

export function visibleTabs(messages: Messages): TabEntry[] {
  const m = messages.common;
  return [
    { slot: "home", title: m.home },
    { slot: "games", title: m.games },
    { slot: "challenges", title: m.challenges },
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
  const challenges = segments.indexOf("challenges");
  if (challenges !== -1) {
    return challengeScreenHidesTabBar(segments[challenges + 1]);
  }
  const book = segments.indexOf("book");
  if (book === -1) {
    return false;
  }
  return segments[book + 2] !== undefined;
}

// Teams, Player profiles and Series pages keep the bar so tapping Challenges
// pops back to the segments; a Challenge's own screens are a focused flow,
// like a Game's.
const CHALLENGES_KEEP_TAB_BAR = new Set(["teams", "players", "series"]);

function challengeScreenHidesTabBar(next: string | undefined) {
  return next !== undefined && !CHALLENGES_KEEP_TAB_BAR.has(next);
}

type TabStackState = { key?: string; routes: readonly { name: string }[] };

// A link from another tab (Home to a Game, say) opens the screen without the
// tab's list beneath it, so tapping the tab has nothing to pop back to.
export function stackMissingRoot(
  stack: TabStackState | undefined,
): stack is TabStackState & { key: string } {
  return stack?.key !== undefined && stack.routes[0]?.name !== "index";
}
