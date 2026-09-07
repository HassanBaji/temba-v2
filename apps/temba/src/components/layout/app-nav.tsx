import { Building2, CircleUser, House, Users } from "lucide-react";
import { Field } from "../ui/icons/field";

export type AppNavItem = {
  title: string;
  href: string;
  icon: React.ReactNode;
  match: "exact" | "prefix";
  slot: "home" | "games" | "groups" | "communities" | "you";
};

export const APP_NAV_SLOTS: AppNavItem[] = [
  {
    title: "Home",
    href: "/dashboard",
    icon: <House className="size-[21px]" aria-hidden="true" />,
    match: "exact",
    slot: "home",
  },
  {
    title: "Games",
    href: "/dashboard/games",
    icon: (
      <Field
        className="size-[21px]"
        width={21}
        height={21}
        aria-hidden="true"
      />
    ),
    match: "prefix",
    slot: "games",
  },
  {
    title: "Groups",
    href: "/dashboard/groups",
    icon: <Users className="size-[21px]" aria-hidden="true" />,
    match: "prefix",
    slot: "groups",
  },
  {
    title: "Communities",
    href: "/dashboard/communities",
    icon: <Building2 className="size-[21px]" aria-hidden="true" />,
    match: "prefix",
    slot: "communities",
  },
  {
    title: "You",
    href: "/dashboard/you",
    icon: <CircleUser className="size-[21px]" aria-hidden="true" />,
    match: "prefix",
    slot: "you",
  },
];

export function visibleAppNavItems() {
  return APP_NAV_SLOTS;
}

export function isNavItemActive(pathname: string, item: AppNavItem) {
  if (item.match === "exact") {
    return pathname === item.href;
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
