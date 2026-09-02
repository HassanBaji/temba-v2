"use client";

import { Gauge, Minus, TrendingDown, TrendingUp } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { EmptyState } from "~/components/common/empty-state";
import { ErrorState } from "~/components/common/error-state";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { DeclareLevelDialog } from "~/components/you/declare-level-dialog";
import { toastGlobalFormError } from "~/lib/form-mutation-error";
import { type LevelBand, type SelfDeclareChoice } from "~/lib/level-bands";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

/** Plot area in viewBox units; the SVG is stretched to the card width. */
const SPARK_WIDTH = 100;
const SPARK_HEIGHT = 32;
const SPARK_PAD_Y = 4;

function HomeRatingSkeleton() {
  return (
    <Card aria-busy="true" className="w-full">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-9 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-4 w-14" />
      </div>
      <Skeleton className="h-14 w-full" />
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-8" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
    </Card>
  );
}

type LevelHistory = {
  values: number[];
  /** Rated Matches represented by the history (one fewer than the points). */
  matchCount: number;
  /** Level change across the window, rounded to the displayed decimal. */
  delta: number;
};

function parseHistory(history: string[]): LevelHistory | null {
  const values = history.map((point) => Number.parseFloat(point));
  const first = values[0];
  const latest = values[values.length - 1];
  if (
    values.length < 2 ||
    first === undefined ||
    latest === undefined ||
    values.some((value) => Number.isNaN(value))
  ) {
    return null;
  }

  return {
    values,
    matchCount: values.length - 1,
    delta: Math.round((latest - first) * 10) / 10,
  };
}

function matchCountCopy(matchCount: number) {
  return `${matchCount} Rated ${matchCount === 1 ? "Match" : "Matches"}`;
}

