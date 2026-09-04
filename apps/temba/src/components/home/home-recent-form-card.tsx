"use client";

import { ChevronRight, Flame } from "lucide-react";
import Link from "next/link";

import { ErrorState } from "~/components/common/error-state";
import { Card } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import { gamesHubTabQuery } from "~/lib/games-hub-tab";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

import {
  deriveRecentForm,
  type RecentFormBar,
  type RecentFormStreak,
  type RecentFormView,
} from "./home-recent-form";

const HISTORY_HREF = `/dashboard/games${gamesHubTabQuery("history")}`;

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
  const fillClass =
    bar.outcome === "won"
      ? "bg-success"
      : bar.outcome === "lost"
        ? "bg-destructive"
        : "bg-primary-foreground/35";

  return (
    <li className="flex min-w-0 flex-1 flex-col items-center gap-1">
      <div
        aria-hidden="true"
        className="bg-primary-foreground/15 relative h-20 w-3.5 overflow-hidden rounded-full"
      >
        <div
          className={cn("absolute inset-x-0 bottom-0 rounded-full", fillClass)}
          style={{ height: `${bar.fillRatio * 100}%` }}
        />
      </div>
      <span
        aria-hidden="true"
        className="text-meta text-primary-foreground/80 font-semibold"
      >
        {bar.label}
      </span>
    </li>
  );
}

function StreakReadout({ streak }: { streak: RecentFormStreak }) {
  const tone =
    streak.kind === "won"
      ? "text-success"
      : streak.kind === "lost"
        ? "text-destructive"
        : "text-primary-foreground/70";

  return (
    <div className="min-w-0 space-y-1">
      <p className="text-meta text-primary-foreground/70">Current streak</p>
      <p
        className={cn(
          "flex items-center gap-1.5 text-lg font-semibold leading-none",
          tone,
        )}
      >
        {streak.kind === "won" ? (
          <Flame aria-hidden="true" className="size-4" strokeWidth={2.25} />
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
    <div className="min-w-0 space-y-1">
      <p className="text-meta text-primary-foreground/70">Win rate (last 10)</p>
      <p className="flex flex-wrap items-baseline gap-2 text-lg font-semibold tabular-nums leading-none">
        <span>{form.winRatePercent}%</span>
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

  const resultsLabel = form.bars.map((bar) => bar.label).join(", ");

  return (
    <div className={cn("min-w-0", className)}>
      <Card
        variant="plain"
        data-slot="home-recent-form-card"
        className="bg-primary text-primary-foreground w-full"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-title font-semibold tracking-[-0.01em]">
              Recent form
            </h2>
            <p className="text-meta text-primary-foreground/70 mt-1">
              Last 10 games
            </p>
          </div>
          <Link
            href={HISTORY_HREF}
            className={cn(
              "text-meta inline-flex min-h-8 shrink-0 items-center gap-0.5 rounded-full px-3 font-semibold",
              "bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/15",
              "focus-visible:ring-primary-foreground/50 outline-none focus-visible:ring-[3px]",
            )}
          >
            View all
            <ChevronRight aria-hidden="true" className="size-3.5" />
          </Link>
        </div>

        <div className="flex flex-wrap items-stretch gap-x-4 gap-y-4">
          <ol
            className="flex min-h-24 min-w-[12rem] flex-1 items-end gap-1.5"
            aria-label={`Recent results, oldest to newest: ${resultsLabel}. ${form.streak.label}. Win rate ${form.winRatePercent} percent`}
          >
            {form.bars.map((bar, index) => (
              <FormBar key={`${bar.label}-${index}`} bar={bar} />
            ))}
          </ol>
          <div className="border-primary-foreground/20 flex min-w-[10rem] flex-col justify-center gap-4 border-t pt-4 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
            <StreakReadout streak={form.streak} />
            <WinRateReadout form={form} />
          </div>
        </div>
      </Card>
    </div>
  );
}
