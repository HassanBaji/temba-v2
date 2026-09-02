"use client";

import type { CSSProperties, ReactNode } from "react";

import { AppRail } from "~/components/layout/app-rail";
import { BottomNav } from "~/components/layout/bottom-nav";
import { MobileTopBarFromPath } from "~/components/layout/mobile-top-bar";
import { PageHeader } from "~/components/layout/page-header";
import { SidebarProvider } from "~/components/ui/sidebar";
import { pageGutterX } from "~/lib/page-layout";
import { cn } from "~/lib/utils";

export function AppShell({
  children,
  title,
  icon,
  description,
  action,
  width = "content",
  hidePageHeader = false,
  hideMobileTopBar = false,
}: {
  children: ReactNode;
  title?: string;
  icon?: ReactNode;
  description?: string;
  action?: ReactNode;
  width?: "content" | "wide";
  hidePageHeader?: boolean;
  hideMobileTopBar?: boolean;
}) {
  return (
    <SidebarProvider
      className="min-h-svh"
      style={
        {
          "--sidebar-width": "var(--rail-width)",
          "--header-height": "2.75rem",
        } as CSSProperties
      }
    >
      <div className="flex min-h-svh w-full min-w-0 overflow-x-clip">
        <AppRail />
        <div className="flex min-w-0 flex-1 flex-col">
          {hideMobileTopBar ? null : (
            <MobileTopBarFromPath title={title ?? ""} icon={icon} />
          )}
          <main
            className={cn(
              "mx-auto w-full min-w-0 flex-1 py-4 md:py-6",
              pageGutterX,
              "pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom,0px)+1rem)] lg:pb-6",
              width === "wide"
                ? "max-w-[var(--container-wide)]"
                : "max-w-[var(--container-content)]",
            )}
          >
            {hidePageHeader ? null : (
              <PageHeader
                title={title ?? ""}
                description={description}
                action={action}
                className="mb-6 max-lg:[&>div:first-child>h1]:sr-only"
              />
            )}
            {children}
          </main>
        </div>
      </div>
      <BottomNav />
    </SidebarProvider>
  );
}
