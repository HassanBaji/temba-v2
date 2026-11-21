"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import {
  ACTION_MENU_PAPER_BOXED_TRIGGER,
  ActionMenu,
  ActionMenuItem,
} from "~/components/common/action-menu";
import { ConfirmDialog } from "~/components/common/confirm-dialog";
import { EntityMonogram } from "~/components/common/entity-monogram";
import { ErrorState } from "~/components/common/error-state";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Hatch } from "~/components/ui/hatch";
import { BackButton } from "~/components/ui/nav-icon-button";
import { Skeleton } from "~/components/ui/skeleton";
import { Surface } from "~/components/ui/surface";
import { YouCard, YouSection } from "~/components/you/you-section";
import { isNotFoundError } from "@repo/domain/is-not-found-error";
import { groupHomeHref, groupSeriesTabHref } from "~/lib/dashboard-paths";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

import { SeriesBadge } from "./series-badge";
import {
  SERIES_PAGE_ROWS,
  seriesPageModel,
  type SeriesEditionRow,
  type SeriesFigure,
  type SeriesPageData,
  type SeriesPageExpanded,
  type SeriesWinnerRow,
} from "./series-page-model";

const rowLink =
  "hover:bg-wash focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px] focus-visible:ring-inset";

function Header({ backHref, menu }: { backHref: string; menu: ReactNode }) {
  const m = useMessages();
  return (
    <header className="mt-6 flex items-center justify-between gap-3 lg:mt-2">
      <BackButton variant="boxed" href={backHref} />
      <p className="text-body font-semibold">{m.series.page.title}</p>
      {menu ?? <span aria-hidden="true" className="size-11 shrink-0" />}
    </header>
  );
}

