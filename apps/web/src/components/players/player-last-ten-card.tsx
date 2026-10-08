import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { SurfaceLabel } from "~/components/common/surface-label";
import { ResultMark } from "~/components/temba/result-mark";
import type {
  LastTenSummary,
  PlayerMatchRowView,
} from "@repo/domain/player-profile-matches";
import { playerMatchesPath } from "~/lib/dashboard-paths";

import { PlayerMatchRow } from "./player-match-row";

export function PlayerLastTenCard({
  userId,
  summary,
  rows,
}: {
  userId: string;
  summary: LastTenSummary;
  rows: PlayerMatchRowView[];
}) {
  return (
    <section className="border-rule bg-paper rounded-card overflow-hidden border">
      <SurfaceLabel inset="profile" meta={summary.record}>
        Last 10 games
      </SurfaceLabel>
      <div className="px-5 pb-5">
        <div aria-hidden="true" className="flex justify-between">
          {summary.marks.map((mark, index) => (
            <ResultMark
              key={index}
              variant={mark}
              decorative
              className="size-[22px]"
            />
          ))}
        </div>
        {summary.ends ? (
          <div
            aria-hidden="true"
            className="text-meta text-muted-foreground mt-2 flex justify-between"
          >
            <span>{summary.ends.newest}</span>
            <span>{summary.ends.oldest}</span>
          </div>
        ) : null}
      </div>
      {rows.length > 0 ? (
        <ul className="border-rule divide-rule divide-y border-t">
          {rows.map((row) => (
            <li key={row.matchId}>
              <PlayerMatchRow
                row={row}
                href={playerMatchesPath(userId, row.matchId)}
              />
            </li>
          ))}
        </ul>
      ) : null}
      {summary.seeAll ? (
        <div className="border-rule border-t p-5">
          <Link
            href={playerMatchesPath(userId)}
            className="border-rule hover:bg-wash rounded-card flex h-11 items-center justify-center gap-1 border font-semibold transition-colors"
          >
            {summary.seeAll}
            <ChevronRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      ) : null}
    </section>
  );
}
