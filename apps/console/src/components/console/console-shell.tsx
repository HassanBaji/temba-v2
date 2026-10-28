"use client";

import type { ReactNode } from "react";

import { TembaWordmark } from "~/components/ui/temba-wordmark";

import { ConsoleNav } from "./console-nav";
import { UserFooter } from "./user-footer";
import { VenueSwitcher } from "./venue-switcher";

/**
 * The console frame from the design: a 212px ink rail (wordmark, Venue card,
 * sections, account) beside a paper content column that scrolls on its own.
 */
export function ConsoleShell({
  venue,
  webOrigin,
  children,
}: {
  venue?: { id: string; name: string; city: string; courtCount: number };
  webOrigin?: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-paper flex h-dvh min-w-[960px]">
      <aside className="bg-ink text-paper surface-ink flex w-[var(--console-rail-width)] shrink-0 flex-col px-3.5 py-[22px]">
        <div className="px-2.5">
          <TembaWordmark
            surface="ink"
            className="gap-2.5 [&>span]:text-[15px]"
          />
        </div>
        {venue ? (
          <>
            <VenueSwitcher
              venueId={venue.id}
              name={venue.name}
              city={venue.city}
              courtCount={venue.courtCount}
            />
            <ConsoleNav venueId={venue.id} />
          </>
        ) : null}
        <UserFooter webOrigin={webOrigin} />
      </aside>
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
