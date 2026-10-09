"use client";

import { ErrorState } from "~/components/common/error-state";
import { SurfaceLabel } from "~/components/common/surface-label";
import { Skeleton } from "~/components/ui/skeleton";
import { profileAllTimeView } from "@repo/domain/profile-all-time";
import { api } from "~/trpc/react";

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
  const view = profileAllTimeView({
    matchesPlayed,
    matchesWon,
    matchesLost,
    setsWon,
    setsLost,
    longestWinStreak,
    mostPlayedPartnerName,
    firstMatchAt,
  });
  const pct = view.winRatePercent;

  return (
    <section className="border-rule bg-paper rounded-card overflow-hidden border">
      <SurfaceLabel inset="profile" meta={view.sinceLabel}>
        All time
      </SurfaceLabel>
      <div className="px-5 pb-5">
        <div className="flex items-end justify-between gap-4">
          <div className="flex items-baseline gap-2.5">
            <p className="font-expanded text-[44px] tabular-nums leading-[0.9]">
              {view.matchesPlayed}
            </p>
            <p className="text-meta text-muted-foreground pb-[3px]">matches</p>
          </div>
          <div className="text-right">
            <p className="font-expanded text-[20px] tabular-nums">
              {view.record}
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
          <p className="text-body font-semibold tabular-nums">{view.sets}</p>
        </div>
        <div className="flex items-center justify-between px-5 py-[14px]">
          <p className="text-meta text-muted-foreground">Longest streak</p>
          <p className="text-body font-semibold tabular-nums">
            {view.longestStreak}
          </p>
        </div>
        <div className="flex items-center justify-between px-5 py-[14px]">
          <p className="text-meta text-muted-foreground">Most played partner</p>
          <p className="text-body truncate pl-3 font-semibold">
            {view.mostPlayedPartner}
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
