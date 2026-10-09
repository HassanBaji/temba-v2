"use client";

import { ChevronRight } from "lucide-react";
import * as React from "react";
import { type ComponentProps } from "react";

import { PoolRecordTable } from "~/components/games/tournament-pool-tables-panel";
import { TournamentYourRounds } from "~/components/games/tournament-your-rounds";
import { PageTitle } from "~/components/layout/page-title";
import { BackButton } from "~/components/ui/nav-icon-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  POOLS_SEGMENT_LABEL,
  STANDINGS_HEADING,
  TOURNAMENT_ENDS_COPY,
  defaultStandingsPoolIndex,
  otherPoolsPlayedSummary,
  roundResultsHeading,
} from "@repo/domain/tournament-home";
import {
  matchTrailing,
  poolRoundGroups,
  type MatchTrailing,
} from "@repo/domain/tournament-details";
import { TOURNAMENT_FINISHED_COPY } from "@repo/domain/tournament-pool-table";
import { pageBleed } from "~/lib/page-layout";
import { cn } from "~/lib/utils";
import type { RouterOutputs } from "~/trpc/react";

type PoolTables = NonNullable<RouterOutputs["games"]["byId"]["poolTables"]>;
type PoolTable = PoolTables["pools"][number];
type PoolMatch = PoolTable["matches"][number];

const CARD = "border-rule overflow-hidden rounded-card border";

