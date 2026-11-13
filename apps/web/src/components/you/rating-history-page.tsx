"use client";

import { BadgeCheck, PenLine, UserCheck } from "lucide-react";
import { useMemo, useState } from "react";

import { ErrorState } from "~/components/common/error-state";
import { DashboardShell } from "~/components/dashboard-shell";
import { TierFish } from "~/components/groups/tier-fish";
import { useLocale, useMessages } from "~/components/locale-provider";
import { PageTitle } from "~/components/layout/page-title";
import { Button } from "~/components/ui/button";
import { Hatch } from "~/components/ui/hatch";
import { BackButton } from "~/components/ui/nav-icon-button";
import { Skeleton } from "~/components/ui/skeleton";
import { youRatingsHref } from "~/lib/dashboard-paths";
import { cardFrame } from "~/lib/page-layout";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import {
  ratingHistoryScreen,
  type RatingHistoryIcon,
  type RatingHistoryLadder,
  type RatingHistoryLine,
  type RatingHistoryScreen,
} from "@repo/domain/rating-history";
import type { Sport } from "@repo/domain/sport";

const PAGE_SIZE = 20;

function LineIcon({ icon }: { icon: RatingHistoryIcon }) {
  return (
    <span
      aria-hidden="true"
      className="border-rule flex size-[38px] shrink-0 items-center justify-center rounded-[11px] border"
    >
      {icon.kind === "tier" ? (
        icon.band && icon.label ? (
          <TierFish
            band={icon.band}
            label={icon.label}
            className="h-4 w-[27px]"
          />
        ) : (
          <Hatch radius="sm" className="block h-4 w-[27px]" />
        )
      ) : icon.kind === "override" ? (
        <UserCheck className="size-[17px]" />
      ) : (
        <BadgeCheck className="size-[17px]" />
      )}
    </span>
  );
}

function Line({ line }: { line: RatingHistoryLine }) {
  return (
    <li className="border-rule flex items-start gap-3 border-t px-4 py-[13px] first:border-t-0">
      <LineIcon icon={line.icon} />
      <div className="min-w-0 flex-1">
        <p className="text-meta font-semibold">{line.title}</p>
        <p className="text-eyebrow text-muted-foreground">{line.detail}</p>
        {line.byline ? (
          <p className="text-eyebrow text-muted-foreground mt-1.5 flex items-start gap-[7px]">
            <PenLine aria-hidden="true" className="mt-0.5 size-3 shrink-0" />
            <span>{line.byline}</span>
          </p>
        ) : null}
      </div>
      <div className="shrink-0 text-end">
        <p className="font-expanded text-body font-bold tabular-nums">
          {line.delta}
        </p>
        <p className="text-eyebrow text-muted-foreground tabular-nums">
          {line.after}
        </p>
      </div>
    </li>
  );
}

function Filters({
  screen,
  value,
  onSelect,
}: {
  screen: RatingHistoryScreen;
  value: RatingHistoryLadder;
  onSelect: (ladder: RatingHistoryLadder) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label={screen.filterLabel}
      className="border-rule flex gap-[22px] border-b"
    >
      {screen.filters.map((filter) => {
        const selected = filter.value === value;
        return (
          <button
            key={filter.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onSelect(filter.value)}
            className={cn(
              "text-body focus-visible:ring-ring/50 -mb-px min-h-11 border-b-2 outline-none focus-visible:ring-[3px]",
              selected
                ? "border-ink text-ink font-semibold"
                : "text-muted-foreground hover:text-ink border-transparent",
            )}
          >
            {filter.label}
          </button>
        );
      })}
    </div>
  );
}

function Empty({
  empty,
}: {
  empty: NonNullable<RatingHistoryScreen["empty"]>;
}) {
  if (empty.reserved) {
    return (
      <div className="rounded-card relative flex min-h-[72px] items-center overflow-hidden px-4 py-4">
        <Hatch radius="card" className="absolute inset-0" />
        <p className="text-meta text-ink relative font-semibold">
          {empty.text}
        </p>
      </div>
    );
  }
  return (
    <div className={cardFrame}>
      <p className="text-meta text-muted-foreground px-4 py-4">{empty.text}</p>
    </div>
  );
}

/**
 * Rating history (screen 1c): every move of the viewer's Level and Group
 * Tiers on one sport, newest first under This week and then each month,
 * manual changes with who and why. The Rank filter is reserved and empty.
 */
export function RatingHistoryPage({ sport }: { sport: Sport }) {
  const m = useMessages();
  const locale = useLocale();
  const [ladder, setLadder] = useState<RatingHistoryLadder>("all");
  const history = api.ratings.history.useInfiniteQuery(
    { sport, ladder, limit: PAGE_SIZE },
    {
      enabled: ladder !== "rank",
      getNextPageParam: (page) => page.nextCursor ?? undefined,
    },
  );
  const first = history.data?.pages[0];
  const items = useMemo(
    () => history.data?.pages.flatMap((page) => page.entries) ?? [],
    [history.data],
  );
  const screen = ratingHistoryScreen(
    {
      ladder,
      sport,
      items,
      viewerUserId: first?.viewerUserId ?? "",
      now: new Date(),
    },
    locale,
  );
  const loading = ladder !== "rank" && !first;

  return (
    <DashboardShell
      title={m.rating.ratingHistory.title}
      hidePageHeader
      hideMobileTopBar
    >
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-[22px] pb-10">
        <header className="mt-6 flex items-center gap-3 lg:mt-2">
          <BackButton
            href={youRatingsHref(sport)}
            label={m.rating.screen.title}
          />
          <PageTitle className="text-ink">{screen.title}</PageTitle>
        </header>
        <Filters screen={screen} value={ladder} onSelect={setLadder} />
        {loading && history.error ? (
          <ErrorState
            variant="inline"
            className="rounded-card px-5"
            title={m.rating.ratingHistory.loadFailed}
            error={history.error}
            onRetry={() => {
              void history.refetch();
            }}
          />
        ) : loading ? (
          <div aria-busy="true" className="flex flex-col gap-[22px]">
            <Skeleton className="rounded-card h-60 w-full" />
            <Skeleton className="rounded-card h-40 w-full" />
          </div>
        ) : screen.empty ? (
          <Empty empty={screen.empty} />
        ) : (
          <>
            {screen.sections.map((section) => (
              <section
                key={section.key}
                aria-labelledby={`rating-history-${section.key}`}
              >
                <h2
                  id={`rating-history-${section.key}`}
                  className="text-eyebrow text-muted-foreground pb-2"
                >
                  {section.title}
                </h2>
                <ul className={cardFrame}>
                  {section.lines.map((line) => (
                    <Line key={line.key} line={line} />
                  ))}
                </ul>
              </section>
            ))}
            {history.hasNextPage ? (
              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  pending={history.isFetchingNextPage}
                  onClick={() => {
                    void history.fetchNextPage();
                  }}
                >
                  {m.common.showMore}
                </Button>
              </div>
            ) : null}
          </>
        )}
        <p className="text-eyebrow text-muted-foreground">{screen.footnote}</p>
      </div>
    </DashboardShell>
  );
}
