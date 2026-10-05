"use client";

import { Fragment } from "react";

import { formatGameSideLabel } from "@repo/domain/game-side-label";
import { ResultTag } from "~/components/temba/result-mark";
import { OpenSeat, SeatRow } from "~/components/temba/seat";
import { Button } from "~/components/ui/button";
import { vacantJoinSeats } from "@repo/domain/friendly-game-cta";
import {
  friendlyGameInviteSeatLabel,
  friendlyGameLineupVacantAction,
  friendlyGameOpenSeatLabel,
  friendlyGameSeatSubline,
  friendlyGameVacantSeatLabel,
} from "@repo/domain/friendly-game-players";
import { cn } from "~/lib/utils";
import { type RouterOutputs } from "~/trpc/react";

type GameDetailsSide = RouterOutputs["games"]["byId"]["sides"][number];
type GameDetailsSeat = NonNullable<GameDetailsSide["left"]>;
type SeatPosition = "left" | "right";

const VS_DIVIDER =
  "text-muted-foreground before:bg-rule after:bg-rule flex shrink-0 items-center gap-3 self-stretch text-xs font-semibold before:h-px before:flex-1 after:h-px after:flex-1 sm:self-center sm:px-1 sm:before:hidden sm:after:hidden";

function LineupSeatRow({
  occupant,
  position,
  vacant,
  isViewer,
  showInvite,
  onInvite,
  sideLabel,
  canMove,
  moving,
  onMove,
}: {
  occupant: GameDetailsSeat | null;
  position: SeatPosition;
  vacant: boolean;
  isViewer: boolean;
  showInvite: boolean;
  onInvite: () => void;
  sideLabel: string;
  canMove: boolean;
  moving: boolean;
  onMove: () => void;
}) {
  if (vacant || !occupant) {
    const vacantAction = friendlyGameLineupVacantAction(canMove);
    const moveLabel = friendlyGameVacantSeatLabel(
      vacantAction,
      sideLabel,
      position === "left" ? "Left" : "Right",
    );
    return (
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {vacantAction === "move" && moveLabel ? (
            <button
              type="button"
              disabled={moving}
              aria-label={moveLabel}
              className="focus-visible:ring-ring/50 flex size-[42px] shrink-0 items-center justify-center rounded-full border-0 bg-transparent p-0 outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
              onClick={onMove}
            >
              <OpenSeat size="lg" />
            </button>
          ) : (
            <>
              <OpenSeat size="lg" />
              <span className="sr-only">
                {friendlyGameOpenSeatLabel(position)}
              </span>
            </>
          )}
        </div>
        {showInvite ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0"
            aria-label={friendlyGameInviteSeatLabel(sideLabel, position)}
            onClick={onInvite}
          >
            Invite
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <SeatRow
      occupant={occupant}
      isViewer={isViewer}
      subline={friendlyGameSeatSubline(position, occupant.levelBand)}
    />
  );
}

function LineupTeamColumn({
  side,
  isWinner,
  showWonTag,
  viewerUserId,
  showInvite,
  onInvite,
  isVacant,
  canMove,
  moving,
  onMove,
}: {
  side: GameDetailsSide;
  isWinner: boolean;
  showWonTag: boolean;
  viewerUserId: string;
  showInvite: boolean;
  onInvite: () => void;
  isVacant: (position: SeatPosition) => boolean;
  canMove: boolean;
  moving: boolean;
  onMove: (position: SeatPosition) => void;
}) {
  const sideLabel = formatGameSideLabel("friendly_game", side.sideIndex);
  return (
    <div className="min-w-0 flex-1 space-y-3">
      <div className="flex items-center gap-1.5">
        <h3 className="text-eyebrow text-muted-foreground font-medium uppercase tracking-[0.06em]">
          {sideLabel}
        </h3>
        {showWonTag && isWinner ? (
          <ResultTag variant="won">Won</ResultTag>
        ) : null}
      </div>
      <div className="space-y-3">
        <LineupSeatRow
          occupant={side.left}
          position="left"
          vacant={isVacant("left")}
          isViewer={side.left?.userId === viewerUserId}
          showInvite={showInvite}
          onInvite={onInvite}
          sideLabel={sideLabel}
          canMove={canMove}
          moving={moving}
          onMove={() => onMove("left")}
        />
        <LineupSeatRow
          occupant={side.right}
          position="right"
          vacant={isVacant("right")}
          isViewer={side.right?.userId === viewerUserId}
          showInvite={showInvite}
          onInvite={onInvite}
          sideLabel={sideLabel}
          canMove={canMove}
          moving={moving}
          onMove={() => onMove("right")}
        />
      </div>
    </div>
  );
}

/**
 * Line-up section (game-details redesign, TEM-180): both teams divided by a
 * "vs" rule, replacing the Players tab content for the individual Friendly
 * game details page across all three phases. Distinct from, and deliberately
 * less summarized than, the hero's own compact seat row (`home-seat-row.tsx`
 * pattern) — the hero states the aggregate ("3 of 4 players in"), this
 * section is where an open slot is actionable (per-row Invite, and a move
 * hatch when the viewer is seated and `canMove` — TEM-193).
 */
export function GameLineupSection({
  sides,
  viewerUserId,
  isFinal,
  winningGameTeamId,
  canMintInvite,
  onInvite,
  canMove,
  moving,
  onMove,
}: {
  sides: GameDetailsSide[];
  viewerUserId: string;
  isFinal: boolean;
  winningGameTeamId: string | null;
  canMintInvite: boolean;
  onInvite: () => void;
  canMove: boolean;
  moving: boolean;
  onMove: (sideIndex: number, position: SeatPosition) => void;
}) {
  // Final phase never shows invite affordances in this section, regardless
  // of the caller's organizer-only `canMintInvite` value (spec: "no invite
  // affordances anywhere in the section" once a Match is Final).
  const showInvite = canMintInvite && !isFinal;
  const vacantSeats = vacantJoinSeats(sides);
  const vacantLookup = (sideIndex: number, position: SeatPosition) =>
    vacantSeats.some(
      (seat) => seat.sideIndex === sideIndex && seat.position === position,
    );

  return (
    <section
      data-slot="game-lineup-section"
      className="border-rule bg-paper overflow-hidden rounded-xl border"
    >
      <h2 className="text-muted-foreground px-[22px] pb-3 pt-[22px] text-sm">
        Line-up
      </h2>
      <div
        className={cn(
          "border-rule flex flex-col gap-4 border-t px-[22px] pb-[22px] pt-[18px] sm:flex-row sm:items-start sm:gap-3",
        )}
      >
        {sides.map((side, index) => (
          <Fragment key={side.sideIndex}>
            {index > 0 ? (
              <span aria-hidden="true" className={VS_DIVIDER}>
                vs
              </span>
            ) : null}
            <LineupTeamColumn
              side={side}
              isWinner={
                side.gameTeamId != null && side.gameTeamId === winningGameTeamId
              }
              showWonTag={isFinal}
              viewerUserId={viewerUserId}
              showInvite={showInvite}
              onInvite={onInvite}
              isVacant={(position) => vacantLookup(side.sideIndex, position)}
              canMove={canMove}
              moving={moving}
              onMove={(position) => onMove(side.sideIndex, position)}
            />
          </Fragment>
        ))}
      </div>
    </section>
  );
}
