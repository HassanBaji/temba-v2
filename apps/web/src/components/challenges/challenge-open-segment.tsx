"use client";

import { ErrorState } from "~/components/common/error-state";
import { ListPageSkeleton } from "~/components/common/page-skeleton";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  challengeBoardFilterGroups,
  challengeBoardHasFilters,
  challengeCardView,
  type ChallengeBoardFilterKey,
  type ChallengeBoardFilters,
} from "@repo/domain/challenge-card";
import { pageBleed } from "~/lib/page-layout";
import { cn } from "~/lib/utils";
import type { RouterOutputs } from "~/trpc/react";

import { ChallengeCard } from "./challenge-card";
import { ChallengeSegmentEmpty } from "./challenge-segment-empty";

type Board = RouterOutputs["challenges"]["listOpen"];

const ANY = "any";

/** Sport, Level, Area and Day as labelled boxes in one scrolling row. */
function FilterRow({
  filters,
  areas,
  onFilter,
  onClear,
}: {
  filters: ChallengeBoardFilters;
  areas: readonly string[];
  onFilter: (key: ChallengeBoardFilterKey, value: string | null) => void;
  onClear: () => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  const groups = challengeBoardFilterGroups(filters, areas, locale);
  return (
    <div
      role="group"
      aria-label={m.challenge.filters.label}
      className={cn(
        pageBleed,
        "flex gap-1.5 overflow-x-auto [scrollbar-width:none]",
      )}
    >
      {groups.map((group) => (
        <DropdownMenu key={group.key}>
          <DropdownMenuTrigger
            aria-label={m.challenge.filters.chip(group.label, group.summary)}
            className="border-rule hover:bg-muted/40 focus-visible:ring-ring/50 min-w-18 data-[state=open]:border-ink flex h-10 shrink-0 flex-col justify-center gap-px rounded-md border px-3 text-start outline-none focus-visible:ring-[3px]"
          >
            <span className="text-eyebrow text-muted-foreground leading-none">
              {group.label}
            </span>
            <span className="text-meta font-semibold leading-tight">
              {group.summary}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-80">
            <DropdownMenuRadioGroup
              value={filters[group.key] ?? ANY}
              onValueChange={(value) =>
                onFilter(group.key, value === ANY ? null : value)
              }
            >
              {group.options.map((option) => (
                <DropdownMenuRadioItem
                  key={option.value ?? ANY}
                  value={option.value ?? ANY}
                >
                  {option.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ))}
      {challengeBoardHasFilters(filters) ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-10 shrink-0"
          onClick={onClear}
        >
          {m.challenge.filters.clear}
        </Button>
      ) : null}
    </div>
  );
}

/** 1a: the Open feed under its filters, with the footnote on hatched seats. */
export function ChallengeOpenSegment({
  board,
  loading,
  error,
  filters,
  onFilter,
  onClearFilters,
  onRetry,
  onGoToTeams,
}: {
  board: Board | undefined;
  loading: boolean;
  error: { message: string } | null;
  filters: ChallengeBoardFilters;
  onFilter: (key: ChallengeBoardFilterKey, value: string | null) => void;
  onClearFilters: () => void;
  onRetry: () => void;
  onGoToTeams: () => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  if (error) {
    return (
      <ErrorState
        headingLevel={2}
        title={m.challenge.open.errorTitle}
        error={error}
        onRetry={onRetry}
      />
    );
  }
  if (loading || !board) {
    return <ListPageSkeleton />;
  }
  const filtered = challengeBoardHasFilters(filters);
  if (board.challenges.length === 0 && !filtered) {
    return <ChallengeSegmentEmpty segment="open" onGoToTeams={onGoToTeams} />;
  }
  const now = new Date();
  return (
    <div className="space-y-4">
      <FilterRow
        filters={filters}
        areas={board.areas}
        onFilter={onFilter}
        onClear={onClearFilters}
      />
      {board.challenges.length === 0 ? (
        <div className="border-rule p-4.5 space-y-1 rounded-xl border">
          <p className="text-body font-semibold">
            {m.challenge.open.filteredEmptyTitle}
          </p>
          <p className="text-meta text-muted-foreground">
            {m.challenge.open.filteredEmptyCopy}
          </p>
        </div>
      ) : (
        <div>
          <ul className="border-rule divide-rule bg-paper divide-y overflow-hidden rounded-xl border">
            {board.challenges.map((challenge) => (
              <li key={challenge.id}>
                <ChallengeCard
                  card={challengeCardView(
                    {
                      ...challenge,
                      viewer: {
                        ineligibleReason: challenge.viewer.ineligibleReason,
                      },
                    },
                    locale,
                    now,
                  )}
                />
              </li>
            ))}
          </ul>
          <p className="text-eyebrow text-muted-foreground mt-2.5 leading-normal">
            {m.challenge.tab.openFootnote}
          </p>
        </div>
      )}
    </div>
  );
}
