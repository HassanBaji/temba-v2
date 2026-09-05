"use client";

import { Calendar, MapPin } from "lucide-react";
import Link from "next/link";

import { UserAvatar } from "~/components/common/user-avatar";
import { GAME_FORMAT_LABELS } from "~/components/temba/typed-labels";
import { Badge } from "~/components/ui/badge";
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

function winningSlot(scoredSets: MatchHistoryRow["scoredSets"]): 1 | 2 | null {
  let slot1SetWins = 0;
  let slot2SetWins = 0;
  for (const set of scoredSets) {
    if (set.slot1GamesWon === set.slot2GamesWon) {
      continue;
    }
    if (set.slot1GamesWon > set.slot2GamesWon) {
      slot1SetWins += 1;
    } else {
      slot2SetWins += 1;
    }
  }
  if (slot1SetWins === slot2SetWins) {
    return null;
  }
  return slot1SetWins > slot2SetWins ? 1 : 2;
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
    <div
      className="inline-flex items-center gap-1.5"
      aria-label={winner ? `${label}, winners` : label}
    >
      {members.map((member) => (
        <UserAvatar
          className={cn(
            "size-16 border-2",
            winner ? "border-success" : "border-destructive",
          )}
          key={member.id}
          name={member.name}
          image={member.image}
        />
      ))}
    </div>
  );
}

function Matchup({ row }: { row: MatchHistoryRow }) {
  const winner = winningSlot(row.scoredSets);

  return (
    <div className="mt-2 flex w-[90%] flex-row items-center justify-between">
      <div className="flex w-[40%] justify-center">
        <TeamAvatars
          members={row.slot1Members}
          label="Slot 1"
          winner={winner === 1}
        />
      </div>
      <span className="text-meta text-muted-foreground w-[10%] text-center font-medium">
        vs
      </span>
      <div className="flex w-[40%] justify-center">
        <TeamAvatars
          members={row.slot2Members}
          label="Slot 2"
          winner={winner === 2}
        />
      </div>
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
            <div className="flex items-center justify-between">
              <p className="flex min-w-0 items-center gap-1.5 text-2xl font-semibold">
                <span className="truncate">{formatText}</span>
              </p>
              <p className="text-muted-foreground text-sm font-medium">
                {row.outcome === "won" ? (
                  <Badge variant="success">
                    {
                      <p className="text-sm font-semibold text-green-700">
                        {OUTCOME_LABEL[row.outcome]}
                      </p>
                    }
                  </Badge>
                ) : row.outcome === "lost" ? (
                  <Badge variant="destructive">
                    {
                      <p className="text-sm font-semibold text-white">
                        {OUTCOME_LABEL[row.outcome]}
                      </p>
                    }
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    {
                      <p className="text-sm font-semibold">
                        {OUTCOME_LABEL[row.outcome]}
                      </p>
                    }
                  </Badge>
                )}
              </p>
            </div>
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
            {/* <Badge variant="success" size="sm">
              {OUTCOME_LABEL[row.outcome]}
            </Badge> */}
          </div>
          {/* <ChevronRight
            aria-hidden={true}
            className="text-muted-foreground size-5 shrink-0"
          /> */}
        </div>
        <div className="pointer-events-none relative z-10 flex items-center justify-center gap-2">
          <Matchup row={row} />
        </div>
        {row.scoredSets.length > 0 ? (
          <div className="border-border mt-4 flex flex-row items-center justify-between rounded-2xl border p-2">
            {row.scoredSets.map((set, index) => (
              <div
                className="flex w-[30%] flex-col items-center justify-between"
                key={`${set.slot1GamesWon}-${set.slot2GamesWon}-${index}`}
              >
                <div className="flex flex-col items-center justify-between">
                  <p className="text-sm">set {index + 1}</p>
                  <span className="text-2xl font-semibold">
                    {set.slot1GamesWon} - {set.slot2GamesWon}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </Card>
    </li>
  );
}
