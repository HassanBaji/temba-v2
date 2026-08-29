"use client";

import * as React from "react";
import Link from "next/link";
import { UserButton, useUser } from "@clerk/nextjs";
import {
  Building2,
  CalendarDays,
  House,
  Mail,
  MapPin,
  UserRound,
  Users,
} from "lucide-react";

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

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useUser();
  const isOperator = user?.publicMetadata.operator === true;
  const items = isOperator ? [...navMain, venuesNav] : navMain;

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
                <span className="text-base font-semibold">Temba</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={items} />
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center gap-2 px-2 py-1">
          <UserButton showName />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
