"use client";

import { ArrowRight, ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

import {
  ACTION_MENU_PAPER_BOXED_TRIGGER,
  ActionMenu,
  ActionMenuItem,
} from "~/components/common/action-menu";
import { ConfirmDialog } from "~/components/common/confirm-dialog";
import { ErrorState } from "~/components/common/error-state";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Hatch } from "~/components/ui/hatch";
import { BackButton } from "~/components/ui/nav-icon-button";
import { Skeleton } from "~/components/ui/skeleton";
import { Surface } from "~/components/ui/surface";
import { YouCard, YouSection } from "~/components/you/you-section";
import { initials } from "@repo/domain/initials";
import { isNotFoundError } from "@repo/domain/is-not-found-error";
import type { SeriesColour, SeriesEmblem } from "@repo/domain/series";
import { groupHomeHref, groupSeriesHref } from "~/lib/dashboard-paths";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

import { SeriesBadge } from "./series-badge";
import {
  SERIES_PAGE_ROWS,
  seriesEndConfirmation,
  seriesPageModel,
  type SeriesEditionRow,
  type SeriesFigure,
  type SeriesHolders,
  type SeriesNextCard,
  type SeriesPageData,
  type SeriesPageExpanded,
  type SeriesPerson,
  type SeriesWinnerRow,
  type SeriesYouCard,
} from "./series-page-model";

const rowLink =
  "hover:bg-wash focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px] focus-visible:ring-inset";

type SquareSize = "lg" | "md" | "sm";

const SQUARE_SIZE: Record<SquareSize, string> = {
  lg: "size-9 rounded-[10px] text-eyebrow",
  md: "size-8.5 rounded-[9px] text-eyebrow",
  sm: "size-7 rounded-lg text-[10px]",
};

/** A player's photo, or their initials; solid for the viewer. */
function PersonSquare({
  person,
  size,
  surface = "paper",
  className,
}: {
  person: SeriesPerson;
  size: SquareSize;
  surface?: "paper" | "focus";
  className?: string;
}) {
  const src = person.image && person.image.length > 0 ? person.image : null;
  return (
    <Avatar
      aria-hidden="true"
      className={cn(
        "border font-semibold",
        SQUARE_SIZE[size],
        person.isViewer
          ? "border-ink bg-ink text-paper"
          : surface === "focus"
            ? "border-dimrule bg-raised text-on-focus"
            : "border-rule bg-paper text-ink",
        className,
      )}
    >
      {src ? <AvatarImage alt="" src={src} /> : null}
      <AvatarFallback className="rounded-[inherit] bg-transparent text-current [font-size:inherit]">
        {initials(person.name)}
      </AvatarFallback>
    </Avatar>
  );
}

function Squares({
  people,
  size,
  surface,
}: {
  people: SeriesPerson[];
  size: SquareSize;
  surface?: "paper" | "focus";
}) {
  return (
    <span className="flex shrink-0">
      {people.map((person, index) => (
        <PersonSquare
          key={person.key}
          person={person}
          size={size}
          surface={surface}
          className={index > 0 ? "-ms-[5px]" : undefined}
        />
      ))}
    </span>
  );
}

