"use client";

import { UserAvatar } from "~/components/common/user-avatar";
import { Card } from "~/components/ui/card";
import { formatRelativeDay } from "~/lib/format-game-start";
import { cn } from "~/lib/utils";
import { type RouterOutputs } from "~/trpc/react";

type MatchHistoryRow = RouterOutputs["games"]["listMyMatchHistory"][number];
type MatchHistoryMember = MatchHistoryRow["slot1Members"][number];

const OUTCOME_LABEL: Record<MatchHistoryRow["outcome"], string> = {
  won: "Won",
  lost: "Lost",
  draw: "Draw",
};

/** Score columns drawn when a Match carries no scored sets. */
const PENDING_SET_COLUMNS = 3;

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

/** "Sofia Lindqvist" -> "Sofia L", so a two-name team row stays on one line. */
function shortName(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0);
  const first = parts[0];
  if (!first) {
    return name;
  }
  if (parts.length === 1) {
    return first;
  }
  const surnameInitial = Array.from(parts[parts.length - 1]!)[0];
  return surnameInitial ? `${first} ${surnameInitial.toUpperCase()}` : first;
}

/** The viewer reads as "You", and leads their own team's seats and label. */
function viewerFirst(members: MatchHistoryMember[]) {
  const index = members.findIndex((member) => member.isViewer);
  if (index <= 0) {
    return members;
  }
  return [members[index]!, ...members.filter((_, at) => at !== index)];
}

function teamLabel(members: MatchHistoryMember[]) {
  const names = members.map((member) =>
    member.isViewer ? "You" : shortName(member.name),
  );
  if (names.length === 0) {
    return "Open seats";
  }
  if (names.length === 1) {
    return names[0]!;
  }
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]!}`;
}

/**
 * Temba result mark: a filled disc with a cut-out arc for a win, an outlined
 * disc otherwise. Mirrors `#tembaWon` / `#tembaLost` in the design canvas.
 */
function ResultMark({ won }: { won: boolean }) {
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      className="text-ink mt-0.5 block size-6 shrink-0"
    >
      {won ? (
        <>
          <circle cx="50" cy="50" r="44" fill="currentColor" />
          <path
            d="M6,50 C18,16 82,16 94,50"
            fill="none"
            stroke="var(--color-paper)"
            strokeWidth="5"
          />
        </>
      ) : (
        <>
          <circle
            cx="50"
            cy="50"
            r="43"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            d="M6,50 C18,16 82,16 94,50"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          />
        </>
      )}
    </svg>
  );
}

function SeatTile({
  member,
  onInk,
}: {
  member: MatchHistoryMember | null;
  onInk: boolean;
}) {
  const shared = "-ml-1.5 size-[26px] shrink-0 rounded-[7px] first:ml-0";

  if (!member) {
    return <span aria-hidden="true" className={cn("hatch", shared)} />;
  }

  return (
    <UserAvatar
      name={member.name}
      image={member.image}
      className={cn(
        shared,
        "[&_[data-slot=avatar-fallback]]:rounded-[7px] [&_[data-slot=avatar-fallback]]:text-[10px]",
        onInk
          ? "[&_[data-slot=avatar-fallback]]:bg-dimrule [&_[data-slot=avatar-fallback]]:text-paper"
          : member.isViewer
            ? "[&_[data-slot=avatar-fallback]]:bg-ink [&_[data-slot=avatar-fallback]]:text-paper"
            : "border-rule bg-paper [&_[data-slot=avatar-fallback]]:bg-paper border",
      )}
    />
  );
}

function SetHeader({ columns }: { columns: number }) {
  return (
    <div className="flex items-center gap-2 pr-3">
      <span className="min-w-0 flex-1" />
      <span className="flex shrink-0 gap-1.5">
        {Array.from({ length: columns }, (_, index) => (
          <span
            key={index}
            className="text-dim w-7 text-center font-mono text-[10px]"
          >
            S{index + 1}
          </span>
        ))}
      </span>
    </div>
  );
}

