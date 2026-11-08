"use client";

import * as React from "react";
import Link from "next/link";
import { UserButton, useUser } from "@clerk/nextjs";
import {
  CalendarDays,
  ClipboardList,
  Gauge,
  House,
  Mail,
  MapPin,
  ShieldCheck,
  Swords,
  Users,
} from "lucide-react";

import { useMessages } from "~/components/locale-provider";
import type { Messages } from "@repo/i18n/messages";
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

function navMain(m: Messages) {
  return [
    {
      title: m.common.home,
      url: "/dashboard",
      icon: House,
    },
    {
      title: m.common.games,
      url: "/dashboard/games",
      icon: CalendarDays,
    },
    {
      title: m.common.groups,
      url: "/dashboard/groups",
      icon: Users,
    },
    {
      title: m.common.challenges,
      url: "/dashboard/challenges",
      icon: Swords,
    },
    {
      title: m.common.invites,
      url: "/dashboard/invites",
      icon: Mail,
    },
  ];
}

function venuesNav(m: Messages) {
  return {
    title: m.webUi.nav.venues,
    url: "/dashboard/venues",
    icon: MapPin,
  };
}

function operatorGroupsNav(m: Messages) {
  return {
    title: m.webUi.nav.verifyGroups,
    url: "/dashboard/operator/groups",
    icon: ShieldCheck,
  };
}

function operatorLevelsNav(m: Messages) {
  return {
    title: m.webUi.nav.playerLevels,
    url: "/dashboard/operator/levels",
    icon: Gauge,
  };
}

const consoleOrigin = process.env.NEXT_PUBLIC_CONSOLE_ORIGIN;

/** The Venue console is its own App (ADR-0031); the entry is an external link. */
function consoleNav(m: Messages) {
  return consoleOrigin
    ? {
        title: m.webUi.nav.venueConsole,
        url: consoleOrigin,
        icon: ClipboardList,
        external: true,
      }
    : undefined;
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useUser();
  const m = useMessages();
  const isOperator = user?.publicMetadata.operator === true;
  const items = navMain(m);
  const managed = api.venues.listManaged.useQuery();
  const managesVenue = (managed.data?.length ?? 0) > 0;
  const console = consoleNav(m);
  const navItems = [
    ...items,
    ...(managesVenue && console ? [console] : []),
    ...(isOperator
      ? [venuesNav(m), operatorGroupsNav(m), operatorLevelsNav(m)]
      : []),
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