function LevelSparkline({
  values,
  matchCount,
}: {
  values: number[];
  matchCount: number;
}) {
  const gradientId = React.useId();

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;

  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * SPARK_WIDTH;
    const normalized = span === 0 ? 0.5 : (value - min) / span;
    const y = SPARK_PAD_Y + (1 - normalized) * (SPARK_HEIGHT - SPARK_PAD_Y * 2);
    return { x, y };
  });

  const line = points.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `${line} ${SPARK_WIDTH},${SPARK_HEIGHT} 0,${SPARK_HEIGHT}`;
  const last = points[points.length - 1];

  return (
    <div className="text-foreground relative h-14 w-full min-w-0">
      <svg
        viewBox={`0 0 ${SPARK_WIDTH} ${SPARK_HEIGHT}`}
        preserveAspectRatio="none"
        className="size-full"
        role="img"
        aria-label={`Level over the last ${matchCountCopy(matchCount)}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.16" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill={`url(#${gradientId})`} />
        <polyline
          points={line}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {last ? (
        <span
          aria-hidden="true"
          className="bg-foreground ring-card absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2"
          style={{
            left: `${(last.x / SPARK_WIDTH) * 100}%`,
            top: `${(last.y / SPARK_HEIGHT) * 100}%`,
          }}
        />
      ) : null}
    </div>
  );
}

function LevelTrend({
  delta,
  matchCount,
}: {
  delta: number;
  matchCount: number;
}) {
  const Icon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const sign = delta > 0 ? "+" : delta < 0 ? "−" : "";
  const window = `over the last ${matchCountCopy(matchCount)}`;
  const description =
    delta === 0
      ? `Level unchanged ${window}`
      : `Level ${delta > 0 ? "up" : "down"} ${Math.abs(delta).toFixed(1)} ${window}`;

  return (
    <span
      className={cn(
        "text-meta inline-flex shrink-0 items-center gap-1 font-semibold tabular-nums",
        delta > 0 ? "text-success" : "text-muted-foreground",
      )}
    >
      <span className="sr-only">{description}</span>
      <Icon aria-hidden="true" className="size-3.5" strokeWidth={2.5} />
      <span aria-hidden="true">
        {sign}
        {Math.abs(delta).toFixed(1)}
      </span>
    </span>
  );
}

function BandProgress({
  progressPercent,
  nextBand,
}: {
  progressPercent: number;
  nextBand: LevelBand | null;
}) {
  const clamped = Math.min(100, Math.max(0, progressPercent));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-meta text-muted-foreground min-w-0 truncate">
          {nextBand ? (
            <>
              Progress to{" "}
              <span className="text-foreground font-semibold">{nextBand}</span>
            </>
          ) : (
            "Top Level band"
          )}
        </p>
        <p className="text-meta text-foreground shrink-0 font-semibold tabular-nums">
          {clamped}%
        </p>
      </div>
      <div
        className="bg-muted h-2 w-full overflow-hidden rounded-full"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={
          nextBand
            ? `${clamped}% progress to Level band ${nextBand}`
            : "Top Level band"
        }
      >
        <div
          className="bg-foreground h-full rounded-full motion-safe:transition-[width] motion-safe:duration-700 motion-safe:ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

function RatedLevelCard({
  level,
  levelBand,
  provisional,
  progressPercent,
  nextBand,
  history,
}: {
  level: string;
  levelBand: LevelBand;
  provisional: boolean;
  progressPercent: number;
  nextBand: LevelBand | null;
  history: string[];
}) {
  const trend = parseHistory(history);

  return (
    <Card className="w-full">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <p className="text-eyebrow text-muted-foreground font-medium uppercase tracking-[0.06em]">
            Padel
          </p>
          <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <p className="text-display font-bold leading-none tracking-[-0.02em]">
              <span className="sr-only">Level band </span>
              {levelBand}
            </p>
            {provisional ? (
              <Badge variant="secondary">Provisional</Badge>
            ) : null}
          </div>
          <p className="text-meta text-muted-foreground">
            Level{" "}
            <span className="text-foreground font-semibold tabular-nums">
              {level}
            </span>
          </p>
        </div>

        {trend ? (
          <LevelTrend delta={trend.delta} matchCount={trend.matchCount} />
        ) : null}
      </div>

      {trend ? (
        <div className="min-w-0 space-y-1.5">
          <LevelSparkline values={trend.values} matchCount={trend.matchCount} />
          <p className="text-meta text-muted-foreground">
            Last {matchCountCopy(trend.matchCount)}
          </p>
        </div>
      ) : null}

      <BandProgress progressPercent={progressPercent} nextBand={nextBand} />
    </Card>
  );
}

export function HomeRatingCard({ className }: { className?: string }) {
  const utils = api.useUtils();
  const me = api.ratings.me.useQuery();
  const declareButtonRef = React.useRef<HTMLButtonElement>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);

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

  function onDeclare(choice: SelfDeclareChoice) {
    selfDeclare.mutate({ sport: "padel", choice });
  }

  if (me.isLoading) {
    return (
      <div className={className}>
        <HomeRatingSkeleton />
      </div>
    );
  }

  if (me.error) {
    return (
      <div className={className}>
        <ErrorState
          title="Level could not be loaded"
          message={me.error.message}
          onRetry={() => {
            void me.refetch();
          }}
        />
      </div>
    );
  }

  if (!me.data) {
    return null;
  }

  return (
    <div className={cn("min-w-0", className)}>
      {me.data.rating && me.data.progressPercent !== null ? (
        <RatedLevelCard
          level={me.data.rating.level}
          levelBand={me.data.rating.levelBand}
          provisional={me.data.rating.provisional}
          progressPercent={me.data.progressPercent}
          nextBand={me.data.nextBand}
          history={me.data.history}
        />
      ) : null}

      {!me.data.rating && me.data.canSelfDeclare ? (
        <Card variant="outlined" className="p-0">
          <EmptyState
            className="py-8"
            icon={Gauge}
            title="Declare your Level"
            description="Place yourself on the padel ladder. You can do this once, before you have a Rated Match."
            action={
              <Button
                ref={declareButtonRef}
                type="button"
                variant="brand"
                onClick={() => {
                  selfDeclare.reset();
                  setDialogOpen(true);
                }}
              >
                Declare Level
              </Button>
            }
          />
        </Card>
      ) : null}

      <DeclareLevelDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        pending={selfDeclare.isPending}
        error={selfDeclare.error}
        onDeclare={onDeclare}
        restoreFocusRef={declareButtonRef}
      />
    </div>
  );
}
