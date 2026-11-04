"use client";

import { useEffect, useState } from "react";

import { ErrorState } from "~/components/common/error-state";
import { SurfaceLabel } from "~/components/common/surface-label";
import { useLocale, useMessages } from "~/components/locale-provider";
import { HomeDeclareLevel } from "~/components/home/home-level-block";
import { Skeleton } from "~/components/ui/skeleton";
import type { LevelBand } from "@repo/domain/level-bands";
import { profileLevelView } from "@repo/domain/profile-level";
import { DEFAULT_SPORT, type Sport } from "@repo/domain/sport";
import { api } from "~/trpc/react";

export function ProfileLevelCard({
  sport = DEFAULT_SPORT,
  band,
  level,
  provisional,
  ratedMatchCount,
  ratedMatchesRemaining,
  progressPercent,
  history,
}: {
  sport?: Sport;
  band: LevelBand;
  level: string;
  provisional: boolean;
  ratedMatchCount: number;
  ratedMatchesRemaining: number;
  progressPercent: number | null;
  history: string[];
}) {
  const m = useMessages();
  const locale = useLocale();
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    setDrawn(true);
  }, []);

  const view = profileLevelView(
    {
      sport,
      band,
      level,
      provisional,
      ratedMatchCount,
      ratedMatchesRemaining,
      progressPercent,
      history,
    },
    locale,
  );

  return (
    <section className="border-rule bg-paper rounded-card overflow-hidden border">
      <SurfaceLabel inset="profile">{m.home.level.heading[sport]}</SurfaceLabel>
      <div className="px-5 pb-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p
              aria-hidden="true"
              dir="ltr"
              className="font-expanded text-[60px] leading-[0.94]"
            >
              {view.displayBand}
            </p>
            <span className="sr-only">
              {m.webAuth.you.level.bandLevelSpoken(
                view.displayBand,
                view.level,
              )}
            </span>
          </div>
          {view.movementLabel ? (
            <p className="text-eyebrow text-muted-foreground text-end">
              {view.movementLabel}
            </p>
          ) : null}
        </div>
        {view.atTopBand ? (
          <p className="text-eyebrow text-muted-foreground mt-[18px]">
            {view.caption}
          </p>
        ) : (
          <>
            <div
              aria-hidden="true"
              className={
                view.provisional
                  ? "hatch rounded-xs mt-[18px] h-2.5 w-full overflow-hidden"
                  : "bg-wash rounded-xs mt-[18px] h-2.5 w-full overflow-hidden"
              }
            >
              <div
                className="bg-ink h-full motion-reduce:transition-none"
                style={{
                  width: drawn ? `${view.fillPercent}%` : "0%",
                  transition: "width 900ms cubic-bezier(0.2, 0.7, 0.2, 1)",
                }}
              />
            </div>
            <p className="text-eyebrow text-muted-foreground mt-2">
              {view.caption}
            </p>
          </>
        )}
      </div>
    </section>
  );
}

function ProfileLevelSkeleton() {
  return (
    <div
      aria-busy="true"
      className="border-rule rounded-card overflow-hidden border p-5"
    >
      <Skeleton className="h-3.5 w-12" />
      <Skeleton className="mt-4 h-[56px] w-24" />
      <Skeleton className="rounded-xs mt-[18px] h-2.5 w-full" />
    </div>
  );
}

export function ProfileLevel({ sport = DEFAULT_SPORT }: { sport?: Sport }) {
  const m = useMessages();
  const me = api.ratings.me.useQuery({ sport });

  if (me.isLoading) {
    return <ProfileLevelSkeleton />;
  }

  if (me.error) {
    return (
      <ErrorState
        variant="inline"
        className="rounded-card px-5"
        title={m.webAuth.you.level.failed}
        message={me.error.message}
        onRetry={() => {
          void me.refetch();
        }}
      />
    );
  }

  if (!me.data) {
    return null;
  }

  if (!me.data.rating) {
    return me.data.canSelfDeclare ? (
      <HomeDeclareLevel surface="profile" sport={sport} />
    ) : null;
  }

  return (
    <ProfileLevelCard
      sport={sport}
      band={me.data.rating.levelBand}
      level={me.data.rating.level}
      provisional={me.data.rating.provisional}
      ratedMatchCount={me.data.ratedMatchCount}
      ratedMatchesRemaining={me.data.rating.ratedMatchesRemaining}
      progressPercent={me.data.progressPercent}
      history={me.data.history}
    />
  );
}
