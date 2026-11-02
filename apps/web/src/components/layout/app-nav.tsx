import { CircleUser, House, Users } from "lucide-react";
import { Field } from "../ui/icons/field";

export type AppNavSlot = "home" | "games" | "groups" | "you";

export type AppNavItem = {
  title: string;
  href: string;
  icon: React.ReactNode;
  match: "exact" | "prefix";
  slot: AppNavSlot;
};

export const APP_NAV_ITEMS: AppNavItem[] = [
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
    title: "Profile",
    href: "/dashboard/you",
    icon: <CircleUser className="size-[21px]" aria-hidden="true" />,
    match: "prefix",
    slot: "you",
  },
];

export function isNavItemActive(pathname: string, item: AppNavItem) {
  if (item.match === "exact") {
    return pathname === item.href;
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
