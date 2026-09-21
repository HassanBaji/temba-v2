"use client";

import { ChevronLeftIcon, ChevronRight } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { PoolRecordTable } from "~/components/games/tournament-pool-tables-panel";
import { TournamentYourRounds } from "~/components/games/tournament-your-rounds";
import { TAB_SEGMENT } from "~/components/groups/group-home-chrome";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  POOLS_SEGMENT_LABEL,
  STANDINGS_HEADING,
  TOURNAMENT_ENDS_COPY,
  defaultStandingsPoolIndex,
  otherPoolsPlayedSummary,
  roundResultsHeading,
} from "~/lib/tournament-home";
import { TOURNAMENT_FINISHED_COPY } from "~/lib/tournament-pool-table";
import { cn } from "~/lib/utils";
import type { RouterOutputs } from "~/trpc/react";

type PoolTables = NonNullable<RouterOutputs["games"]["byId"]["poolTables"]>;
type PoolTable = PoolTables["pools"][number];
type PoolMatch = PoolTable["matches"][number];

const CARD = "border-rule overflow-hidden rounded-[14px] border";
const STANDINGS_BACK =
  "border-rule text-ink focus-visible:ring-ring/50 inline-flex size-11 min-h-11 min-w-11 shrink-0 items-center justify-center rounded-[10px] border outline-none focus-visible:ring-[3px]";

function matchesByRound(matches: PoolMatch[]) {
  const groups = new Map<number, PoolMatch[]>();
  for (const match of matches) {
    const round = match.roundNumber ?? 0;
    const list = groups.get(round) ?? [];
    list.push(match);
    groups.set(round, list);
  }
  return [...groups.entries()].sort(([left], [right]) => left - right);
}

function PoolRoundResults({
  matches,
  otherPools,
  onSelectPool,
}: {
  matches: PoolMatch[];
  otherPools: ReturnType<typeof otherPoolsPlayedSummary>;
  onSelectPool: (poolIndex: number) => void;
}) {
  const groups = matchesByRound(matches);
  if (groups.length === 0 && !otherPools) {
    return null;
  }

  return (
    <div className="space-y-6">
      {groups.map(([roundNumber, roundMatches], index) => {
        const isLast = index === groups.length - 1;
        return (
          <section key={roundNumber}>
            <h2 className="font-expanded pb-2.5 text-[19px] tracking-[-0.03em]">
              {roundResultsHeading(roundNumber)}
            </h2>
            <div className={CARD}>
              <ul>
                {roundMatches.map((match, matchIndex) => (
                  <li
                    key={match.matchId}
                    className={cn(
                      "flex min-h-11 items-center gap-3 px-5 py-4 text-[14px]",
                      matchIndex > 0 && "border-rule border-t",
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {match.slot1Name}
                    </span>
                    {match.cancelled ? (
                      <span className="text-muted-foreground text-sm">
                        Not played
                      </span>
                    ) : match.scoreLabel ? (
                      <span className="font-expanded text-[16px] tabular-nums">
                        {match.scoreLabel}
                      </span>
                    ) : (
                      <span className="text-sm font-semibold">Open</span>
                    )}
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
        "text-muted-foreground flex min-h-11 w-full items-center gap-3 px-5 py-4 text-left text-[14px]",
        className,
      )}
      onClick={() => {
        onSelectPool(summary.nextPoolIndex);
      }}
    >
      <span className="min-w-0 flex-1 truncate">{summary.namesLine}</span>
      <span className="text-[13px]">{summary.playedLabel}</span>
      <ChevronRight
        aria-hidden="true"
        className="size-4 shrink-0"
        strokeWidth={1.75}
      />
    </button>
  );
}

export function TournamentStandingsHeader({
  name,
  roundsPlayed,
  finished,
  backHref,
}: {
  name: string;
  roundsPlayed: string | null;
  finished: boolean;
  backHref: string;
}) {
  return (
    <header className="border-rule -mx-4 border-b px-4 pb-[22px] pt-[22px] min-[430px]:-mx-5 min-[430px]:px-5 md:-mx-6 md:px-6 xl:-mx-8 xl:px-8">
      <div className="flex items-center justify-between">
        <Link href={backHref} aria-label="Back" className={STANDINGS_BACK}>
          <ChevronLeftIcon aria-hidden="true" className="size-5" />
        </Link>
        {roundsPlayed ? (
          <p className="text-muted-foreground text-[13px]">{roundsPlayed}</p>
        ) : (
          <span className="size-11 shrink-0" aria-hidden="true" />
        )}
      </div>
      <h1 className="font-expanded mt-6 text-[38px] leading-none tracking-[-0.03em]">
        {STANDINGS_HEADING}
      </h1>
      <p className="mt-2 text-[15px]">{name}</p>
      <p className="text-muted-foreground mt-1 text-[13px] leading-relaxed">
        {TOURNAMENT_ENDS_COPY}
      </p>
      {finished ? (
        <p className="text-muted-foreground mt-1 text-[13px] leading-relaxed">
          {TOURNAMENT_FINISHED_COPY}
        </p>
      ) : null}
    </header>
  );
}

export function TournamentStandingsSection({
  poolTables,
}: {
  poolTables: PoolTables;
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
        <TabsList
          aria-label={POOLS_SEGMENT_LABEL}
          className="border-rule bg-paper w-full max-w-full justify-stretch overflow-hidden rounded-[12px] border p-0 group-data-[orientation=horizontal]/tabs:h-auto"
        >
          {poolTables.pools.map((pool) => (
            <TabsTrigger
              key={pool.poolIndex}
              value={String(pool.poolIndex)}
              className={TAB_SEGMENT}
            >
              {pool.label}
            </TabsTrigger>
          ))}
        </TabsList>
      ) : null}

      {poolTables.pools.map((pool) => (
        <TabsContent
          key={`table-${pool.poolIndex}`}
          value={String(pool.poolIndex)}
          className="pt-[22px]"
        >
          <PoolRecordTable rows={pool.rows} finished={pool.finished} />
        </TabsContent>
      ))}

      {viewerRounds.length > 0 ? (
        <div className="pt-[26px]">
          <TournamentYourRounds mode="results" rounds={viewerRounds} />
        </div>
      ) : null}

      {poolTables.pools.map((pool) => (
        <TabsContent
          key={`results-${pool.poolIndex}`}
          value={String(pool.poolIndex)}
          className="pt-[26px]"
        >
          <PoolRoundResults
            matches={pool.matches}
            otherPools={
              pool.poolIndex === selectedPool.poolIndex ? otherPools : null
            }
            onSelectPool={selectPool}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}
