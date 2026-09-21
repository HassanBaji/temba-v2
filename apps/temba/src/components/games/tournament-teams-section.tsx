"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { ListRow, RowList } from "~/components/common/row-list";
import {
  TAKE_SEAT_LABEL,
  TEAMS_HEADING,
  YOUR_TEAM_TAG,
  tournamentCollapsedTeamsLabel,
  tournamentFieldSummary,
  tournamentOpenPositionSubline,
  tournamentTeamRows,
  tournamentTeamsCountLine,
  type TournamentHomeSide,
  type TournamentTeamRow,
} from "~/lib/tournament-home";
import { cn } from "~/lib/utils";

export function TournamentTeamsSection({
  sides,
  viewerUserId,
  canTakeSeat,
  onTakeSeat,
}: {
  sides: readonly TournamentHomeSide[];
  viewerUserId: string;
  canTakeSeat: boolean;
  onTakeSeat?: (seat: {
    sideIndex: number;
    position: "left" | "right";
  }) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const field = tournamentFieldSummary(sides);
  const view = tournamentTeamRows(sides, viewerUserId);
  const countLine = tournamentTeamsCountLine(field.full, field.halfOpen);
  const collapsible = view.collapsedCount > 0;
  const middle = expanded ? view.collapsed : [];

  return (
    <section>
      <div className="flex items-baseline gap-2.5 pb-2.5">
        <h2 className="font-expanded text-[19px] tracking-[-0.03em]">
          {TEAMS_HEADING}
        </h2>
        {countLine ? (
          <p className="text-muted-foreground text-[13px]">{countLine}</p>
        ) : null}
      </div>
      <RowList
        aria-label={TEAMS_HEADING}
        className="border-rule divide-rule rounded-[14px]"
      >
        {view.head.map((row) => (
          <TeamRow
            key={row.sideIndex}
            row={row}
            canTakeSeat={canTakeSeat}
            onTakeSeat={onTakeSeat}
          />
        ))}
        {collapsible ? (
          <li data-slot="list-row">
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setExpanded((open) => !open)}
              className="focus-visible:ring-ring/50 flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left outline-none focus-visible:ring-[3px]"
            >
              <span aria-hidden="true" className="w-[22px] shrink-0" />
              <span className="text-muted-foreground min-w-0 flex-1 text-sm">
                {tournamentCollapsedTeamsLabel(view.collapsedCount)}
              </span>
              <ChevronDown
                aria-hidden="true"
                className={cn(
                  "text-muted-foreground size-4 shrink-0 transition-transform",
                  expanded && "rotate-180",
                )}
              />
            </button>
          </li>
        ) : null}
        {middle.map((row) => (
          <TeamRow
            key={row.sideIndex}
            row={row}
            canTakeSeat={canTakeSeat}
            onTakeSeat={onTakeSeat}
          />
        ))}
        {view.tail.map((row) => (
          <TeamRow
            key={row.sideIndex}
            row={row}
            canTakeSeat={canTakeSeat}
            onTakeSeat={onTakeSeat}
          />
        ))}
      </RowList>
    </section>
  );
}

function TeamRow({
  row,
  canTakeSeat,
  onTakeSeat,
}: {
  row: TournamentTeamRow;
  canTakeSeat: boolean;
  onTakeSeat?: (seat: {
    sideIndex: number;
    position: "left" | "right";
  }) => void;
}) {
  const openPosition = row.openPosition;
  const takeSeat =
    canTakeSeat && onTakeSeat && openPosition != null && !row.isViewer
      ? () =>
          onTakeSeat({
            sideIndex: row.sideIndex,
            position: openPosition,
          })
      : null;

  return (
    <ListRow
      className={cn("min-h-11", row.isViewer && "bg-muted")}
      leading={
        <span
          aria-hidden="true"
          className="text-eyebrow text-muted-foreground inline-block w-[22px] tabular-nums"
        >
          {row.indexLabel}
        </span>
      }
      title={row.name}
      subtitle={
        takeSeat && openPosition && row.isHalfOpen
          ? tournamentOpenPositionSubline(openPosition)
          : undefined
      }
      trailing={
        takeSeat ? (
          <button
            type="button"
            onClick={takeSeat}
            className="border-ink relative min-h-11 min-w-11 overflow-hidden rounded-[9px] border px-3.5 text-[13px] font-semibold"
          >
            <span aria-hidden="true" className="hatch absolute inset-0" />
            <span className="relative">{TAKE_SEAT_LABEL}</span>
          </button>
        ) : row.isViewer ? (
          <span className="text-muted-foreground text-xs">{YOUR_TEAM_TAG}</span>
        ) : undefined
      }
    />
  );
}
