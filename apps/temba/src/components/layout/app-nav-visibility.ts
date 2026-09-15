export type AppNavSlot = "home" | "games" | "groups" | "communities" | "you";

const APP_NAV_SLOT_ORDER: AppNavSlot[] = [
  "home",
  "games",
  "groups",
  "communities",
  "you",
];

/** Primary nav slots as a pure function of Clerk create-access (`groupCreator`). */
export function visibleAppNavSlots(hasCreateAccess: boolean): AppNavSlot[] {
  if (hasCreateAccess) {
    return [...APP_NAV_SLOT_ORDER];
  }
  return APP_NAV_SLOT_ORDER.filter((slot) => slot !== "communities");
}
