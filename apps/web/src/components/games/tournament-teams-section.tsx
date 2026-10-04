"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { RowList } from "~/components/common/row-list";
import { formatGameSideLabel } from "@repo/domain/game-side-label";
import { SeatTile } from "~/components/temba/seat";
import { displayLabelFromStoredBand } from "@repo/domain/level-bands";
import {
  TEAMS_HEADING,
  YOUR_TEAM_TAG,
  tournamentCollapsedTeamsLabel,
  tournamentFieldSummary,
  tournamentTeamRows,
  tournamentTeamsCountLine,
  type TournamentHomeOccupant,
  type TournamentHomeSide,
  type TournamentTeamRow,
} from "@repo/domain/tournament-home";
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
        <h2 className="font-expanded text-title tracking-[-0.03em]">
          {TEAMS_HEADING}
        </h2>
        {countLine ? (
          <p className="text-muted-foreground text-meta">{countLine}</p>
        ) : null}
      </div>
      <RowList
        aria-label={TEAMS_HEADING}
        className="border-rule divide-rule rounded-card"
      >
        {view.head.map((row) => (
          <TeamRow
            key={row.sideIndex}
            row={row}
            side={sideByIndex(sides, row.sideIndex)}
            viewerUserId={viewerUserId}
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
              <span className="text-muted-foreground text-meta min-w-0 flex-1">
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
            side={sideByIndex(sides, row.sideIndex)}
            viewerUserId={viewerUserId}
            canTakeSeat={canTakeSeat}
            onTakeSeat={onTakeSeat}
          />
        ))}
        {view.tail.map((row) => (
          <TeamRow
            key={row.sideIndex}
            row={row}
            side={sideByIndex(sides, row.sideIndex)}
            viewerUserId={viewerUserId}
            canTakeSeat={canTakeSeat}
            onTakeSeat={onTakeSeat}
          />
        ))}
      </RowList>
    </section>
  );
}

function sideByIndex(sides: readonly TournamentHomeSide[], sideIndex: number) {
  return sides.find((side) => side.sideIndex === sideIndex) ?? null;
}

function TeamSeat({
  occupant,
  position,
  teamLabel,
  viewerUserId,
  joinable,
  onJoin,
}: {
  occupant: TournamentHomeOccupant | null;
  position: "left" | "right";
  teamLabel: string;
  viewerUserId: string;
  joinable: boolean;
  onJoin?: () => void;
}) {
  const positionName = position === "left" ? "Left" : "Right";

  if (!occupant) {
    const canJoin = joinable && onJoin != null;
    return (
      <SeatTile
        occupant={null}
        caption={positionName}
        label={
          canJoin
            ? `Take the ${positionName.toLowerCase()} seat on ${teamLabel}`
            : `Open ${positionName.toLowerCase()} seat on ${teamLabel}`
        }
        onSelect={canJoin ? onJoin : undefined}
      />
    );
  }

  return (
    <SeatTile
      occupant={{ name: occupant.name, image: occupant.image ?? null }}
      name={occupant.userId === viewerUserId ? "You" : occupant.name}
      level={
        occupant.levelBand
          ? displayLabelFromStoredBand(occupant.levelBand)
          : null
      }
      caption={positionName}
    />
  );
}

function TeamRow({
  row,
  side,
  viewerUserId,
  canTakeSeat,
  onTakeSeat,
}: {
  row: TournamentTeamRow;
  side: TournamentHomeSide | null;
  viewerUserId: string;
  canTakeSeat: boolean;
  onTakeSeat?: (seat: {
    sideIndex: number;
    position: "left" | "right";
  }) => void;
}) {
  const teamLabel = formatGameSideLabel("friendly_tournament", row.sideIndex);

  function join(position: "left" | "right") {
    if (!canTakeSeat || !onTakeSeat || row.isViewer) {
      return;
    }
    onTakeSeat({ sideIndex: row.sideIndex, position });
  }

  return (
    <li
      data-slot="list-row"
      className={cn("px-4 py-4", row.isViewer && "bg-muted")}
    >
      <div className="mb-3 flex items-center gap-2">
        <span
          aria-hidden="true"
          className="text-eyebrow text-muted-foreground inline-block w-[22px] tabular-nums"
        >
          {row.indexLabel}
        </span>
        <span className="text-body min-w-0 flex-1 truncate font-medium">
          {teamLabel}
        </span>
        {row.isViewer ? (
          <span className="text-muted-foreground text-eyebrow">
            {YOUR_TEAM_TAG}
          </span>
        ) : null}
      </div>
      <div className="flex gap-2">
        <TeamSeat
          occupant={side?.left ?? null}
          position="left"
          teamLabel={teamLabel}
          viewerUserId={viewerUserId}
          joinable={canTakeSeat && !row.isViewer && side?.left == null}
          onJoin={
            side?.left == null
              ? () => {
                  join("left");
                }
              : undefined
          }
        />
        <TeamSeat
          occupant={side?.right ?? null}
          position="right"
          teamLabel={teamLabel}
          viewerUserId={viewerUserId}
          joinable={canTakeSeat && !row.isViewer && side?.right == null}
          onJoin={
            side?.right == null
              ? () => {
                  join("right");
                }
              : undefined
          }
        />
      </div>
    </li>
  );
}
