"use client";

import { ActionMenu, ActionMenuItem } from "~/components/common/action-menu";
import { ListRow, RowList } from "~/components/common/row-list";
import { UserAvatar } from "~/components/common/user-avatar";
import { formatGameSideLabel } from "~/components/games/game-side-label";
import { Badge } from "~/components/ui/badge";
import { Card } from "~/components/ui/card";
import {
  friendlyGameCanKickPlayer,
  friendlyGameSideFill,
  friendlyGameVacantSeatAction,
  friendlyGameVacantSeatLabel,
} from "~/lib/friendly-game-players";
import { cn } from "~/lib/utils";
import { type RouterOutputs } from "~/trpc/react";

type GameSide = RouterOutputs["games"]["byId"]["sides"][number];
type SeatOccupant = NonNullable<GameSide["left"]>;

function VacantPlus({ joinable }: { joinable: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-dashed text-sm font-medium",
        joinable
          ? "border-foreground bg-muted text-foreground"
          : "border-border text-muted-foreground/70",
      )}
    >
      +
    </span>
  );
}

function FriendlySeatRow({
  sideLabel,
  positionLabel,
  occupant,
  viewerUserId,
  vacantAction,
  joining,
  moving,
  isOrganizer,
  cancelled,
  kickPending,
  onJoin,
  onMove,
  onKick,
}: {
  sideLabel: string;
  positionLabel: "Left" | "Right";
  occupant: SeatOccupant | null;
  viewerUserId: string;
  vacantAction: ReturnType<typeof friendlyGameVacantSeatAction>;
  joining: boolean;
  moving: boolean;
  isOrganizer: boolean;
  cancelled: boolean;
  kickPending: boolean;
  onJoin: () => void;
  onMove: () => void;
  onKick: (userId: string) => void;
}) {
  if (occupant) {
    const isViewer = occupant.userId === viewerUserId;
    const canKick = friendlyGameCanKickPlayer({
      isOrganizer,
      cancelled,
      isViewer,
    });
    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserAvatar name={occupant.name} image={occupant.image} size="lg" />

          {
            <>
              {occupant.name}
              {isViewer ? (
                <Badge variant="outline" className="ml-2 align-middle">
                  You
                </Badge>
              ) : null}
            </>
          }
        </div>

        {canKick ? (
          <ActionMenu label={`Actions for ${occupant.name}`}>
            <ActionMenuItem
              variant="destructive"
              disabled={kickPending}
              onClick={() => onKick(occupant.userId)}
            >
              Kick
            </ActionMenuItem>
          </ActionMenu>
        ) : undefined}
      </div>
    );
  }

  const vacantLabel = friendlyGameVacantSeatLabel(
    vacantAction,
    sideLabel,
    positionLabel,
  );
  const pending = vacantAction === "move" ? moving : joining;

  return (
    <ListRow
      leading={
        vacantAction && vacantLabel ? (
          <button
            type="button"
            disabled={pending}
            aria-label={vacantLabel}
            className="focus-visible:ring-ring/50 flex size-11 min-h-11 min-w-11 items-center justify-center rounded-full outline-none focus-visible:ring-[3px] disabled:opacity-50"
            onClick={vacantAction === "move" ? onMove : onJoin}
          >
            <VacantPlus joinable />
          </button>
        ) : (
          <VacantPlus joinable={false} />
        )
      }
      title={
        vacantAction ? (
          <span className="text-foreground font-medium">Open</span>
        ) : (
          <span className="text-muted-foreground font-medium">Vacant</span>
        )
      }
      subtitle={positionLabel}
    />
  );
}

export function FriendlyGameSeatBlocks({
  sides,
  viewerUserId,
  cancelled,
  canMove,
  canRegister,
  canPickSeat,
  canWaitlist,
  isOrganizer,
  joining,
  moving,
  kickPending,
  onJoin,
  onMove,
  onKick,
}: {
  sides: GameSide[];
  viewerUserId: string;
  cancelled: boolean;
  canMove: boolean;
  canRegister: boolean;
  canPickSeat: boolean;
  canWaitlist: boolean;
  isOrganizer: boolean;
  joining: boolean;
  moving: boolean;
  kickPending: boolean;
  onJoin: (sideIndex: number, position: "left" | "right") => void;
  onMove: (sideIndex: number, position: "left" | "right") => void;
  onKick: (userId: string) => void;
}) {
  const vacantAction = friendlyGameVacantSeatAction({
    cancelled,
    canMove,
    canRegister,
    canPickSeat,
    canWaitlist,
  });

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {sides.map((side) => {
        const fill = friendlyGameSideFill(side);
        const sideLabel = formatGameSideLabel("friendly_game", side.sideIndex);
        return (
          <div key={side.sideIndex} className="gap-0 overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-2">
              <h3 className="text-sm font-medium">{sideLabel}</h3>
              <p className="text-meta text-muted-foreground tabular-nums">
                {fill.label}
              </p>
            </div>
            <div className="mt-2 flex flex-col gap-2 px-4">
              <FriendlySeatRow
                sideLabel={sideLabel}
                positionLabel="Left"
                occupant={side.left}
                viewerUserId={viewerUserId}
                vacantAction={vacantAction}
                joining={joining}
                moving={moving}
                isOrganizer={isOrganizer}
                cancelled={cancelled}
                kickPending={kickPending}
                onJoin={() => onJoin(side.sideIndex, "left")}
                onMove={() => onMove(side.sideIndex, "left")}
                onKick={onKick}
              />
              <FriendlySeatRow
                sideLabel={sideLabel}
                positionLabel="Right"
                occupant={side.right}
                viewerUserId={viewerUserId}
                vacantAction={vacantAction}
                joining={joining}
                moving={moving}
                isOrganizer={isOrganizer}
                cancelled={cancelled}
                kickPending={kickPending}
                onJoin={() => onJoin(side.sideIndex, "right")}
                onMove={() => onMove(side.sideIndex, "right")}
                onKick={onKick}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
