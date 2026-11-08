"use client";

import Link from "next/link";

import { ErrorState } from "~/components/common/error-state";
import { ListPageSkeleton } from "~/components/common/page-skeleton";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  challengeBoardFilterGroups,
  challengeBoardHasFilters,
  challengeCardView,
  type ChallengeBoardFilterKey,
  type ChallengeBoardFilters,
} from "@repo/domain/challenge-card";
import type { RouterOutputs } from "~/trpc/react";

import { ChallengeCard } from "./challenge-card";
import { ChallengeSegmentEmpty } from "./challenge-segment-empty";

type Board = RouterOutputs["challenges"]["listOpen"];

const ANY = "any";

function FilterBar({
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
      className="flex flex-wrap items-center gap-2"
    >
      {groups.map((group) => (
        <Select
          key={group.key}
          value={filters[group.key] ?? ANY}
          onValueChange={(value) =>
            onFilter(group.key, value === ANY ? null : value)
          }
        >
          <SelectTrigger
            size="sm"
            aria-label={group.label}
            className="min-w-32"
          >
            <SelectValue>
              {m.challenge.filters.chip(group.label, group.summary)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {group.options.map((option) => (
              <SelectItem key={option.value ?? ANY} value={option.value ?? ANY}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
      {challengeBoardHasFilters(filters) ? (
        <Button type="button" size="sm" variant="ghost" onClick={onClear}>
          {m.challenge.filters.clear}
        </Button>
      ) : null}
    </div>
  );
}

/** 1a: the Open board, filters, and Post a challenge. */
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
  const post = (
    <Button asChild>
      <Link href="/dashboard/challenges/new">{m.challenge.post.cta}</Link>
    </Button>
  );
  if (error) {
    return (
      <ErrorState
        headingLevel={2}
        title={m.challenge.open.errorTitle}
        message={error.message}
        onRetry={onRetry}
      />
    );
  }
  if (loading || !board) {
    return <ListPageSkeleton />;
  }
  const filtered = challengeBoardHasFilters(filters);
  if (board.challenges.length === 0 && !filtered) {
    return (
      <div className="space-y-4">
        {post}
        <ChallengeSegmentEmpty segment="open" onGoToTeams={onGoToTeams} />
      </div>
    );
  }
  const now = new Date();
  return (
    <div className="space-y-4">
      {post}
      <FilterBar
        filters={filters}
        areas={board.areas}
        onFilter={onFilter}
        onClear={onClearFilters}
      />
      {board.challenges.length === 0 ? (
        <div className="space-y-1">
          <p className="text-body font-semibold">
            {m.challenge.open.filteredEmptyTitle}
          </p>
          <p className="text-meta text-muted-foreground">
            {m.challenge.open.filteredEmptyCopy}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
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
      )}
    </div>
  );
}
