"use client";

import { Calendar, ChevronRight, MapPin, Users } from "lucide-react";
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
  winner,
}: {
  members: MatchHistoryRow["slot1Members"];
  label: string;
  winner: boolean;
}) {
  if (members.length === 0) {
    return (
      <span className="text-muted-foreground text-meta" aria-label={label}>
        —
      </span>
    );
  }

  return (
    <div className="flex flex-row items-center gap-1">
      {members.map((member) => (
        <UserAvatar
          className={`h-12 w-12 rounded-full border ${winner ? "border-green-500" : "border-red-500"}`}
          key={member.id}
          name={member.name}
          image={member.image}
          // size="lg"
        />
      ))}
    </div>
  );
}

function Matchup({ row }: { row: MatchHistoryRow }) {
  return (
    <div className="flex w-full flex-row items-center gap-2">
      <TeamAvatars
        members={row.slot1Members}
        label="Slot 1"
        winner={row.outcome === "won"}
      />
      <span className="text-meta text-muted-foreground font-medium">vs</span>
      <TeamAvatars
        members={row.slot2Members}
        label="Slot 2"
        winner={row.outcome === "won"}
      />
    </div>
  );
}

export function MatchHistoryCard({ row }: { row: MatchHistoryRow }) {
  const title = cardTitle(row);
  const venueName = row.venue.name.trim();
  const groupName = row.groupName?.trim();
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
          className={cn("relative z-10 min-w-0 gap-3", "pointer-events-none")}
        >
          <div className="flex flex-row justify-between">
            <div className="flex flex-row items-center gap-2">
              <Calendar className="size-4" />
              <p className="text-muted-foreground leading-tight lg:text-lg">
                {dayLabel} - {timeLabel}
              </p>
            </div>
            <div>
              {groupName ? (
                <p className="text-meta text-muted-foreground flex min-w-0 items-center">
                  <span className="truncate">{groupName}</span>
                </p>
              ) : null}
            </div>
          </div>
          <div className="mt-2 min-w-0 flex-1">
            <p className="flex min-w-0 items-center gap-1.5 text-2xl font-semibold">
              <span className="truncate">{formatText}</span>
            </p>
            {venueName ? (
              <p className="text-meta text-muted-foreground mt-1 flex min-w-0 items-center gap-1.5">
                <MapPin aria-hidden={true} className="size-3.5 shrink-0" />
                <span className="truncate">{venueName}</span>
              </p>
            ) : null}
          </div>
          {/* <div className="hidden min-w-0 items-center gap-2 sm:flex">
            <Matchup row={row} />
          </div> */}
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            {/* {row.scoredSets.length > 0 ? (
              <div className="text-meta text-foreground flex flex-col items-end font-medium tabular-nums">
                {row.scoredSets.map((set, index) => (
                  <span
                    key={`${set.slot1GamesWon}-${set.slot2GamesWon}-${index}`}
                  >
                    {set.slot1GamesWon} - {set.slot2GamesWon}
                  </span>
                ))}
              </div>
            ) : null} */}
            {/* <Badge variant={OUTCOME_VARIANT[row.outcome]} size="sm">
              {OUTCOME_LABEL[row.outcome]}
            </Badge> */}
          </div>
          {/* <ChevronRight
            aria-hidden={true}
            className="text-muted-foreground size-5 shrink-0"
          /> */}
        </div>
        <div className="pointer-events-none relative z-10 flex items-center justify-center gap-2 sm:hidden">
          <Matchup row={row} />
        </div>
      </Card>
    </li>
  );
}
