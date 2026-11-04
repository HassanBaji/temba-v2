"use client";

import { ErrorState } from "~/components/common/error-state";
import { SurfaceLabel } from "~/components/common/surface-label";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Skeleton } from "~/components/ui/skeleton";
import { profileAllTimeView } from "@repo/domain/profile-all-time";
import { DEFAULT_SPORT, type Sport } from "@repo/domain/sport";
import { api } from "~/trpc/react";

export function ProfileAllTimeCard({
  sport = DEFAULT_SPORT,
  matchesPlayed,
  matchesWon,
  matchesLost,
  setsWon,
  setsLost,
  goalsScored = 0,
  longestWinStreak,
  mostPlayedPartnerName,
  firstMatchAt,
}: {
  sport?: Sport;
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  setsWon: number;
  setsLost: number;
  goalsScored?: number;
  longestWinStreak: number;
  mostPlayedPartnerName: string | null;
  firstMatchAt: Date | string | null;
}) {
  const m = useMessages();
  const locale = useLocale();
  const copy = m.webAuth.you.allTime;
  const view = profileAllTimeView(
    {
      sport,
      matchesPlayed,
      matchesWon,
      matchesLost,
      setsWon,
      setsLost,
      goalsScored,
      longestWinStreak,
      mostPlayedPartnerName,
      firstMatchAt,
    },
    locale,
  );
  const pct = view.winRatePercent;

  return (
    <section className="border-rule bg-paper rounded-card overflow-hidden border">
      <SurfaceLabel inset="profile" meta={view.sinceLabel}>
        {m.profile.player.allTime}
      </SurfaceLabel>
      <div className="px-5 pb-5">
        <div className="flex items-end justify-between gap-4">
          <div className="flex items-baseline gap-2.5">
            <p className="font-expanded text-[44px] tabular-nums leading-[0.9]">
              {view.matchesPlayed}
            </p>
            <p className="text-meta text-muted-foreground pb-[3px]">
              {copy.matches(view.matchesPlayed)}
            </p>
          </div>
          <div className="min-w-0 text-end">
            <p className="text-body font-semibold tabular-nums">
              {view.record}
            </p>
            <p className="text-eyebrow text-muted-foreground">
              {pct != null ? copy.percentWon(pct) : view.winRateNote}
            </p>
          </div>
        </div>
        {pct != null ? (
          <div className="bg-wash mt-4 flex h-1.5 overflow-hidden rounded-[3px]">
            <div className="bg-ink h-full" style={{ width: `${pct}%` }} />
          </div>
        ) : null}
      </div>
      <div className="border-rule divide-rule divide-y border-t">
        <div className="flex items-center justify-between px-5 py-[14px]">
          <p className="text-meta text-muted-foreground">{view.tally.label}</p>
          <p className="text-body font-semibold tabular-nums">
            {view.tally.value}
          </p>
        </div>
        <div className="flex items-center justify-between px-5 py-[14px]">
          <p className="text-meta text-muted-foreground">
            {copy.longestStreak}
          </p>
          <p className="text-body font-semibold tabular-nums">
            {view.longestStreak}
          </p>
        </div>
        <div className="flex items-center justify-between px-5 py-[14px]">
          <p className="text-meta text-muted-foreground">{view.partnerLabel}</p>
          <p className="text-body truncate ps-3 font-semibold">
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

export function ProfileAllTime({ sport = DEFAULT_SPORT }: { sport?: Sport }) {
  const m = useMessages();
  const stats = api.users.profileStats.useQuery({ sport });

  if (stats.isLoading) {
    return <ProfileAllTimeSkeleton />;
  }

  if (stats.error) {
    return (
      <ErrorState
        variant="inline"
        className="rounded-card px-5"
        title={m.webAuth.you.allTime.failed}
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
      sport={sport}
      matchesPlayed={data.matchesPlayed}
      matchesWon={data.matchesWon}
      matchesLost={data.matchesLost}
      setsWon={data.setsWon}
      setsLost={data.setsLost}
      goalsScored={data.goalsScored}
      longestWinStreak={data.longestWinStreak}
      mostPlayedPartnerName={data.mostPlayedPartner?.name ?? null}
      firstMatchAt={data.firstMatchAt}
    />
  );
}
