"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { ErrorState } from "~/components/common/error-state";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { DeclareLevelDialog } from "~/components/you/declare-level-dialog";
import {
  chartPointGeometry,
  HOME_CHART_HEIGHT,
  HOME_CHART_WIDTH,
  parseLevelHistory,
  plottedFraction,
} from "~/lib/home-level-chart";
import { toastGlobalFormError } from "~/lib/form-mutation-error";
import {
  displayLabelFromStoredBand,
  nextDistinctDisplayRung,
  type LevelBand,
  type SelfDeclareChoice,
} from "~/lib/level-bands";
import { api } from "~/trpc/react";

function polyline(points: { x: number; y: number }[]) {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

export function HomeLevelBlock({
  band,
  level,
  provisional,
  ratedMatchesRemaining,
  history,
  progressPercent,
}: {
  band: LevelBand;
  level: string;
  provisional: boolean;
  ratedMatchesRemaining: number;
  history: string[];
  progressPercent: number | null;
}) {
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    setDrawn(true);
  }, []);

  const parsed = parseLevelHistory(history);
  const played = parsed?.matchCount ?? 0;
  const fraction = provisional
    ? plottedFraction(played, ratedMatchesRemaining)
    : 1;
  const splitX = HOME_CHART_WIDTH * fraction;
  const values = parsed?.values ?? [];
  const points = chartPointGeometry(
    values,
    provisional ? splitX : HOME_CHART_WIDTH,
    HOME_CHART_HEIGHT,
  );
  const last = points[points.length - 1];
  const line = polyline(points);
  const windowLabel =
    parsed && parsed.matchCount > 0
      ? parsed.matchCount === 1
        ? "last 1 match"
        : `last ${parsed.matchCount} matches`
      : null;
  const delta = parsed?.delta ?? 0;
  const deltaLabel =
    delta === 0
      ? "0.0"
      : `${delta > 0 ? "+" : "−"}${Math.abs(delta).toFixed(1)}`;
  const chartLabel = provisional
    ? `Level over ${played} rated matches; not yet confirmed`
    : `Level over ${played} rated matches`;
  const displayBand = displayLabelFromStoredBand(band);
  const displayNext = nextDistinctDisplayRung(band);
  const atTopBand = displayNext == null;
  const fillPercent = Math.min(100, Math.max(0, progressPercent ?? 0));

  return (
    <section className="border-rule bg-paper overflow-hidden rounded-xl border">
      <div className="flex items-stretch gap-4 p-[22px]">
        <p className="font-expanded text-[88px] leading-none">{displayBand}</p>
        <div className="bg-rule w-px self-stretch" />
        <div className="flex min-w-0 flex-col justify-center gap-1">
          <p className="text-muted-foreground text-meta">Level</p>
          <p className="font-expanded text-[26px] tabular-nums leading-none">
            {level}
          </p>
          {windowLabel ? (
            <p className="text-meta tabular-nums">
              <span aria-hidden="true">
                {delta > 0 ? "↑" : delta < 0 ? "↓" : "→"}{" "}
              </span>
              {deltaLabel} {windowLabel}
            </p>
          ) : null}
        </div>
      </div>

      <div className="border-rule border-t p-[22px]">
        <svg
          viewBox={`0 0 ${HOME_CHART_WIDTH} ${HOME_CHART_HEIGHT}`}
          className="h-[58px] w-full"
          role="img"
          aria-label={chartLabel}
        >
          {provisional ? (
            <foreignObject
              x={splitX}
              y={0}
              width={HOME_CHART_WIDTH - splitX}
              height={HOME_CHART_HEIGHT}
              aria-hidden="true"
            >
              <div aria-hidden="true" className="hatch h-full w-full" />
            </foreignObject>
          ) : null}
          {line ? (
            <polyline
              points={line}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinejoin="round"
              strokeLinecap="round"
              pathLength={1}
              style={{
                strokeDashoffset: drawn ? 0 : 1,
                strokeDasharray: 1,
                transition: "stroke-dashoffset 800ms ease-out",
              }}
            />
          ) : null}
          {provisional && last ? (
            <line
              x1={last.x}
              y1={last.y}
              x2={HOME_CHART_WIDTH}
              y2={last.y}
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              opacity="0.55"
              aria-hidden="true"
            />
          ) : null}
          {!provisional && last ? (
            <circle cx={last.x} cy={last.y} r="2.2" fill="currentColor" />
          ) : null}
          {provisional &&
            points.map((point) => (
              <circle
                key={`${point.x}-${point.y}`}
                cx={point.x}
                cy={point.y}
                r="1.8"
                fill="currentColor"
              />
            ))}
        </svg>
        {provisional ? (
          <p className="text-muted-foreground text-meta mt-2">
            Not yet confirmed
          </p>
        ) : null}
      </div>

      {atTopBand ? (
        <p className="border-rule text-meta border-t px-[22px] py-3">
          Top Level band
        </p>
      ) : (
        <div className="border-rule space-y-2 border-t p-[22px]">
          <p className="text-muted-foreground text-meta">
            {fillPercent}% of the way to {displayNext}
          </p>
          <div
            aria-hidden="true"
            className={
              provisional
                ? "hatch h-2 w-full overflow-hidden rounded-full"
                : "bg-wash h-2 w-full overflow-hidden rounded-full"
            }
          >
            <div
              className="bg-ink h-full"
              style={{
                width: drawn ? `${fillPercent}%` : "0%",
                transition: "width 700ms ease-out",
              }}
            />
          </div>
        </div>
      )}

      <div className="border-rule text-meta flex items-start gap-2 border-t px-[22px] py-3">
        <span
          aria-hidden="true"
          className={
            provisional
              ? "hatch mt-0.5 size-3 shrink-0 rounded-sm"
              : "bg-ink mt-0.5 size-3 shrink-0 rounded-sm"
          }
        />
        {provisional ? (
          <p>
            <span className="font-semibold">Provisional level.</span> Hatched
            means unconfirmed — play about {ratedMatchesRemaining} more rated{" "}
            {ratedMatchesRemaining === 1 ? "game" : "games"} and your level
            confirms.
          </p>
        ) : (
          <p>
            <span className="font-semibold">Level confirmed.</span> Your Level
            now moves with every rated game you play.
          </p>
        )}
      </div>
    </section>
  );
}