function Figures({ figures }: { figures: SeriesFigure[] }) {
  return (
    <dl className="border-dimrule grid grid-cols-3 border-t pt-3.5">
      {figures.map((figure, index) => (
        <div
          key={figure.label}
          className={cn(
            "flex min-w-0 flex-col-reverse",
            index > 0 && "border-dimrule border-s ps-4",
          )}
        >
          <dt className="text-eyebrow text-dim">{figure.label}</dt>
          <dd className="font-expanded text-h2 truncate">{figure.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function SeriesCard({
  series,
  figures,
}: {
  series: SeriesPageData;
  figures: SeriesFigure[];
}) {
  return (
    <Surface tone="ink" radius="surface" className="flex flex-col gap-4 p-5">
      <div className="flex items-center gap-4">
        <SeriesBadge
          emblem={series.emblem}
          colour={series.colour}
          size="page"
          surface="focus"
        />
        <div className="min-w-0">
          <h1 className="font-expanded text-h1 break-words">{series.name}</h1>
          <Link
            href={groupHomeHref(series.group.id)}
            className="text-meta text-dim focus-visible:ring-ring/50 rounded-xs mt-1.5 inline-block outline-none hover:underline focus-visible:ring-[3px]"
          >
            {series.group.name}
          </Link>
        </div>
      </div>
      <Figures figures={figures} />
    </Surface>
  );
}

/** A card of rows that folds to four, with "All N" expanding it in place. */
function FoldedList({
  more,
  onExpand,
  children,
}: {
  more: string | null;
  onExpand: () => void;
  children: ReactNode;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  const focusFirstRevealed = useRef(false);

  useEffect(() => {
    if (more === null && focusFirstRevealed.current) {
      focusFirstRevealed.current = false;
      listRef.current
        ?.querySelectorAll<HTMLElement>("a")
        [SERIES_PAGE_ROWS]?.focus();
    }
  }, [more]);

  return (
    <YouCard>
      <ul ref={listRef} className="divide-rule divide-y">
        {children}
      </ul>
      {more ? (
        <button
          type="button"
          onClick={() => {
            focusFirstRevealed.current = true;
            onExpand();
          }}
          className={cn(
            "border-rule text-meta flex w-full items-center justify-between gap-3 border-t px-4 py-3 text-start font-semibold",
            rowLink,
          )}
        >
          {more}
          <ArrowRight
            aria-hidden="true"
            className="size-[15px] shrink-0 rtl:-scale-x-100"
          />
        </button>
      ) : null}
    </YouCard>
  );
}

function WinnerRow({ row }: { row: SeriesWinnerRow }) {
  return (
    <li>
      <Link
        href={row.href}
        className={cn(
          "flex items-center gap-3 px-4 py-[11px]",
          row.isViewer && "bg-wash",
          rowLink,
        )}
      >
        <EntityMonogram
          name={row.name}
          image={row.image}
          size="md"
          tone={row.isViewer ? "control" : "muted"}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-semibold">
            {row.name}
          </span>
          <span className="text-eyebrow text-muted-foreground block truncate">
            {row.line}
          </span>
        </span>
        <span
          aria-hidden="true"
          className="font-expanded text-title shrink-0 font-bold tabular-nums"
        >
          {row.wins}
        </span>
        <span className="sr-only">{row.winsSpoken}</span>
      </Link>
    </li>
  );
}

function EditionRow({ row }: { row: SeriesEditionRow }) {
  const chip = row.hatched ? "bg-paper rounded-xs px-[5px] py-px" : null;
  return (
    <li>
      <Link
        href={row.href}
        className={cn("relative flex items-center gap-3 px-4 py-3", rowLink)}
      >
        {row.hatched ? <Hatch className="absolute inset-0" /> : null}
        <span
          aria-hidden="true"
          className="text-eyebrow text-muted-foreground relative min-w-[22px] shrink-0 font-mono tabular-nums"
        >
          {row.edition}
        </span>
        <span className="sr-only">{row.editionSpoken}</span>
        <span className="relative min-w-0 flex-1 truncate text-[14px] font-semibold">
          {chip ? <span className={chip}>{row.line}</span> : row.line}
        </span>
        <span
          className={cn(
            "text-eyebrow text-muted-foreground relative shrink-0",
            chip,
          )}
        >
          {row.date}
        </span>
      </Link>
    </li>
  );
}

function SeriesPageSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-[26px]">
      <Skeleton className="h-[200px] w-full rounded-xl" />
      <Skeleton className="rounded-card h-[240px] w-full" />
      <Skeleton className="rounded-card h-[200px] w-full" />
    </div>
  );
}

function SeriesPageFrame({
  backHref,
  menu,
  children,
}: {
  backHref: string;
  menu?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full min-w-0 max-w-[560px] flex-col gap-[22px] pb-10">
      <Header backHref={backHref} menu={menu} />
      {children}
    </div>
  );
}

/** The Series page (3b): the badge and Group, Most wins, every Edition. */
export function SeriesPage({ id }: { id: string }) {
  const m = useMessages();
  const locale = useLocale();
  const router = useRouter();
  const utils = api.useUtils();
  const query = api.series.byId.useQuery({ id });
  const endSeries = api.series.end.useMutation();
  const menuRef = useRef<HTMLButtonElement>(null);
  const [expanded, setExpanded] = useState<SeriesPageExpanded>({
    winners: false,
    editions: false,
  });
  const [ending, setEnding] = useState(false);

  if (isNotFoundError(query.error)) {
    notFound();
  }

  if (!query.data) {
    return (
      <SeriesPageFrame backHref="/dashboard/groups">
        {query.error ? (
          <ErrorState
            title={m.series.page.loadError}
            error={query.error}
            onRetry={() => {
              void query.refetch();
            }}
          />
        ) : (
          <SeriesPageSkeleton />
        )}
      </SeriesPageFrame>
    );
  }

  const series = query.data;
  const groupHref = groupHomeHref(series.group.id);
  const model = seriesPageModel(series, expanded, locale);
  const end = model.end;

  async function confirmEnd() {
    const result = await endSeries.mutateAsync({ id });
    if ("deleted" in result) {
      void utils.series.listForGroup.invalidate({ groupId: series.group.id });
      router.replace(groupSeriesTabHref(series.group.id));
      return;
    }
    await Promise.all([
      utils.series.byId.invalidate({ id }),
      utils.series.listForGroup.invalidate({ groupId: series.group.id }),
    ]);
  }

  return (
    <SeriesPageFrame
      backHref={groupHref}
      menu={
        end ? (
          <ActionMenu
            label={m.series.page.actions}
            triggerRef={menuRef}
            triggerClassName={ACTION_MENU_PAPER_BOXED_TRIGGER}
          >
            <ActionMenuItem
              variant="destructive"
              onSelect={() => setEnding(true)}
            >
              {end.confirm}
            </ActionMenuItem>
          </ActionMenu>
        ) : null
      }
    >
      <div className="flex flex-col gap-[26px]">
        <SeriesCard series={series} figures={model.figures} />

        {model.mostWins ? (
          <YouSection title={m.series.page.mostWins} meta={model.mostWins.of}>
            <FoldedList
              more={model.mostWins.more}
              onExpand={() =>
                setExpanded((current) => ({ ...current, winners: true }))
              }
            >
              {model.mostWins.rows.map((row) => (
                <WinnerRow key={row.userId} row={row} />
              ))}
            </FoldedList>
          </YouSection>
        ) : null}

        <YouSection
          title={m.series.page.editions}
          meta={model.editions ? m.series.page.newestFirst : undefined}
        >
          {model.editions ? (
            <FoldedList
              more={model.editions.more}
              onExpand={() =>
                setExpanded((current) => ({ ...current, editions: true }))
              }
            >
              {model.editions.rows.map((row) => (
                <EditionRow key={row.gameId} row={row} />
              ))}
            </FoldedList>
          ) : (
            <YouCard>
              <p className="text-meta text-muted-foreground px-4 py-4">
                {model.empty}
              </p>
            </YouCard>
          )}
        </YouSection>
      </div>

      {end ? (
        <ConfirmDialog
          open={ending}
          onOpenChange={setEnding}
          title={end.title}
          description={end.description}
          confirmLabel={end.confirm}
          pending={endSeries.isPending}
          onConfirm={confirmEnd}
          restoreFocusRef={menuRef}
        />
      ) : null}
    </SeriesPageFrame>
  );
}
