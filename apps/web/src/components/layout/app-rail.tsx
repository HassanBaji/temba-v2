"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useCreateAccess } from "~/components/create-access-gate";
import { NotificationBell } from "~/components/notifications/notification-bell";
import {
  visibleAppNavItems,
  isNavItemActive,
} from "~/components/layout/app-nav";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "~/components/ui/sidebar";
import { cn } from "~/lib/utils";

export function AppRail() {
  const pathname = usePathname();
  const { isLoaded, hasCreateAccess } = useCreateAccess();
  const items = visibleAppNavItems(isLoaded && hasCreateAccess);

  return (
    <Sidebar
      collapsible="none"
      className="hidden border-r lg:sticky lg:top-0 lg:flex lg:h-svh"
      style={{ width: "var(--rail-width)" }}
      role="navigation"
      aria-label="Primary"
    >
      <SidebarHeader className="flex-row items-center">
        <SidebarMenu className="min-w-0 flex-1">
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="h-11">
              <Link href="/dashboard">
                <span className="text-title font-semibold">Temba</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <NotificationBell />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = isNavItemActive(pathname, item);
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.slot}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      className={cn(
                        "[&>svg]:size-[21px]",
                        active &&
                          "border-l-sidebar-foreground text-sidebar-foreground [&>svg]:text-sidebar-foreground border-l-[3px] font-semibold",
                      )}
                    >
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                      >
                        {Icon}
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