export function HomeDeclareLevel() {
  const declareButtonRef = useRef<HTMLButtonElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const utils = api.useUtils();
  const selfDeclare = api.ratings.selfDeclare.useMutation({
    onSuccess: async () => {
      toast.success("Level saved");
      setDialogOpen(false);
      await utils.ratings.me.invalidate();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  return (
    <div className="border-rule bg-paper rounded-xl border p-[22px]">
      <p className="text-lead font-semibold">Declare your Level</p>
      <p className="text-muted-foreground text-meta mt-1">
        Place yourself on the padel ladder. You can do this once, before you
        have a Rated Match.
      </p>
      <Button
        ref={declareButtonRef}
        type="button"
        className="mt-4"
        onClick={() => {
          selfDeclare.reset();
          setDialogOpen(true);
        }}
      >
        Declare Level
      </Button>
      <DeclareLevelDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        pending={selfDeclare.isPending}
        error={selfDeclare.error}
        onDeclare={(choice: SelfDeclareChoice) => {
          selfDeclare.mutate({ sport: "padel", choice });
        }}
        restoreFocusRef={declareButtonRef}
      />
    </div>
  );
}

export function HomeLevel() {
  const me = api.ratings.me.useQuery();

  if (me.isLoading) {
    return (
      <div aria-busy="true" className="border-rule rounded-xl border p-[22px]">
        <Skeleton className="h-20 w-24" />
        <Skeleton className="mt-4 h-[58px] w-full" />
      </div>
    );
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
    <HomeLevelBlock
      band={me.data.rating.levelBand}
      level={me.data.rating.level}
      provisional={me.data.rating.provisional}
      ratedMatchesRemaining={me.data.rating.ratedMatchesRemaining}
      history={me.data.history}
      progressPercent={me.data.progressPercent}
    />
  );
}
