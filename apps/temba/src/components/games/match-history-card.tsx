"use client";

import Link from "next/link";

import { UserAvatar } from "~/components/common/user-avatar";
import { GAME_FORMAT_LABELS } from "~/components/temba/typed-labels";
import { Card } from "~/components/ui/card";
import { formatGameClock, formatRelativeDay } from "~/lib/format-game-start";
import { cn } from "~/lib/utils";
import { type RouterOutputs } from "~/trpc/react";

type MatchHistoryRow = RouterOutputs["games"]["listMyMatchHistory"][number];
type MatchHistoryMember = MatchHistoryRow["slot1Members"][number];

const OUTCOME_LABEL: Record<MatchHistoryRow["outcome"], string> = {
  won: "Won",
  lost: "Lost",
  draw: "Draw",
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
  const venueName = row.venue.name.trim();
  return venueName ? venueName : "Untitled Game";
}

/** Venue, plus the format when the venue is already carrying the title. */
function cardSubtitle(row: MatchHistoryRow, title: string) {
  const venueName = row.venue.name.trim();
  const parts = [
    venueName === title ? null : venueName,
    formatLabel(row.format),
  ];
  return parts.filter((part) => part != null && part.length > 0).join(" · ");
}

/** Set scores read as us-vs-them off the slot the viewer actually sat on. */
function viewerSets(row: MatchHistoryRow) {
  return row.scoredSets.map((set) =>
    row.viewerSlot === 1
      ? { us: set.slot1GamesWon, them: set.slot2GamesWon }
      : { us: set.slot2GamesWon, them: set.slot1GamesWon },
  );
}

function setTally(sets: { us: number; them: number }[]) {
  let won = 0;
  let lost = 0;
  for (const set of sets) {
    if (set.us > set.them) {
      won += 1;
    } else if (set.us < set.them) {
      lost += 1;
    }
  }
  return { won, lost };
}

function ResultMark({ outcome }: { outcome: MatchHistoryRow["outcome"] }) {
  const won = outcome === "won";

  return (
    <span
      className={cn(
        "flex h-6 shrink-0 items-center rounded-md border-[1.5px] px-[9px] text-xs font-medium",
        won ? "border-ink bg-ink text-paper" : "border-ink text-ink",
      )}
    >
      {OUTCOME_LABEL[outcome]}
    </span>
  );
}

function Seat({
  member,
  mine,
}: {
  member: MatchHistoryMember | null;
  mine: boolean;
}) {
  if (!member) {
    return (
      <span
        aria-hidden="true"
        className="hatch -ml-[9px] size-9 shrink-0 rounded-full first:ml-0"
      />
    );
  }

  return (
    <UserAvatar
      name={member.name}
      image={member.image}
      className={cn(
        "bg-wash -ml-[9px] size-9 shrink-0 first:ml-0",
        mine ? "border-ink border-[1.5px]" : "border-rule border",
      )}
    />
  );
}

function Team({
  members,
  seats,
  mine,
  label,
}: {
  members: MatchHistoryMember[];
  seats: number;
  mine: boolean;
  label: string;
}) {
  const filled = members.slice(0, seats);
  const openSeats = Math.max(seats - filled.length, 0);

  return (
    <div className="flex" aria-label={label}>
      {filled.map((member) => (
        <Seat key={member.id} member={member} mine={mine} />
      ))}
      {Array.from({ length: openSeats }, (_, index) => (
        <Seat key={`open-${index}`} member={null} mine={mine} />
      ))}
    </div>
  );
}

function SetScore({ set }: { set: { us: number; them: number } }) {
  const won = set.us > set.them;

  return (
    <span className="tabular-nums">
      <span className={won ? "text-ink" : "text-dim"}>{set.us}</span>
      <span className="text-rule">&ndash;</span>
      <span className={won ? "text-dim" : "text-ink"}>{set.them}</span>
    </span>
  );
}

function ScoreBand({ row }: { row: MatchHistoryRow }) {
  const sets = viewerSets(row);

  if (sets.length === 0) {
    return (
      <div className="border-rule flex items-center justify-between border-t bg-[#fafafa] px-[22px] py-3.5">
        <span className="text-muted-foreground text-[13px] font-medium">
          Score pending
        </span>
        <span aria-hidden="true" className="flex items-center gap-4">
          <i className="hatch block h-6 w-[52px] rounded-md" />
          <i className="hatch block h-6 w-[52px] rounded-md" />
        </span>
      </div>
    );
  }

  const tally = setTally(sets);

  return (
    <div className="border-rule flex items-baseline justify-between border-t bg-[#fafafa] px-[22px] py-3.5">
      <span className="text-muted-foreground text-xs tabular-nums">
        Sets {tally.won}&ndash;{tally.lost}
      </span>
      <div className="font-expanded flex items-baseline gap-4 text-[22px]">
        {sets.map((set, index) => (
          <SetScore key={`${set.us}-${set.them}-${index}`} set={set} />
        ))}
      </div>
    </div>
  );
}

export function MatchHistoryCard({ row }: { row: MatchHistoryRow }) {
  const title = cardTitle(row);
  const subtitle = cardSubtitle(row, title);
  const dayLabel = formatRelativeDay(row.displayTime, {
    sameDayLabel: "Today",
  });
  const timeLabel = formatGameClock(row.displayTime);
  const groupName = row.groupName?.trim();
  const href = `/dashboard/games/${row.id}`;

  const myMembers = row.viewerSlot === 1 ? row.slot1Members : row.slot2Members;
  const opponents = row.viewerSlot === 1 ? row.slot2Members : row.slot1Members;
  const seats = Math.max(myMembers.length, opponents.length, 1);

  return (
    <li data-slot="match-history-card">
      <Card
        className={cn(
          "border-rule relative gap-0 overflow-hidden rounded-[14px] p-0",
          "motion-safe:transition-[border-color,box-shadow] motion-safe:duration-150",
          "hover:border-foreground/20 hover:shadow-sm",
        )}
      >
        <Link
          href={href}
          aria-label={`${title}, ${OUTCOME_LABEL[row.outcome]}`}
          className="focus-visible:ring-ring/50 absolute inset-0 z-0 rounded-[14px] outline-none focus-visible:ring-[3px]"
        />

        <div className="pointer-events-none relative z-10 min-w-0 px-[22px] pb-[18px] pt-[22px]">
          <div className="text-muted-foreground mb-2 flex items-baseline justify-between gap-3 text-[13px]">
            <span>
              {dayLabel} · {timeLabel}
            </span>
            {groupName ? (
              <span className="text-dim min-w-0 truncate">{groupName}</span>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-3">
            <h3 className="min-w-0 truncate text-xl font-medium tracking-[-0.015em]">
              {title}
            </h3>
            <ResultMark outcome={row.outcome} />
          </div>

          {subtitle ? (
            <p className="text-muted-foreground mt-[5px] truncate text-[13px]">
              {subtitle}
            </p>
          ) : null}

          <div className="mt-[18px] flex items-center gap-[10px]">
            <Team
              members={myMembers}
              seats={seats}
              mine={true}
              label="Your team"
            />
            <span className="text-dim mx-0.5 text-xs font-semibold">vs</span>
            <Team
              members={opponents}
              seats={seats}
              mine={false}
              label="Opponents"
            />
          </div>
        </div>

        <div className="pointer-events-none relative z-10">
          <ScoreBand row={row} />
        </div>
      </Card>
    </li>
  );
}
