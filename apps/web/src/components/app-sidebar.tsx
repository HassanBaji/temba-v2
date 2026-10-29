"use client";

import * as React from "react";
import Link from "next/link";
import { UserButton, useUser } from "@clerk/nextjs";
import {
  Building2,
  CalendarDays,
  ClipboardList,
  Gauge,
  House,
  Mail,
  MapPin,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";

import { useCreateAccess } from "~/components/create-access-gate";
import { api } from "~/trpc/react";
import { NavMain } from "~/components/nav-main";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "~/components/ui/sidebar";

const navMain = [
  {
    title: "Home",
    url: "/dashboard",
    icon: House,
  },
  {
    title: "Games",
    url: "/dashboard/games",
    icon: CalendarDays,
  },
  {
    title: "Groups",
    url: "/dashboard/groups",
    icon: Users,
  },
  {
    title: "Teams",
    url: "/dashboard/teams",
    icon: UserRound,
  },
  {
    title: "Communities",
    url: "/dashboard/communities",
    icon: Building2,
  },
  {
    title: "Invites",
    url: "/dashboard/invites",
    icon: Mail,
  },
];

const venuesNav = {
  title: "Venues",
  url: "/dashboard/venues",
  icon: MapPin,
};

const operatorGroupsNav = {
  title: "Verify Groups",
  url: "/dashboard/operator/groups",
  icon: ShieldCheck,
};

const operatorLevelsNav = {
  title: "Player Levels",
  url: "/dashboard/operator/levels",
  icon: Gauge,
};

const consoleOrigin = process.env.NEXT_PUBLIC_CONSOLE_ORIGIN;

/** The Venue console is its own App (ADR-0031); the entry is an external link. */
const consoleNav = consoleOrigin
  ? {
      title: "Venue console",
      url: consoleOrigin,
      icon: ClipboardList,
      external: true,
    }
  : undefined;

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useUser();
  const { isLoaded, hasCreateAccess } = useCreateAccess();
  const isOperator = user?.publicMetadata.operator === true;
  const items = navMain.filter(
    (item) =>
      item.url !== "/dashboard/communities" || (isLoaded && hasCreateAccess),
  );
  const managed = api.venues.listManaged.useQuery();
  const managesVenue = (managed.data?.length ?? 0) > 0;
  const navItems = [
    ...items,
    ...(managesVenue && consoleNav ? [consoleNav] : []),
    ...(isOperator ? [venuesNav, operatorGroupsNav, operatorLevelsNav] : []),
  ];

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/dashboard">
                <span className="text-lead font-semibold">Temba</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center gap-2 px-2 py-1">
          <UserButton showName />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
