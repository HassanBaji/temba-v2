"use client";

import type { FootballPickStatus } from "@repo/domain/football-lineup";
import Link from "next/link";

import { useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";

import { DraftTag } from "./football-draft-answer";

/**
 * What the Organizer's draft card and a Side captain's Game page show while
 * a Captain pick runs (ADR-0109): the pick in place of the answers and the
 * draft actions, and the way into the Pick room.
 */
export function FootballPickInProgressCard({
  status,
  href,
}: {
  status: Exclude<FootballPickStatus, "done">;
  href: string;
}) {
  const m = useMessages().football.pick.inProgress;
  return (
    <section
      aria-labelledby="football-pick-in-progress-heading"
      className="border-ink bg-paper space-y-3 rounded-xl border p-5"
    >
      <div className="flex items-center gap-2.5">
        <DraftTag />
        <h2
          id="football-pick-in-progress-heading"
          className="min-w-0 flex-1 font-semibold"
        >
          {m.title}
        </h2>
      </div>
      <p className="text-muted-foreground text-meta">
        {status === "live" ? m.live : m.waiting}
      </p>
      <Button size="lg" className="w-full" asChild>
        <Link href={href}>{m.open}</Link>
      </Button>
    </section>
  );
}
