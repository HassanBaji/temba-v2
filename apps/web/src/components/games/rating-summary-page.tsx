"use client";

import { isNotFoundError } from "@repo/domain/is-not-found-error";
import {
  performanceRatingSummaryView,
  type RatingSummaryRow,
  type RatingSummarySide,
} from "@repo/domain/performance-rating";
import { ChevronDownIcon, ScaleIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useState, type ReactNode } from "react";

import { ErrorState } from "~/components/common/error-state";
import { DashboardShell } from "~/components/dashboard-shell";
import { Hero } from "~/components/games/rate-game-page";
import { PageTitle } from "~/components/layout/page-title";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { BackButton } from "~/components/ui/nav-icon-button";
import { Skeleton } from "~/components/ui/skeleton";
import { useNow } from "~/hooks/use-now";
import { gameHomeHref, groupMembersTabHref } from "~/lib/dashboard-paths";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

function Frame({ gameId, children }: { gameId: string; children: ReactNode }) {
  const m = useMessages();
  return (
    <DashboardShell
      title={m.rating.performance.summary.title}
      hidePageHeader
      hideMobileTopBar
    >
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-[26px] pb-6">
        <header className="mt-6 flex items-center gap-3 lg:mt-2">
          <BackButton
            href={gameHomeHref(gameId)}
            label={m.webTournament.backToGame}
          />
          <PageTitle className="text-ink">
            {m.rating.performance.summary.title}
          </PageTitle>
        </header>
        {children}
      </div>
    </DashboardShell>
  );
}

function PlayerRow({ row }: { row: RatingSummaryRow }) {
  return (
    <li
      className={cn(
        "border-rule flex items-center gap-3 border-t px-4 py-[11px] first:border-t-0",
        row.isViewer && "bg-wash",
      )}
    >
      <span className="sr-only">{row.spoken}</span>
      <span
        aria-hidden="true"
        className={cn(
          "text-eyebrow flex size-8 shrink-0 items-center justify-center rounded-[9px] border font-semibold",
          row.isViewer
            ? "border-ink bg-ink text-paper"
            : "border-rule bg-paper text-ink",
        )}
      >
        {row.initials}
      </span>
      <span aria-hidden="true" className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{row.name}</span>
        <span
          className={cn(
            "text-eyebrow block truncate",
            row.detailStrong
              ? "text-ink font-semibold"
              : "text-muted-foreground",
          )}
        >
          {row.detail}
        </span>
      </span>
      <span
        aria-hidden="true"
        className="font-expanded text-lead w-10 shrink-0 text-right font-bold tabular-nums tracking-[-0.03em]"
      >
        {row.rating}
      </span>
      <span
        aria-hidden="true"
        className="font-expanded text-muted-foreground w-10 shrink-0 text-right font-bold tabular-nums tracking-[-0.03em]"
      >
        {row.points}
      </span>
    </li>
  );
}

function SideBlock({ side }: { side: RatingSummarySide }) {
  const [expanded, setExpanded] = useState(false);
  const rows =
    side.previewCount === null || expanded
      ? side.rows
      : side.rows.slice(0, side.previewCount);
  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-title font-semibold">{side.name}</h2>
        <p className="text-meta text-muted-foreground">{side.aside}</p>
      </div>
      <div className="border-rule bg-paper overflow-hidden rounded-[14px] border">
        <ul>
          {rows.map((row) => (
            <PlayerRow key={row.key} row={row} />
          ))}
        </ul>
        {side.moreLabel && !expanded ? (
          <button
            type="button"
            aria-expanded={false}
            onClick={() => setExpanded(true)}
            className="border-rule text-meta flex min-h-11 w-full items-center justify-between border-t px-4 font-semibold"
          >
            {side.moreLabel}
            <ChevronDownIcon aria-hidden="true" className="size-4" />
          </button>
        ) : null}
      </div>
    </section>
  );
}

function Summary({ gameId }: { gameId: string }) {
  const m = useMessages();
  const locale = useLocale();
  const now = useNow();
  const query = api.games.performanceRatingSummary.useQuery({ gameId });

  if (isNotFoundError(query.error)) {
    notFound();
  }
  if (!query.data) {
    return query.error ? (
      <ErrorState
        title={m.rating.performance.summary.loadFailed}
        error={query.error}
        onRetry={() => {
          void query.refetch();
        }}
      />
    ) : (
      <>
        <Skeleton className="h-36 rounded-[16px]" />
        <Skeleton className="h-80 rounded-[16px]" />
      </>
    );
  }

  const view = performanceRatingSummaryView(query.data, locale, now);
  if (view.kind === "pending") {
    return (
      <section className="border-rule rounded-[16px] border px-[22px] py-5">
        <p className="text-lead font-semibold">{view.title}</p>
        <p className="text-meta text-muted-foreground mt-1">
          {view.description}
        </p>
      </section>
    );
  }
  return (
    <>
      <Hero hero={view.hero} />
      {view.sides.map((side) => (
        <SideBlock key={side.slot} side={side} />
      ))}
      {view.outliers ? (
        <section className="border-rule bg-paper flex items-start gap-3 rounded-[14px] border px-4 py-[13px]">
          <span className="border-rule flex size-9 shrink-0 items-center justify-center rounded-[10px] border">
            <ScaleIcon aria-hidden="true" className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{view.outliers.title}</p>
            <p className="text-eyebrow text-muted-foreground">
              {view.outliers.description}
            </p>
          </div>
        </section>
      ) : null}
      <div className="border-rule flex items-center gap-3.5 border-t pt-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{view.footer.title}</p>
          <p className="text-meta text-muted-foreground">
            {view.footer.description}
          </p>
        </div>
        <Button asChild size="lg" variant="outline" className="font-semibold">
          <Link href={groupMembersTabHref(view.groupId)}>
            {view.footer.cta}
          </Link>
        </Button>
      </div>
    </>
  );
}

/**
 * The Organizer's summary once ratings are in: each player's
 * rating and points move, who changed tier, and whether a rater counted for
 * less, without names.
 */
export function RatingSummaryPage({ gameId }: { gameId: string }) {
  return (
    <Frame gameId={gameId}>
      <Summary gameId={gameId} />
    </Frame>
  );
}
