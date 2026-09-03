"use client";

import { ChevronRight, MapPin, Users } from "lucide-react";
import Link from "next/link";

import { UserAvatar } from "~/components/common/user-avatar";
import { GAME_FORMAT_LABELS } from "~/components/temba/typed-labels";
import { AvatarGroup } from "~/components/ui/avatar";
import { Badge, type BadgeVariant } from "~/components/ui/badge";
import { Card } from "~/components/ui/card";
import { formatGameClock, formatRelativeDay } from "~/lib/format-game-start";
import { cn } from "~/lib/utils";
import { type RouterOutputs } from "~/trpc/react";

type MatchHistoryRow = RouterOutputs["games"]["listMyMatchHistory"][number];

const OUTCOME_LABEL: Record<MatchHistoryRow["outcome"], string> = {
  won: "WON",
  lost: "LOST",
  draw: "DRAW",
};

const OUTCOME_VARIANT: Record<MatchHistoryRow["outcome"], BadgeVariant> = {
  won: "success",
  lost: "destructive",
  draw: "secondary",
};

function formatLabel(format: string) {
  return format in GAME_FORMAT_LABELS
    ? GAME_FORMAT_LABELS[format as keyof typeof GAME_FORMAT_LABELS]
    : format.replaceAll("_", " ");
}

function cardTitle(row: MatchHistoryRow) {
  const name = row.name?.trim();
  if (name) {
    return name;
  }
  const venue = row.venue.name.trim();
  if (venue) {
    return venue;
  }
  return "Untitled Game";
}

function TeamAvatars({
  members,
  label,
}: {
  members: MatchHistoryRow["slot1Members"];
  label: string;
}) {
  if (members.length === 0) {
    return (
      <span className="text-muted-foreground text-meta" aria-label={label}>
        —
      </span>
    );
  }

  return (
    <AvatarGroup aria-label={label}>
      {members.map((member) => (
        <UserAvatar
          key={member.id}
          name={member.name}
          image={member.image}
          size="sm"
        />
      ))}
    </AvatarGroup>
  );
}

function Matchup({ row }: { row: MatchHistoryRow }) {
  return (
    <>
      <TeamAvatars members={row.slot1Members} label="Slot 1" />
      <span className="text-meta text-muted-foreground font-medium">vs</span>
      <TeamAvatars members={row.slot2Members} label="Slot 2" />
    </>
  );
}

export function MatchHistoryCard({ row }: { row: MatchHistoryRow }) {
  const title = cardTitle(row);
  const venueName = row.venue.name.trim();
  const dayLabel = formatRelativeDay(row.displayTime, {
    sameDayLabel: "Today",
  });
  const timeLabel = formatGameClock(row.displayTime);
  const href = `/dashboard/games/${row.id}?tab=results`;
  const formatText = formatLabel(row.format);

  return (
    <li data-slot="match-history-card">
      <Card
        className={cn(
          "shadow-xs relative gap-3 md:gap-3",
          "motion-safe:transition-[border-color,box-shadow] motion-safe:duration-150",
          "hover:border-foreground/20 hover:shadow-sm",
        )}
      >
        <Link
          href={href}
          aria-label={`${title}, ${OUTCOME_LABEL[row.outcome]}`}
          className="focus-visible:ring-ring/50 absolute inset-0 z-0 rounded-xl outline-none focus-visible:ring-[3px]"
        />
        <div
          className={cn(
            "relative z-10 flex min-w-0 items-center gap-3",
            "pointer-events-none",
          )}
        >
          <div className="w-[4.75rem] shrink-0">
            <p className="text-meta text-foreground font-semibold leading-tight">
              {dayLabel}
            </p>
            <p className="text-meta text-muted-foreground tabular-nums">
              {timeLabel}
            </p>
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-lead truncate font-semibold tracking-[-0.01em]">
              {title}
            </p>
            {venueName ? (
              <p className="text-meta text-muted-foreground flex min-w-0 items-center gap-1.5">
                <MapPin aria-hidden={true} className="size-3.5 shrink-0" />
                <span className="truncate">{venueName}</span>
              </p>
            ) : null}
            <p className="text-meta text-muted-foreground flex min-w-0 items-center gap-1.5">
              <Users aria-hidden={true} className="size-3.5 shrink-0" />
              <span className="truncate">{formatText}</span>
            </p>
          </div>
          <div className="hidden min-w-0 items-center gap-2 sm:flex">
            <Matchup row={row} />
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            {row.scoredSets.length > 0 ? (
              <div className="text-meta text-foreground flex flex-col items-end font-medium tabular-nums">
                {row.scoredSets.map((set, index) => (
                  <span
                    key={`${set.slot1GamesWon}-${set.slot2GamesWon}-${index}`}
                  >
                    {set.slot1GamesWon} - {set.slot2GamesWon}
                  </span>
                ))}
              </div>
            ) : null}
            <Badge variant={OUTCOME_VARIANT[row.outcome]} size="sm">
              {OUTCOME_LABEL[row.outcome]}
            </Badge>
          </div>
          <ChevronRight
            aria-hidden={true}
            className="text-muted-foreground size-5 shrink-0"
          />
        </div>
        <div className="pointer-events-none relative z-10 flex items-center justify-center gap-2 sm:hidden">
          <Matchup row={row} />
        </div>
      </Card>
    </li>
  );
}
