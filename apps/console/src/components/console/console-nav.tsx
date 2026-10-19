"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  CONSOLE_NAV,
  segmentFromPathname,
  venuePath,
} from "~/lib/console-paths";
import { cn } from "~/lib/utils";

export function ConsoleNav({ venueId }: { venueId: string }) {
  const pathname = usePathname();
  const active = segmentFromPathname(pathname, venueId);

  return (
    <nav
      aria-label="Venue sections"
      className="mt-[22px] flex flex-col gap-0.5"
    >
      {CONSOLE_NAV.map(({ segment, label, icon: Icon }) => {
        const current = segment === active;
        return (
          <Link
            key={segment}
            href={venuePath(venueId, segment)}
            aria-current={current ? "page" : undefined}
            className={cn(
              "rounded-block flex items-center gap-2.5 p-2.5 text-sm transition-colors",
              current
                ? "bg-paper text-ink font-semibold"
                : "text-dim hover:bg-raised hover:text-paper",
            )}
          >
            <Icon aria-hidden="true" className="size-4" strokeWidth={1.75} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