/** One small Series badge per win, up to three, then the count alone. */
function WinTally({
  emblem,
  colour,
  badges,
  wins,
  winsSpoken,
}: {
  emblem: SeriesEmblem;
  colour: SeriesColour;
  badges: number;
  wins: string;
  winsSpoken: string;
}) {
  return (
    <span className="flex shrink-0 items-center gap-[3px]">
      {Array.from({ length: badges }, (_, index) => (
        <SeriesBadge key={index} emblem={emblem} colour={colour} size="tally" />
      ))}
      <span
        aria-hidden="true"
        className="font-expanded text-title ms-[5px] min-w-3 text-end font-bold tabular-nums"
      >
        {wins}
      </span>
      <span className="sr-only">{winsSpoken}</span>
    </span>
  );
}

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
            "flex min-w-0 flex-col-reverse justify-end",
            index > 0 && "border-dimrule border-s ps-3.5",
          )}
        >
          <dt className="text-eyebrow text-dim mt-1 leading-[1.3]">
            {figure.label}
          </dt>
          <dd className="font-expanded text-h2 truncate leading-none">
            {figure.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Holders({ holders }: { holders: SeriesHolders }) {
  const m = useMessages();
  return (
    <div className="border-dimrule flex items-center gap-3 border-t pt-3.5">
      <Squares people={holders.people} size="lg" surface="focus" />
      <div className="min-w-0 flex-1">
        <p className="text-eyebrow text-dim">{m.series.page.holders}</p>
        <ul className="text-body mt-0.5 font-semibold leading-tight">
          {holders.names.map((name, index) => (
            <li key={`${index}-${name}`} className="break-words">
              {name}
            </li>
          ))}
        </ul>
      </div>
      <p className="text-eyebrow text-dim w-16 shrink-0 text-end leading-[1.4]">
        {holders.since}
      </p>
    </div>
  );
}

function SeriesCard({
  series,
  holders,
  figures,
}: {
  series: SeriesPageData;
  holders: SeriesHolders | null;
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
          <h1 className="font-expanded text-h1 break-words leading-[1.05]">
            {series.name}
          </h1>
          <Link
            href={groupHomeHref(series.group.id)}
            className="text-meta text-dim focus-visible:ring-ring/50 rounded-xs mt-1.5 inline-block outline-none hover:underline focus-visible:ring-[3px]"
          >
            {series.group.name}
          </Link>
        </div>
      </div>
      {holders ? <Holders holders={holders} /> : null}
      <Figures figures={figures} />
    </Surface>
  );
}

function NextEditionCard({ next }: { next: SeriesNextCard }) {
  return (
    <YouCard className="flex items-stretch">
      <div className="border-rule relative flex w-[62px] shrink-0 flex-col items-center justify-center gap-0.5 border-e">
        <Hatch className="absolute inset-0" />
        <span className="text-muted-foreground bg-paper rounded-xs relative px-1 text-[10px]">
          {next.editionWord}
        </span>
        <span className="font-expanded bg-paper relative rounded-md px-1.5 text-[22px] font-bold tabular-nums leading-tight">
          {next.edition}
        </span>
      </div>
      <div className="min-w-0 flex-1 px-3 py-[13px]">
        <p className="text-[14px] font-semibold">{next.title}</p>
        <p className="text-eyebrow text-muted-foreground mt-0.5 leading-[1.45]">
          {next.line}
        </p>
      </div>
      <Link
        href={next.href}
        className="bg-ink text-paper hover:bg-ink/90 focus-visible:ring-ring/50 me-3 inline-flex h-10 shrink-0 items-center self-center whitespace-nowrap rounded-[11px] px-3.5 text-[13px] font-semibold outline-none focus-visible:ring-[3px]"
      >
        {next.action}
      </Link>
    </YouCard>
  );
}

function YouInSeries({
  you,
  emblem,
  colour,
}: {
  you: SeriesYouCard;
  emblem: SeriesEmblem;
  colour: SeriesColour;
}) {
  return (
    <YouCard className="flex items-center gap-3 px-4 py-[13px]">
      <PersonSquare person={you.person} size="lg" />
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold">{you.title}</p>
        <p className="text-eyebrow text-muted-foreground leading-[1.45]">
          {you.line}
        </p>
      </div>
      <WinTally
        emblem={emblem}
        colour={colour}
        badges={you.badges}
        wins={you.wins}
        winsSpoken={you.winsSpoken}
      />
    </YouCard>
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

function WinnerRow({
  row,
  emblem,
  colour,
}: {
  row: SeriesWinnerRow;
  emblem: SeriesEmblem;
  colour: SeriesColour;
}) {
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
        <span
          aria-hidden="true"
          className="text-muted-foreground w-4 shrink-0 font-mono text-[11px] tabular-nums"
        >
          {row.rank}
        </span>
        <span className="sr-only">{row.rankSpoken}</span>
        <PersonSquare person={row.person} size="md" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-semibold leading-tight">
            {row.name}
          </span>
          <span className="text-eyebrow text-muted-foreground block truncate">
            {row.line}
          </span>
        </span>
        <WinTally
          emblem={emblem}
          colour={colour}
          badges={row.badges}
          wins={row.wins}
          winsSpoken={row.winsSpoken}
        />
      </Link>
    </li>
  );
}

function EditionRow({ row }: { row: SeriesEditionRow }) {
  return (
    <li>
      <Link
        href={row.href}
        className={cn("flex items-center gap-3 py-3 pe-3.5 ps-4", rowLink)}
      >
        <span
          aria-hidden="true"
          className="font-expanded w-[26px] shrink-0 text-[18px] font-bold tabular-nums"
        >
          {row.edition}
        </span>
        <span className="sr-only">{row.editionSpoken}</span>
        {row.people.length > 0 ? (
          <Squares people={row.people} size="sm" />
        ) : null}
        <span className="min-w-0 flex-1">
          {row.names.map((name, index) => (
            <span
              key={`${index}-${name}`}
              className="block truncate text-[14px] font-semibold leading-tight"
            >
              {name}
            </span>
          ))}
          {row.meta ? (
            <span className="text-eyebrow text-muted-foreground mt-0.5 block truncate">
              {row.meta}
            </span>
          ) : null}
        </span>
        <ChevronRight
          aria-hidden="true"
          className="text-muted-foreground size-4 shrink-0 rtl:-scale-x-100"
        />
      </Link>
    </li>
  );
}

function SeriesPageSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-[22px]">
      <Skeleton className="h-[280px] w-full rounded-xl" />
      <Skeleton className="rounded-card h-[140px] w-full" />
      <Skeleton className="rounded-card h-[240px] w-full" />
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

/**
 * The Series page (design 05) for the data of `series.byId`: the holders,
 * the next Edition, the viewer's line, Winners and the decided Editions.
 */
export function SeriesPageView({
  series,
  now,
  menuRef,
  onEnd,
}: {
  series: SeriesPageData;
  now?: Date;
  menuRef?: RefObject<HTMLButtonElement | null>;
  onEnd?: () => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  const [expanded, setExpanded] = useState<SeriesPageExpanded>({
    winners: false,
    editions: false,
  });
  const model = seriesPageModel(series, expanded, locale, now);
  const end = model.end;

  return (
    <SeriesPageFrame
      backHref={groupHomeHref(series.group.id)}
      menu={
        end && onEnd ? (
          <ActionMenu
            label={m.series.page.actions}
            triggerRef={menuRef}
            triggerClassName={ACTION_MENU_PAPER_BOXED_TRIGGER}
          >
            <ActionMenuItem variant="destructive" onSelect={onEnd}>
              {end.confirm}
            </ActionMenuItem>
          </ActionMenu>
        ) : null
      }
    >
      <div className="flex flex-col gap-[22px]">
        <SeriesCard
          series={series}
          holders={model.holders}
          figures={model.figures}
        />

        <div className="flex flex-col gap-2">
          {model.next ? <NextEditionCard next={model.next} /> : null}
          <YouInSeries
            you={model.you}
            emblem={series.emblem}
            colour={series.colour}
          />
        </div>

        {model.winners ? (
          <YouSection title={m.series.page.winners} meta={model.winners.meta}>
            <FoldedList
              more={model.winners.more}
              onExpand={() =>
                setExpanded((current) => ({ ...current, winners: true }))
              }
            >
              {model.winners.rows.map((row) => (
                <WinnerRow
                  key={row.userId}
                  row={row}
                  emblem={series.emblem}
                  colour={series.colour}
                />
              ))}
            </FoldedList>
          </YouSection>
        ) : null}

        {model.editions ? (
          <YouSection title={m.series.page.editions} meta={model.editions.meta}>
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
          </YouSection>
        ) : null}

        {model.empty ? (
          <YouSection title={m.series.page.editions}>
            <YouCard>
              <p className="text-meta text-muted-foreground px-4 py-4">
                {model.empty}
              </p>
            </YouCard>
          </YouSection>
        ) : null}
      </div>
    </SeriesPageFrame>
  );
}

/** The Series page: loads `series.byId` and ends the Series from its menu. */
export function SeriesPage({ id }: { id: string }) {
  const m = useMessages();
  const locale = useLocale();
  const router = useRouter();
  const utils = api.useUtils();
  const query = api.series.byId.useQuery({ id });
  const endSeries = api.series.end.useMutation();
  const menuRef = useRef<HTMLButtonElement>(null);
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
  const end = seriesEndConfirmation(series, locale);

  async function confirmEnd() {
    const result = await endSeries.mutateAsync({ id });
    if ("deleted" in result) {
      void utils.series.listForGroup.invalidate({ groupId: series.group.id });
      void utils.groups.byId.invalidate({ id: series.group.id });
      router.replace(groupSeriesHref(series.group.id));
      return;
    }
    await Promise.all([
      utils.series.byId.invalidate({ id }),
      utils.series.listForGroup.invalidate({ groupId: series.group.id }),
      utils.groups.byId.invalidate({ id: series.group.id }),
    ]);
  }

  return (
    <>
      <SeriesPageView
        series={series}
        menuRef={menuRef}
        onEnd={() => setEnding(true)}
      />
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
    </>
  );
}