function TeamRow({
  members,
  seats,
  label,
  note,
  scores,
  filled,
  outlined,
}: {
  members: MatchHistoryMember[];
  seats: number;
  label: string;
  note: string;
  /** One entry per scored set, or `null` while the Match has no score. */
  scores: { games: number; wonSet: boolean }[] | null;
  /** Winners carry the ink fill; the viewer's losing side carries the outline. */
  filled: boolean;
  outlined: boolean;
}) {
  const openSeats = Math.max(seats - members.length, 0);

  return (
    <div
      className={cn(
        "mt-1.5 flex items-center gap-2 rounded-[11px] px-3 py-2.5",
        filled
          ? "bg-ink text-paper"
          : cn("border", outlined ? "border-ink" : "border-rule"),
      )}
    >
      <span className="flex shrink-0">
        {members.map((member) => (
          <SeatTile key={member.id} member={member} onInk={filled} />
        ))}
        {Array.from({ length: openSeats }, (_, index) => (
          <SeatTile key={`open-${index}`} member={null} onInk={filled} />
        ))}
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-px">
        <span
          className={cn(
            "truncate text-sm",
            filled || outlined ? "font-semibold" : null,
          )}
        >
          {label}
        </span>
        <span
          className={cn(
            "font-mono text-[10px] uppercase",
            filled ? "text-dim" : "text-muted-foreground",
          )}
        >
          {note}
        </span>
      </span>

      <span className="flex shrink-0 gap-1.5">
        {scores
          ? scores.map((score, index) => (
              <span
                key={index}
                className={cn(
                  "font-expanded w-7 text-center text-[17px] tabular-nums",
                  score.wonSet ? null : "text-dim",
                )}
              >
                {score.games}
              </span>
            ))
          : Array.from({ length: PENDING_SET_COLUMNS }, (_, index) => (
              <span
                key={index}
                aria-hidden="true"
                className="hatch h-[26px] w-7 rounded-md"
              />
            ))}
      </span>
    </div>
  );
}

export function MatchHistoryCard({ row }: { row: MatchHistoryRow }) {
  const sets = viewerSets(row);
  const scored = sets.length > 0;
  const tally = setTally(sets);
  const won = row.outcome === "won";
  const lost = row.outcome === "lost";

  const myMembers = viewerFirst(
    row.viewerSlot === 1 ? row.slot1Members : row.slot2Members,
  );
  const opponents = row.viewerSlot === 1 ? row.slot2Members : row.slot1Members;
  const seats = Math.max(myMembers.length, opponents.length, 1);

  const dayLabel = formatRelativeDay(row.displayTime, {
    sameDayLabel: "Today",
  });
  const venueName = row.venue.name.trim();
  const gameName = row.name?.trim();
  const meta =
    gameName && gameName !== venueName
      ? `${dayLabel}, ${venueName} · ${gameName}`
      : `${dayLabel}, ${venueName}`;
  const groupName = row.groupName?.trim();

  const mine = (
    <TeamRow
      key="mine"
      members={myMembers}
      seats={seats}
      label={teamLabel(myMembers)}
      note={won ? "Your team, winners" : lost ? "Your team, lost" : "Your team"}
      scores={
        scored
          ? sets.map((set) => ({ games: set.us, wonSet: set.us > set.them }))
          : null
      }
      filled={won}
      outlined={!won}
    />
  );

  const theirs = (
    <TeamRow
      key="theirs"
      members={opponents}
      seats={seats}
      label={teamLabel(opponents)}
      note={won ? "Lost" : lost ? "Winners" : "Other team"}
      scores={
        scored
          ? sets.map((set) => ({ games: set.them, wonSet: set.them > set.us }))
          : null
      }
      filled={lost}
      outlined={false}
    />
  );

  return (
    <li data-slot="match-history-card">
      <Card
        className={cn(
          "relative gap-0 overflow-hidden rounded-[14px] p-0",
          won ? "border-ink" : "border-rule",
          "motion-safe:transition-[border-color,box-shadow] motion-safe:duration-150",
          "hover:shadow-sm",
        )}
      >
        <div className="flex items-start gap-3 px-5 py-4">
          <ResultMark won={won} />

          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span
                className={cn(
                  "font-expanded text-[22px]",
                  won ? null : "text-muted-foreground",
                )}
              >
                {OUTCOME_LABEL[row.outcome]}
              </span>
              {scored ? (
                <span
                  className={cn(
                    "font-expanded text-[15px] tabular-nums",
                    won ? "text-muted-foreground" : "text-dim",
                  )}
                >
                  {tally.won}&ndash;{tally.lost} in sets
                </span>
              ) : (
                <span className="text-dim text-[13px]">No score yet</span>
              )}
            </div>
            <p className="text-muted-foreground mt-0.5 truncate text-[13px]">
              {meta}
            </p>
          </div>

          {groupName ? (
            <span className="text-muted-foreground mt-1 max-w-[38%] shrink-0 truncate text-right font-mono text-[10px] uppercase">
              {groupName}
            </span>
          ) : null}
        </div>

        <div className="px-5 pb-[18px]">
          {scored ? <SetHeader columns={sets.length} /> : null}
          {lost ? [theirs, mine] : [mine, theirs]}
        </div>
      </Card>
    </li>
  );
}
