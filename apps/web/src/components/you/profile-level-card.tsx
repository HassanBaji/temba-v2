"use client";

import { useEffect, useState } from "react";

import { ErrorState } from "~/components/common/error-state";
import { SurfaceLabel } from "~/components/common/surface-label";
import { HomeDeclareLevel } from "~/components/home/home-level-block";
import { Skeleton } from "~/components/ui/skeleton";
import type { LevelBand } from "@repo/domain/level-bands";
import { profileLevelView } from "@repo/domain/profile-level";
import { api } from "~/trpc/react";

export function ProfileLevelCard({
  band,
  level,
  provisional,
  ratedMatchCount,
  ratedMatchesRemaining,
  progressPercent,
  history,
}: {
  band: LevelBand;
  level: string;
  provisional: boolean;
  ratedMatchCount: number;
  ratedMatchesRemaining: number;
  progressPercent: number | null;
  history: string[];
}) {
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    setDrawn(true);
  }, []);

  const view = profileLevelView({
    band,
    level,
    provisional,
    ratedMatchCount,
    ratedMatchesRemaining,
    progressPercent,
    history,
  });

  return (
    <section className="border-rule bg-paper rounded-card overflow-hidden border">
      <SurfaceLabel inset="profile" meta="Padel">
        Level
      </SurfaceLabel>
      <div className="px-5 pb-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p
              aria-hidden="true"
              className="font-expanded text-[60px] leading-[0.94]"
            >
              {view.displayBand}
            </p>
            <span className="sr-only">
              {view.displayBand}, Level {view.level}
            </span>
          </div>
          {view.movement ? (
            <div className="text-right">
              <p className="font-expanded text-[20px]">{view.movement}</p>
              <p className="text-eyebrow text-muted-foreground">last match</p>
            </div>
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

export function ProfileLevel() {
  const me = api.ratings.me.useQuery();

  if (me.isLoading) {
    return <ProfileLevelSkeleton />;
  }

  if (me.error) {
    return (
      <ErrorState
        variant="inline"
        className="rounded-card px-5"
        title="Level could not be loaded"
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
      <HomeDeclareLevel surface="profile" />
    ) : null;
  }

  return (
    <ProfileLevelCard
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
