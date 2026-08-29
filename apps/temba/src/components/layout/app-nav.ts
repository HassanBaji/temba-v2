import {
  Building2,
  CalendarDays,
  CircleUser,
  House,
  Users,
  type LucideIcon,
} from "lucide-react";

/** Flip to true when Game home ships as a primary destination. */
export const SHOW_GAMES_NAV_ITEM = false;

export type AppNavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  match: "exact" | "prefix";
  slot: "home" | "games" | "groups" | "communities" | "you";
};

export const APP_NAV_SLOTS: AppNavItem[] = [
  {
    title: "Home",
    href: "/dashboard",
    icon: House,
    match: "exact",
    slot: "home",
  },
  {
    title: "Games",
    href: "/dashboard/games",
    icon: CalendarDays,
    match: "prefix",
    slot: "games",
  },
  {
    title: "Groups",
    href: "/dashboard/groups",
    icon: Users,
    match: "prefix",
    slot: "groups",
  },
  {
    title: "Communities",
    href: "/dashboard/communities",
    icon: Building2,
    match: "prefix",
    slot: "communities",
  },
  {
    title: "You",
    href: "/dashboard/you",
    icon: CircleUser,
    match: "prefix",
    slot: "you",
  },
];

export function visibleAppNavItems() {
  return APP_NAV_SLOTS.filter(
    (item) => item.slot !== "games" || SHOW_GAMES_NAV_ITEM,
  );
}

export function isNavItemActive(pathname: string, item: AppNavItem) {
  if (item.match === "exact") {
    return pathname === item.href;
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
