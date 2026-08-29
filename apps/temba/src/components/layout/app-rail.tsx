"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

export function AppRail() {
  const pathname = usePathname();
  const items = visibleAppNavItems();

  return (
    <Sidebar
      collapsible="none"
      className="hidden border-r lg:flex"
      style={{ width: "var(--rail-width)" }}
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="h-11">
              <Link href="/dashboard">
                <span className="text-title font-semibold">Temba</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
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
                      className={
                        active
                          ? "bg-brand-subtle text-brand [&>svg]:text-brand font-semibold"
                          : undefined
                      }
                    >
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                      >
                        <Icon
                          aria-hidden="true"
                          className="size-5"
                          strokeWidth={2}
                        />
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
