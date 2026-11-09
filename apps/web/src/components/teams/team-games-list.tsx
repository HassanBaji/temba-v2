"use client";

import { type TeamDetailView } from "@repo/domain/team-detail";
import Link from "next/link";

import { ResultMark } from "~/components/temba/result-mark";
import { YouCard } from "~/components/you/you-section";
import { cn } from "~/lib/utils";

export function TeamGamesList({ games }: { games: TeamDetailView["games"] }) {
  if (games.emptyCopy) {
    return <p className="text-meta text-muted-foreground">{games.emptyCopy}</p>;
  }
  return (
    <YouCard>
      <ul>
        {games.rows.map((game, index) => (
          <li
            key={game.key}
            className={cn(index > 0 && "border-rule border-t")}
          >
            <Link
              href={`/dashboard/games/${game.gameId}`}
              aria-label={game.accessibilityLabel}
              className="hover:bg-wash focus-visible:ring-ring/50 flex items-center gap-3 px-4 py-[13px] outline-none focus-visible:ring-[3px] focus-visible:ring-inset"
            >
              <ResultMark
                variant={game.result}
                decorative
                className="size-[18px]"
              />
              <span aria-hidden="true" className="min-w-0 flex-1">
                <span className="block truncate text-[14px]">{game.title}</span>
                <span className="text-eyebrow text-muted-foreground block">
                  {game.meta}
                </span>
              </span>
              <span
                aria-hidden="true"
                dir="ltr"
                className="shrink-0 text-[14px] font-semibold [font-variation-settings:'wdth'_106,'wght'_600]"
              >
                {game.score}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </YouCard>
  );
}
