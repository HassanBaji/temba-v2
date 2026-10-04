"use client";

import { ErrorState } from "~/components/common/error-state";
import { SurfaceLabel } from "~/components/common/surface-label";
import { Skeleton } from "~/components/ui/skeleton";
import { shortPlayerName } from "@repo/domain/player-name";
import { winRatePercent } from "@repo/domain/win-rate";
import { api } from "~/trpc/react";

function yearFromMatchAt(value: Date | string | null | undefined) {
  if (value == null) {
    return null;
  }
  const year = new Date(value).getFullYear();
  return Number.isFinite(year) ? year : null;
}

function streakLabel(streak: number) {
  if (streak <= 0) {
    return "—";
  }
  return streak === 1 ? "1 win" : `${streak} wins`;
}

export function ProfileAllTimeCard({
  matchesPlayed,
  matchesWon,
  matchesLost,
  setsWon,
  setsLost,
  longestWinStreak,
  mostPlayedPartnerName,
  firstMatchAt,
}: {
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  setsWon: number;
  setsLost: number;
  longestWinStreak: number;
  mostPlayedPartnerName: string | null;
  firstMatchAt: Date | string | null;
}) {
  const sinceYear = yearFromMatchAt(firstMatchAt);
  const pct = winRatePercent(matchesWon, matchesPlayed);
  const hasMatches = matchesPlayed > 0;

  return (
    <section className="border-rule bg-paper rounded-card overflow-hidden border">
      <SurfaceLabel
        inset="profile"
        meta={sinceYear != null ? `Since ${sinceYear}` : null}
      >
        All time
      </SurfaceLabel>
      <div className="px-5 pb-5">
        <div className="flex items-end justify-between gap-4">
          <div className="flex items-baseline gap-2.5">
            <p className="font-expanded text-[44px] tabular-nums leading-[0.9]">
              {matchesPlayed}
            </p>
            <p className="text-meta text-muted-foreground pb-[3px]">matches</p>
          </div>
          <div className="text-right">
            <p className="font-expanded text-[20px] tabular-nums">
              {matchesWon}–{matchesLost}
            </p>
            {pct != null ? (
              <p className="text-eyebrow text-muted-foreground">{pct}% won</p>
            ) : null}
          </div>
        </div>
        <div className="bg-wash mt-4 flex h-1.5 overflow-hidden rounded-[3px]">
          <div className="bg-ink h-full" style={{ width: `${pct ?? 0}%` }} />
        </div>
      </div>
      <div className="border-rule divide-rule divide-y border-t">
        <div className="flex items-center justify-between px-5 py-[14px]">
          <p className="text-meta text-muted-foreground">Sets</p>
          <p className="text-body font-semibold tabular-nums">
            {hasMatches ? `${setsWon}–${setsLost}` : "—"}
          </p>
        </div>
        <div className="flex items-center justify-between px-5 py-[14px]">
          <p className="text-meta text-muted-foreground">Longest streak</p>
          <p className="text-body font-semibold tabular-nums">
            {streakLabel(longestWinStreak)}
          </p>
        </div>
        <div className="flex items-center justify-between px-5 py-[14px]">
          <p className="text-meta text-muted-foreground">Most played partner</p>
          <p className="text-body truncate pl-3 font-semibold">
            {mostPlayedPartnerName
              ? shortPlayerName(mostPlayedPartnerName)
              : "—"}
          </p>
        </div>
      </div>
    </section>
  );
}

function ProfileAllTimeSkeleton() {
  return (
    <div
      aria-busy="true"
      className="border-rule rounded-card overflow-hidden border"
    >
      <div className="flex items-baseline justify-between px-5 pb-3 pt-5">
        <Skeleton className="h-3.5 w-16" />
        <Skeleton className="h-3 w-16" />
      </div>
      <div className="px-5 pb-5">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="mt-4 h-1.5 w-full rounded-[3px]" />
      </div>
      <div className="border-rule divide-rule divide-y border-t">
        <div className="px-5 py-[14px]">
          <Skeleton className="h-4 w-full" />
        </div>
        <div className="px-5 py-[14px]">
          <Skeleton className="h-4 w-full" />
        </div>
        <div className="px-5 py-[14px]">
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    </div>
  );
}

export function ProfileAllTime() {
  const stats = api.users.profileStats.useQuery();

  if (stats.isLoading) {
    return <ProfileAllTimeSkeleton />;
  }

  if (stats.error) {
    return (
      <ErrorState
        variant="inline"
        className="rounded-card px-5"
        title="All time could not be loaded"
        message={stats.error.message}
        onRetry={() => {
          void stats.refetch();
        }}
      />
    );
  }

  const data = stats.data;
  if (!data) {
    return null;
  }

  return (
    <ProfileAllTimeCard
      matchesPlayed={data.matchesPlayed}
      matchesWon={data.matchesWon}
      matchesLost={data.matchesLost}
      setsWon={data.setsWon}
      setsLost={data.setsLost}
      longestWinStreak={data.longestWinStreak}
      mostPlayedPartnerName={data.mostPlayedPartner?.name ?? null}
      firstMatchAt={data.firstMatchAt}
    />
  );
}
