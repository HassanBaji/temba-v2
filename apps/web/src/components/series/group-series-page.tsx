"use client";

import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { ErrorState } from "~/components/common/error-state";
import { PageTitle } from "~/components/layout/page-title";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { BackButton } from "~/components/ui/nav-icon-button";
import { Skeleton } from "~/components/ui/skeleton";
import { YouCard, YouSection } from "~/components/you/you-section";
import { isNotFoundError } from "@repo/domain/is-not-found-error";
import { groupHomeHref, groupNewSeriesHref } from "~/lib/dashboard-paths";
import { pageGutterX } from "~/lib/page-layout";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

import {
  groupSeriesPageModel,
  type GroupSeriesRow,
  type GroupSeriesSection,
} from "./group-series-page-model";
import { SeriesBadge } from "./series-badge";

function SeriesRow({ row }: { row: GroupSeriesRow }) {
  return (
    <li>
      <Link
        href={row.href}
        className="hover:bg-wash focus-visible:ring-ring/50 flex items-center gap-[13px] px-4 py-[13px] outline-none focus-visible:ring-[3px] focus-visible:ring-inset"
      >
        <SeriesBadge emblem={row.emblem} colour={row.colour} size="list" />
        <span className="min-w-0 flex-1">
          <span className="text-body block break-words font-semibold">
            {row.name}
          </span>
          <span className="text-eyebrow text-muted-foreground block leading-[1.4]">
            {row.line}
          </span>
        </span>
        {row.trailing ? (
          <span
            className={cn(
              "text-eyebrow text-muted-foreground shrink-0 text-end leading-[1.4]",
              row.trailing.kind === "ended" && "w-min",
            )}
          >
            {row.trailing.kind === "next" ? (
              <>
                <span className="block whitespace-nowrap">
                  {row.trailing.label}
                </span>
                <span className="block whitespace-nowrap tabular-nums">
                  {row.trailing.date}
                </span>
              </>
            ) : (
              row.trailing.label
            )}
          </span>
        ) : null}
      </Link>
    </li>
  );
}

function SeriesCard({ section }: { section: GroupSeriesSection }) {
  return (
    <YouCard>
      <ul className="divide-rule divide-y">
        {section.rows.map((row) => (
          <SeriesRow key={row.id} row={row} />
        ))}
      </ul>
    </YouCard>
  );
}

function GroupSeriesFrame({
  groupId,
  footer = false,
  children,
}: {
  groupId: string;
  /** Room under the content for the New series bar pinned below it. */
  footer?: boolean;
  children: ReactNode;
}) {
  const m = useMessages();
  return (
    <div
      className={cn(
        "mx-auto flex w-full min-w-0 max-w-[560px] flex-col gap-6",
        footer && "pb-28 lg:pb-0",
      )}
    >
      <header className="mt-6 flex items-center justify-between gap-3 lg:mt-2">
        <BackButton
          variant="boxed"
          href={groupHomeHref(groupId)}
          label={m.webDashboard.backToGroup}
        />
        <p className="text-body font-semibold">{m.series.tab.title}</p>
        <span aria-hidden="true" className="size-11 shrink-0" />
      </header>
      {children}
    </div>
  );
}

function GroupSeriesSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-3">
      <Skeleton className="h-6 w-24" />
      <Skeleton className="rounded-card h-[150px] w-full" />
    </div>
  );
}

/**
 * The Group's Series (1a), opened from the Group's More menu: running and
 * ended Series, and New series pinned at the bottom for a Group approver.
 */
export function GroupSeriesPage({ groupId }: { groupId: string }) {
  const m = useMessages();
  const locale = useLocale();
  const query = api.series.listForGroup.useQuery({ groupId });

  if (isNotFoundError(query.error)) {
    notFound();
  }

  if (!query.data) {
    return (
      <GroupSeriesFrame groupId={groupId}>
        {query.error ? (
          <ErrorState
            title={m.series.tab.loadError}
            error={query.error}
            onRetry={() => {
              void query.refetch();
            }}
          />
        ) : (
          <GroupSeriesSkeleton />
        )}
      </GroupSeriesFrame>
    );
  }

  const model = groupSeriesPageModel(query.data, locale);
  const hasCards = model.running !== null || model.ended !== null;

  return (
    <GroupSeriesFrame groupId={groupId} footer={model.canCreate}>
      <div className="flex flex-col gap-2">
        <PageTitle className="text-ink">{model.groupName}</PageTitle>
        <p className="text-body text-muted-foreground">{m.series.tab.note}</p>
      </div>

      {model.empty ? <p className="text-body">{model.empty}</p> : null}

      {model.running ? (
        <YouSection title={m.series.tab.runningTitle} meta={model.running.meta}>
          <SeriesCard section={model.running} />
        </YouSection>
      ) : null}

      {model.ended ? (
        <YouSection title={m.series.tab.ended} meta={model.ended.meta}>
          <SeriesCard section={model.ended} />
        </YouSection>
      ) : null}

      {model.canCreate && hasCards ? (
        <p className="text-eyebrow text-muted-foreground -mt-3 leading-[1.5]">
          {m.series.tab.endHint}
        </p>
      ) : null}

      {model.canCreate ? (
        <div
          className={cn(
            "bg-paper border-rule fixed inset-x-0 bottom-0 z-40 border-t pb-[max(0.875rem,env(safe-area-inset-bottom))] pt-3.5 lg:static lg:inset-auto lg:z-auto lg:border-0 lg:px-0 lg:pb-0 lg:pt-0",
            pageGutterX,
          )}
        >
          <Button asChild size="lg" className="w-full font-semibold">
            <Link href={groupNewSeriesHref(groupId)}>
              <PlusIcon aria-hidden="true" className="size-[17px]" />
              {m.series.tab.newSeries}
            </Link>
          </Button>
        </div>
      ) : null}
    </GroupSeriesFrame>
  );
}
