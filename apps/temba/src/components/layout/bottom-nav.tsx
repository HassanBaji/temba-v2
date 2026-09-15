"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useCreateAccess } from "~/components/create-access-gate";
import {
  isNavItemActive,
  visibleAppNavItems,
} from "~/components/layout/app-nav";
import { cn } from "~/lib/utils";

export function BottomNav() {
  const pathname = usePathname();
  const { isLoaded, hasCreateAccess } = useCreateAccess();
  const items = visibleAppNavItems(isLoaded && hasCreateAccess);

  return (
    <nav
      aria-label="Primary"
      className="border-rule bg-paper fixed inset-x-0 bottom-0 z-50 grid border-t lg:hidden"
      style={{
        gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
        height:
          "calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px))",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {items.map((item) => {
        const active = isNavItemActive(pathname, item);
        const Icon = item.icon;

        return (
          <Link
            key={item.slot}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "focus-visible:ring-ring/50 relative flex h-full min-h-11 w-full min-w-11 flex-col items-center justify-center gap-0.5 text-[11.5px] leading-none outline-none focus-visible:ring-[3px]",
              active
                ? "text-ink font-semibold"
                : "text-muted-foreground font-medium",
            )}
          >
            {Icon}
            <span>{item.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}
