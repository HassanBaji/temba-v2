"use client";

import * as React from "react";
import Link from "next/link";
import { UserButton, useUser } from "@clerk/nextjs";
import {
  IconBuildingCommunity,
  IconHome,
  IconMapPin,
  IconUsers,
  IconUsersGroup,
} from "@tabler/icons-react";

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
    icon: IconHome,
  },
  {
    title: "Groups",
    url: "/dashboard/groups",
    icon: IconUsersGroup,
  },
  {
    title: "Teams",
    url: "/dashboard/teams",
    icon: IconUsers,
  },
  {
    title: "Communities",
    url: "/dashboard/communities",
    icon: IconBuildingCommunity,
  },
];

const venuesNav = {
  title: "Venues",
  url: "/dashboard/venues",
  icon: IconMapPin,
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
