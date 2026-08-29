"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  isNavItemActive,
  visibleAppNavItems,
} from "~/components/layout/app-nav";
import { cn } from "~/lib/utils";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="bg-card fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 shadow-md lg:hidden"
      style={{
        height:
          "calc(var(--bottom-nav-height) + env(safe-area-inset-bottom, 0px))",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {visibleAppNavItems().map((item) => {
        const active = isNavItemActive(pathname, item);
        const Icon = item.icon;

        return (
          <Link
            key={item.slot}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "text-meta focus-visible:ring-ring/50 relative flex h-full min-h-11 w-full min-w-11 flex-col items-center justify-center gap-0.5 outline-none focus-visible:ring-[3px]",
              active
                ? "text-brand font-semibold"
                : "text-muted-foreground font-medium",
            )}
          >
            {active ? (
              <span
                aria-hidden="true"
                className="bg-brand absolute inset-x-0 top-0 h-0.5"
              />
            ) : null}
            <Icon
              aria-hidden="true"
              className="size-6"
              strokeWidth={2}
              fill={active ? "currentColor" : "none"}
            />
            <span>{item.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}
