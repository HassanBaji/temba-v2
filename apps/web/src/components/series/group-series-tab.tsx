"use client";

import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ErrorState } from "~/components/common/error-state";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { YouCard, YouSection } from "~/components/you/you-section";
import { groupNewSeriesHref } from "~/lib/dashboard-paths";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

import {
  groupSeriesTabModel,
  type GroupSeriesRow,
  type GroupSeriesSection,
} from "./group-series-tab-model";
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

function Note({ children }: { children: string }) {
  return (
    <p className="text-eyebrow text-muted-foreground leading-[1.5]">
      {children}
    </p>
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
 * The Group's Series tab (1a). Its panel stays mounted with the others, so
 * the list is read only once the tab has been opened.
 */
export function GroupSeriesTab({
  groupId,
  active,
}: {
  groupId: string;
  active: boolean;
}) {
  const m = useMessages();
  const locale = useLocale();
  const [opened, setOpened] = useState(active);
  if (active && !opened) {
    setOpened(true);
  }
  const query = api.series.listForGroup.useQuery(
    { groupId },
    { enabled: opened },
  );

  if (!query.data) {
    return query.error ? (
      <ErrorState
        title={m.series.tab.loadError}
        error={query.error}
        onRetry={() => {
          void query.refetch();
        }}
      />
    ) : (
      <GroupSeriesSkeleton />
    );
  }

  const model = groupSeriesTabModel(query.data, locale);

  return (
    <div className="flex flex-col gap-[26px]">
      {model.running ? (
        <YouSection
          title={m.series.tab.title}
          meta={model.running.meta}
          note={m.series.tab.note}
        >
          <SeriesCard section={model.running} />
        </YouSection>
      ) : (
        <div className="flex flex-col gap-2">
          <Note>{m.series.tab.note}</Note>
          {model.empty ? <p className="text-body">{model.empty}</p> : null}
        </div>
      )}

      {model.ended ? (
        <YouSection title={m.series.tab.ended} meta={model.ended.meta}>
          <SeriesCard section={model.ended} />
        </YouSection>
      ) : null}

      {model.canCreate ? (
        <Button asChild size="lg" className="w-full font-semibold">
          <Link href={groupNewSeriesHref(groupId)}>
            <PlusIcon aria-hidden="true" className="size-[17px]" />
            {m.series.tab.newSeries}
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
