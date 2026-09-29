"use client";

import { useEffect, useState, type ReactNode } from "react";

import { PageTitle } from "~/components/layout/page-title";
import { BackButton } from "~/components/ui/nav-icon-button";
import { cn } from "~/lib/utils";

const COLLAPSE_AFTER_PX = 56;

export function GroupHomeTopBar({
  name,
  overflow,
}: {
  name: string;
  overflow: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    function onScroll() {
      setCollapsed(window.scrollY > COLLAPSE_AFTER_PX);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "bg-background sticky top-0 z-40 flex h-[52px] items-center gap-1 lg:hidden",
        "-mx-4 px-4 min-[430px]:-mx-5 min-[430px]:px-5 md:-mx-6 md:px-6",
        collapsed && "border-border border-b",
      )}
    >
      <BackButton href="/dashboard/groups" label="Back to Groups" />
      <PageTitle
        as="p"
        variant="compact"
        aria-hidden={!collapsed}
        className={cn(
          "flex-1 truncate transition-opacity",
          collapsed ? "opacity-100" : "opacity-0",
          collapsed ? "motion-safe:translate-y-0" : "motion-safe:translate-y-1",
          "motion-safe:transition-transform",
        )}
      >
        {name}
      </PageTitle>
      <div className="flex size-11 shrink-0 items-center justify-end">
        {overflow}
      </div>
    </header>
  );
}
