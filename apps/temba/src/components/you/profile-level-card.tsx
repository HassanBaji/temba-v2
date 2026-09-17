"use client";

import { useEffect, useState } from "react";

import { ErrorState } from "~/components/common/error-state";
import { HomeDeclareLevel } from "~/components/home/home-level-block";
import { Skeleton } from "~/components/ui/skeleton";
import {
  displayLabelFromStoredBand,
  nextDistinctDisplayRung,
  type LevelBand,
} from "~/lib/level-bands";
import { confirmationFraction, lastMatchMovement } from "~/lib/profile-level";
import { api } from "~/trpc/react";

function ratedMatchesCaption(count: number) {
  return count === 1 ? "1 rated match" : `${count} rated matches`;
}

function moreToConfirmCaption(remaining: number) {
  return remaining === 1
    ? "about 1 more to confirm"
    : `about ${remaining} more to confirm`;
}

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

  const displayBand = displayLabelFromStoredBand(band);
  const displayNext = nextDistinctDisplayRung(band);
  const movement = lastMatchMovement(history);
  const atTopBand = !provisional && displayNext == null;
  const fillPercent = provisional
    ? Math.min(
        100,
        Math.max(
          0,
          confirmationFraction(ratedMatchCount, ratedMatchesRemaining) * 100,
        ),
      )
    : Math.min(100, Math.max(0, progressPercent ?? 0));
  const progressCaption =
    displayNext == null
      ? "Top Level band"
      : `${Math.round(fillPercent)}% of the way to ${displayNext}`;

  return (
    <section className="border-rule bg-paper overflow-hidden rounded-[14px] border p-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-meta text-muted-foreground">Level</p>
          <p
            aria-hidden="true"
            className="font-expanded mt-1 text-[60px] leading-[0.94]"
          >
            {displayBand}
          </p>
          <span className="sr-only">
            {displayBand}, Level {level}
          </span>
        </div>
        {movement ? (
          <div className="text-right">
            <p className="font-expanded text-[20px]">{movement}</p>
            <p className="text-eyebrow text-muted-foreground">last match</p>
          </div>
        ) : null}
      </div>
      {atTopBand ? (
        <p className="text-eyebrow text-dim mt-[18px]">{progressCaption}</p>
      ) : (
        <>
          <div
            aria-hidden="true"
            className={
              provisional
                ? "hatch mt-[18px] h-2.5 w-full overflow-hidden rounded-[5px]"
                : "bg-wash mt-[18px] h-2.5 w-full overflow-hidden rounded-[5px]"
            }
          >
            <div
              className="bg-ink h-full motion-reduce:transition-none"
              style={{
                width: drawn ? `${fillPercent}%` : "0%",
                transition: "width 900ms cubic-bezier(0.2, 0.7, 0.2, 1)",
              }}
            />
          </div>
          {provisional ? (
            <div className="text-eyebrow text-dim mt-2 flex justify-between gap-3">
              <span>{ratedMatchesCaption(ratedMatchCount)}</span>
              <span>{moreToConfirmCaption(ratedMatchesRemaining)}</span>
            </div>
          ) : (
            <p className="text-eyebrow text-dim mt-2">{progressCaption}</p>
          )}
        </>
      )}
    </section>
  );
}

function ProfileLevelSkeleton() {
  return (
    <div
      aria-busy="true"
      className="border-rule overflow-hidden rounded-[14px] border p-5"
    >
      <Skeleton className="h-3.5 w-12" />
      <Skeleton className="mt-1 h-[56px] w-24" />
      <Skeleton className="mt-[18px] h-2.5 w-full rounded-[5px]" />
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
    return me.data.canSelfDeclare ? <HomeDeclareLevel /> : null;
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
