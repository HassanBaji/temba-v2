"use client";

import { UserAvatar } from "~/components/common/user-avatar";
import {
  SummaryCardBody,
  SummaryCardShell,
} from "~/components/games/summary-card-shell";
import { ResultMark } from "~/components/temba/result-mark";
import { setLabel, setShortLabel } from "@repo/domain/game-copy";
import {
  matchHistoryCardModel,
  PENDING_SET_COLUMNS,
} from "@repo/domain/match-history-card";
import { RESULT_MARK_LABEL } from "@repo/domain/result-mark";
import { cn } from "~/lib/utils";
import { type RouterOutputs } from "~/trpc/react";

type MatchHistoryRow = RouterOutputs["games"]["listMyMatchHistory"][number];
type MatchHistoryMember = MatchHistoryRow["slot1Members"][number];

function SeatTile({
  member,
  onInk,
}: {
  member: MatchHistoryMember | null;
  onInk: boolean;
}) {
  const shared = "-ml-1.5 size-[26px] shrink-0 rounded-sm first:ml-0";

  if (!member) {
    return <span aria-hidden="true" className={cn("hatch", shared)} />;
  }

  return (
    <UserAvatar
      name={member.name}
      image={member.image}
      className={cn(
        shared,
        "[&_[data-slot=avatar-fallback]]:rounded-sm [&_[data-slot=avatar-fallback]]:text-[10px]",
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
            className="text-muted-foreground w-7 text-center font-mono text-[10px]"
          >
            <abbr title={setLabel(index)} className="no-underline">
              {setShortLabel(index)}
            </abbr>
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
        "mt-1.5 flex items-center gap-2 rounded-lg px-3 py-2.5",
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
            "text-body truncate",
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
                  "font-expanded text-lead w-7 text-center tabular-nums",
                  score.wonSet
                    ? null
                    : filled
                      ? "text-dim"
                      : "text-muted-foreground",
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
  const { scored, tally, setColumns, meta, groupName, teams } =
    matchHistoryCardModel(row);
  const won = row.outcome === "won";

  return (
    <li data-slot="match-history-card">
      <SummaryCardShell
        emphasis={won}
        href={`/dashboard/games/${row.id}`}
        linkLabel={`${RESULT_MARK_LABEL[row.outcome]}, ${meta}`}
      >
        <SummaryCardBody className="flex items-start gap-3 pb-4">
          <ResultMark
            variant={row.outcome}
            decorative
            className="mt-0.5 size-6"
          />

          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <h3
                className={cn(
                  "font-expanded text-[22px]",
                  won ? null : "text-muted-foreground",
                )}
              >
                {RESULT_MARK_LABEL[row.outcome]}
              </h3>
              {scored ? (
                <span className="font-expanded text-muted-foreground text-body tabular-nums">
                  {tally.won}&ndash;{tally.lost} in sets
                </span>
              ) : (
                <span className="text-muted-foreground text-meta">
                  No score yet
                </span>
              )}
            </div>
            <p className="text-muted-foreground text-meta mt-0.5 truncate">
              {meta}
            </p>
          </div>

          {groupName ? (
            <span className="text-muted-foreground mt-1 max-w-[38%] shrink-0 truncate text-right font-mono text-[10px] uppercase">
              {groupName}
            </span>
          ) : null}
        </SummaryCardBody>

        <SummaryCardBody className="pt-0">
          {scored ? <SetHeader columns={setColumns} /> : null}
          {teams.map((team) => (
            <TeamRow key={team.side} {...team} />
          ))}
        </SummaryCardBody>
      </SummaryCardShell>
    </li>
  );
}
