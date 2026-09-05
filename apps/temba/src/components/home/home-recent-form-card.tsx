"use client";

import { Flame, TrendingDown, TrendingUp } from "lucide-react";

import { ErrorState } from "~/components/common/error-state";
import { Card } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

import {
  deriveRecentForm,
  type RecentFormBar,
  type RecentFormStreak,
  type RecentFormView,
} from "./home-recent-form";

function HomeRecentFormSkeleton() {
  return (
    <Card
      aria-busy="true"
      variant="plain"
      className="bg-primary text-primary-foreground w-full"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="bg-primary-foreground/15 h-5 w-28" />
          <Skeleton className="bg-primary-foreground/10 h-3 w-24" />
        </div>
        <Skeleton className="bg-primary-foreground/15 h-7 w-20 rounded-full" />
      </div>
      <div className="flex flex-wrap items-stretch gap-x-4 gap-y-4">
        <div className="flex h-24 min-w-[12rem] flex-1 items-end gap-1.5">
          {Array.from({ length: 10 }).map((_, index) => (
            <Skeleton
              key={index}
              className="bg-primary-foreground/15 h-full w-3.5 rounded-full"
            />
          ))}
        </div>
        <div className="border-primary-foreground/20 flex min-w-[10rem] flex-col justify-center gap-4 border-t pt-4 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
          <div className="space-y-2">
            <Skeleton className="bg-primary-foreground/10 h-3 w-24" />
            <Skeleton className="bg-primary-foreground/15 h-6 w-20" />
          </div>
          <div className="space-y-2">
            <Skeleton className="bg-primary-foreground/10 h-3 w-32" />
            <Skeleton className="bg-primary-foreground/15 h-6 w-16" />
          </div>
        </div>
      </div>
    </Card>
  );
}

function FormBar({ bar }: { bar: RecentFormBar }) {
  if (bar.kind === "empty") {
    return (
      <div
        className={`border-primary flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed`}
      >
        -
      </div>
    );
  }

  return (
    <div
      className={cn(
        `flex h-8 w-8 items-center justify-center rounded-full border-2`,
        bar.outcome === "won"
          ? "border-success"
          : bar.outcome === "lost"
            ? "border-destructive"
            : "border-primary/35",
      )}
    >
      <p className="text-xs font-semibold">{bar.label}</p>
    </div>
  );
}

function StreakReadout({ streak }: { streak: RecentFormStreak }) {
  return (
    <div
      className={cn(
        `w-fit rounded-2xl p-2`,
        streak.kind === "lost"
          ? "border-destructive bg-destructive/10"
          : "border-success bg-success/10",
      )}
    >
      <p className={"flex items-center gap-1.5 text-xs font-semibold"}>
        {streak.kind === "lost" ? (
          <TrendingDown aria-hidden="true" className="size-4" />
        ) : streak.kind === "won" ? (
          <TrendingUp aria-hidden="true" className="size-4" />
        ) : null}
        {streak.label}
      </p>
    </div>
  );
}

function WinRateReadout({ form }: { form: RecentFormView }) {
  const trend = form.trendPoints;
  const trendTone =
    trend == null
      ? null
      : trend > 0
        ? "text-success"
        : trend < 0
          ? "text-destructive"
          : "text-primary-foreground/70";
  const trendArrow =
    trend == null ? null : trend > 0 ? "↑" : trend < 0 ? "↓" : null;

  return (
    <div className="w-fit">
      <p className="flex flex-wrap items-baseline gap-2 text-lg font-semibold tabular-nums">
        <div className="flex flex-col items-end">
          <span>{form.winRatePercent}%</span>
          <span className="text-muted-foreground/70 text-xs">win rate</span>
        </div>
        {trend != null && trendTone ? (
          <span
            className={cn("text-meta font-semibold tabular-nums", trendTone)}
          >
            {trendArrow ? `${trendArrow} ` : null}
            {Math.abs(trend)}%
          </span>
        ) : null}
      </p>
    </div>
  );
}

export function HomeRecentFormCard({ className }: { className?: string }) {
  const history = api.games.listMyMatchHistory.useQuery();

  if (history.isLoading) {
    return (
      <div className={className}>
        <HomeRecentFormSkeleton />
      </div>
    );
  }

  if (history.error) {
    return (
      <div className={className}>
        <ErrorState
          title="Recent form could not be loaded"
          message={history.error.message}
          onRetry={() => {
            void history.refetch();
          }}
        />
      </div>
    );
  }

  const form = history.data ? deriveRecentForm(history.data) : null;
  if (!form) {
    return null;
  }

  const resultsLabel = form.bars
    .filter((bar) => bar.kind === "played")
    .map((bar) => bar.label)
    .join(", ");

  return (
    <div className={cn("mt-4 min-w-0", className)}>
      <Card data-slot="home-recent-form-card" className="w-full">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-meta mt-1">Last 10 games</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="mt-1 text-3xl font-semibold">
            {form.wins}W <span className="text-muted-foreground/70">•</span>{" "}
            {form.losses}L
          </p>
          <WinRateReadout form={form} />
        </div>
        <StreakReadout streak={form.streak} />

        <div className="mt-4 flex flex-wrap items-stretch gap-x-4 gap-y-4">
          <ol
            className="flex flex-1 items-end gap-1"
            aria-label={`Recent results, oldest to newest: ${resultsLabel}. ${form.streak.label}. Win rate ${form.winRatePercent} percent`}
          >
            {form.bars.map((bar, index) => (
              <FormBar
                key={
                  bar.kind === "played"
                    ? `${bar.label}-${index}`
                    : `empty-${index}`
                }
                bar={bar}
              />
            ))}
          </ol>
        </div>
      </Card>
    </div>
  );
}
