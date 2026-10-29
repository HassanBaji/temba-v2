import Link from "next/link";

import { SurfaceLabel } from "~/components/common/surface-label";
import { ResultMark } from "~/components/temba/result-mark";
import type { FootballMatchRowView } from "@repo/domain/player-profile-football";
import type { LastTenSummary } from "@repo/domain/player-profile-matches";

import { LastTenMarks } from "./player-last-ten-card";

const ROW = "flex min-h-11 items-center gap-3 px-5 py-3.5";

function FootballMatchRow({ row }: { row: FootballMatchRowView }) {
  const content = (
    <>
      <ResultMark variant={row.outcome} decorative className="size-5" />
      <span aria-hidden="true" className="min-w-0 flex-1">
        <span className="text-body block truncate font-semibold">
          {row.title}
        </span>
        <span className="text-meta text-muted-foreground block truncate">
          {row.meta}
        </span>
      </span>
      <span aria-hidden="true" className="shrink-0 text-right tabular-nums">
        {row.score ? (
          <span className="text-body block font-semibold">{row.score}</span>
        ) : null}
        {row.goals ? (
          <span className="text-meta text-muted-foreground block">
            {row.goals}
          </span>
        ) : null}
      </span>
      <span className="sr-only">{row.accessibilityLabel}</span>
    </>
  );
  if (row.canOpenGame) {
    return (
      <Link
        href={`/dashboard/games/${row.gameId}`}
        className={`${ROW} hover:bg-wash transition-colors`}
      >
        {content}
      </Link>
    );
  }
  return <div className={ROW}>{content}</div>;
}

export function PlayerFootballLastTenCard({
  summary,
  rows,
}: {
  summary: LastTenSummary;
  rows: FootballMatchRowView[];
}) {
  return (
    <section className="border-rule bg-paper rounded-card overflow-hidden border">
      <SurfaceLabel inset="profile" meta={summary.record}>
        Last 10 games
      </SurfaceLabel>
      <LastTenMarks summary={summary} />
      {rows.length > 0 ? (
        <ul className="border-rule divide-rule divide-y border-t">
          {rows.map((row) => (
            <li key={row.matchId}>
              <FootballMatchRow row={row} />
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