function PoolRoundResults({
  matches,
  otherPools,
  onSelectPool,
}: {
  matches: PoolMatch[];
  otherPools: ReturnType<typeof otherPoolsPlayedSummary>;
  onSelectPool: (poolIndex: number) => void;
}) {
  const groups = poolRoundGroups(matches);
  if (groups.length === 0 && !otherPools) {
    return null;
  }

  return (
    <div className="space-y-6">
      {groups.map(({ roundNumber, matches: roundMatches }, index) => {
        const isLast = index === groups.length - 1;
        return (
          <section key={roundNumber}>
            <h2 className="font-expanded text-title pb-2.5 tracking-[-0.03em]">
              {roundResultsHeading(roundNumber)}
            </h2>
            <div className={CARD}>
              <ul>
                {roundMatches.map((match, matchIndex) => (
                  <li
                    key={match.matchId}
                    className={cn(
                      "text-body flex min-h-11 items-center gap-3 px-5 py-4",
                      matchIndex > 0 && "border-rule border-t",
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {match.slot1Name}
                    </span>
                    <PoolMatchTrailing
                      trailing={matchTrailing({
                        cancelled: match.cancelled,
                        scoreLabel: match.scoreLabel,
                      })}
                    />
                    <span className="text-muted-foreground min-w-0 flex-1 truncate text-right">
                      {match.slot2Name}
                    </span>
                  </li>
                ))}
              </ul>
              {isLast && otherPools ? (
                <OtherPoolsRow
                  summary={otherPools}
                  onSelectPool={onSelectPool}
                  className="border-rule border-t"
                />
              ) : null}
            </div>
          </section>
        );
      })}
      {groups.length === 0 && otherPools ? (
        <div className={CARD}>
          <OtherPoolsRow summary={otherPools} onSelectPool={onSelectPool} />
        </div>
      ) : null}
    </div>
  );
}

function PoolMatchTrailing({ trailing }: { trailing: MatchTrailing }) {
  if (trailing.kind === "not_played") {
    return (
      <span className="text-muted-foreground text-meta">{trailing.label}</span>
    );
  }
  if (trailing.kind === "score") {
    return (
      <span className="font-expanded text-[16px] tabular-nums">
        {trailing.label}
      </span>
    );
  }
  return <span className="text-body font-semibold">{trailing.label}</span>;
}

function OtherPoolsRow({
  summary,
  onSelectPool,
  className,
}: {
  summary: NonNullable<ReturnType<typeof otherPoolsPlayedSummary>>;
  onSelectPool: (poolIndex: number) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={cn(
        "text-muted-foreground focus-visible:ring-ring/50 text-body flex min-h-11 w-full items-center gap-3 px-5 py-4 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-inset",
        className,
      )}
      onClick={() => {
        onSelectPool(summary.nextPoolIndex);
      }}
    >
      <span className="min-w-0 flex-1 truncate">{summary.namesLine}</span>
      <span className="text-meta">{summary.playedLabel}</span>
      <ChevronRight aria-hidden="true" className="size-[18px] shrink-0" />
    </button>
  );
}

export function TournamentStandingsHeader({
  name,
  roundsPlayed,
  finished,
  backHref,
  heading = STANDINGS_HEADING,
  lead = TOURNAMENT_ENDS_COPY,
  championLine = null,
}: {
  name: string;
  roundsPlayed: string | null;
  finished: boolean;
  backHref: string;
  heading?: string;
  lead?: string;
  championLine?: string | null;
}) {
  return (
    <header className={cn("border-rule border-b py-[22px]", pageBleed)}>
      <div className="flex items-center justify-between">
        <BackButton variant="boxed" href={backHref} />
        {roundsPlayed ? (
          <p className="text-muted-foreground text-meta">{roundsPlayed}</p>
        ) : (
          <span className="size-11 shrink-0" aria-hidden="true" />
        )}
      </div>
      <PageTitle variant="hero" className="mt-6">
        {heading}
      </PageTitle>
      <p className="text-body mt-2">{name}</p>
      <p className="text-muted-foreground text-meta mt-1 leading-relaxed">
        {lead}
      </p>
      {finished ? (
        <p className="text-muted-foreground text-meta mt-1 leading-relaxed">
          {TOURNAMENT_FINISHED_COPY}
        </p>
      ) : null}
      {championLine ? (
        <p className="text-body mt-2 font-semibold">{championLine}</p>
      ) : null}
    </header>
  );
}

export function TournamentStandingsSection({
  poolTables,
  gameTeams,
}: {
  poolTables: PoolTables;
  gameTeams?: ComponentProps<typeof PoolRecordTable>["gameTeams"];
}) {
  const defaultPool = defaultStandingsPoolIndex(
    poolTables.viewerPoolIndex,
    poolTables.pools,
  );
  const [selected, setSelected] = React.useState(
    defaultPool != null ? String(defaultPool) : "",
  );
  const selectedIndex = Number(selected);
  const selectedPool =
    poolTables.pools.find((pool) => pool.poolIndex === selectedIndex) ??
    poolTables.pools[0];
  const viewerRounds =
    poolTables.pools.find(
      (pool) => pool.poolIndex === poolTables.viewerPoolIndex,
    )?.viewerRounds ?? [];
  const otherPools = selectedPool
    ? otherPoolsPlayedSummary(selectedPool.poolIndex, poolTables.pools)
    : null;

  if (!selectedPool) {
    return null;
  }

  function selectPool(poolIndex: number) {
    setSelected(String(poolIndex));
  }

  return (
    <Tabs
      value={String(selectedPool.poolIndex)}
      onValueChange={setSelected}
      className="gap-0"
    >
      {poolTables.pools.length > 0 ? (
        <TabsList variant="segmented" aria-label={POOLS_SEGMENT_LABEL}>
          {poolTables.pools.map((pool) => (
            <TabsTrigger key={pool.poolIndex} value={String(pool.poolIndex)}>
              {pool.label}
            </TabsTrigger>
          ))}
        </TabsList>
      ) : null}

      {poolTables.pools.map((pool) => (
        <TabsContent
          key={pool.poolIndex}
          value={String(pool.poolIndex)}
          className="pt-[22px]"
        >
          <PoolRecordTable
            rows={pool.rows}
            finished={pool.finished}
            gameTeams={gameTeams}
          />
          {viewerRounds.length > 0 ? (
            <div className="pt-[26px]">
              <TournamentYourRounds mode="results" rounds={viewerRounds} />
            </div>
          ) : null}
          <div className="pt-[26px]">
            <PoolRoundResults
              matches={pool.matches}
              otherPools={
                pool.poolIndex === selectedPool.poolIndex ? otherPools : null
              }
              onSelectPool={selectPool}
            />
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}
