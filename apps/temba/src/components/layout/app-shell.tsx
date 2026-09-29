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
  isSubPage = false,
  hideNav = false,
}: {
  children: ReactNode;
  title?: string;
  icon?: ReactNode;
  description?: string;
  action?: ReactNode;
  width?: "content" | "wide";
  hidePageHeader?: boolean;
  hideMobileTopBar?: boolean;
  isSubPage?: boolean;
  hideNav?: boolean;
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
      <a
        href="#main"
        className="bg-background text-foreground text-body focus-visible:ring-ring/50 sr-only z-50 rounded-md border font-semibold outline-none focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:px-4 focus:py-3 focus-visible:ring-[3px]"
      >
        Skip to content
      </a>
      <div className="flex min-h-svh w-full min-w-0 overflow-x-clip">
        <AppRail />
        <div className="flex min-w-0 flex-1 flex-col">
          {hideMobileTopBar ? null : (
            <MobileTopBarFromPath
              title={title ?? ""}
              icon={icon}
              action={action}
              isSubPage={isSubPage}
              titleAs={hidePageHeader ? "p" : "h1"}
            />
          )}
          <main
            id="main"
            tabIndex={-1}
            className={cn(
              "mx-auto w-full min-w-0 flex-1 outline-none md:py-6",
              pageGutterX,
              "pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom,0px)+1rem)] lg:pb-6",
              width === "wide" ? "max-w-wide" : "max-w-content",
            )}
          >
            {hidePageHeader || !title ? null : (
              <PageHeader
                title={title}
                description={description}
                action={action}
                className="mb-6 hidden lg:flex"
              />
            )}
            {children}
          </main>
        </div>
      </div>
      {hideNav ? null : <BottomNav />}
    </SidebarProvider>
  );
}
