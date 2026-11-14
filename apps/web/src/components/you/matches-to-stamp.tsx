"use client";

import { ChevronRightIcon } from "lucide-react";
import Link from "next/link";

import { formatAbsoluteDay } from "@repo/domain/format-game-start";

import { useLocale, useMessages } from "~/components/locale-provider";
import { gameHomeHref } from "~/lib/dashboard-paths";
import { api } from "~/trpc/react";

/**
 * The Matches a Verifier may stamp now, each opening its Game (ADR-0072).
 * Nothing shows for a User who is no Verifier or has nothing to stamp.
 */
export function MatchesToStamp() {
  const m = useMessages().rating.verifier.toStamp;
  const locale = useLocale();
  const list = api.games.listMatchesToStamp.useQuery();
  const rows = list.data ?? [];
  if (rows.length === 0) {
    return null;
  }
  return (
    <section
      aria-labelledby="matches-to-stamp-heading"
      className="flex flex-col gap-3"
    >
      <div className="flex flex-col gap-1">
        <h2
          id="matches-to-stamp-heading"
          className="font-expanded text-title text-ink"
        >
          {m.title}
        </h2>
        <p className="text-meta text-muted-foreground">{m.note}</p>
      </div>
      <ul className="border-rule bg-paper rounded-card divide-rule divide-y border">
        {rows.map((row) => (
          <li key={row.matchId}>
            <Link
              href={gameHomeHref(row.gameId)}
              className="hover:bg-wash focus-visible:ring-ring/50 flex min-h-11 items-center gap-3 px-3.5 py-3 outline-none transition-colors focus-visible:ring-[3px]"
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-body truncate font-medium">
                  {row.gameName}
                </span>
                <span className="text-meta text-muted-foreground truncate">
                  {m.line(
                    row.venueName,
                    row.startsAt
                      ? formatAbsoluteDay(row.startsAt, locale)
                      : null,
                  )}
                </span>
              </span>
              <ChevronRightIcon
                aria-hidden="true"
                className="text-muted-foreground size-4 shrink-0 rtl:-scale-x-100"
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
