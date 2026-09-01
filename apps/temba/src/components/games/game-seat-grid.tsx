"use client";

import { Button } from "~/components/ui/button";
import { ListRow, RowList } from "~/components/common/row-list";
import { UserAvatar } from "~/components/common/user-avatar";
import { formatSeatSideHeading } from "~/components/games/game-side-label";

export type SeatSideView = {
  sideIndex: number;
  gameTeamId: string | null;
  left: { userId: string; name: string } | null;
  right: { userId: string; name: string } | null;
};

function VacantAvatar() {
  return (
    <span
      aria-hidden="true"
      className="border-border text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-full border text-sm font-medium"
    >
      +
    </span>
  );
}

function SeatRow({
  positionLabel,
  occupant,
  canJoin,
  joinLabel,
  joining,
  canMove,
  moving,
  isOrganizer,
  kickPending,
  onJoin,
  onMove,
  onKick,
}: {
  positionLabel: string;
  occupant: { userId: string; name: string } | null;
  canJoin: boolean;
  joinLabel: string;
  joining: boolean;
  canMove: boolean;
  moving: boolean;
  isOrganizer: boolean;
  kickPending: boolean;
  onJoin: () => void;
  onMove: () => void;
  onKick: (userId: string) => void;
}) {
  const trailing = occupant ? (
    isOrganizer ? (
      <Button
        variant="outline"
        size="sm"
        onClick={() => onKick(occupant.userId)}
        disabled={kickPending}
      >
        Kick
      </Button>
    ) : undefined
  ) : canMove ? (
    <Button onClick={onMove} disabled={moving} variant="outline" size="sm">
      {moving ? "Moving…" : "Move here"}
    </Button>
  ) : canJoin ? (
    <Button onClick={onJoin} disabled={joining} size="sm">
      {joining ? "Joining…" : joinLabel}
    </Button>
  ) : undefined;

  return (
    <ListRow
      leading={
        occupant ? (
          <UserAvatar name={occupant.name} size="lg" />
        ) : (
          <VacantAvatar />
        )
      }
      title={
        occupant ? (
          occupant.name
        ) : (
          <span className="text-muted-foreground font-medium">
            {canJoin || canMove ? "Available" : "Vacant"}
          </span>
        )
      }
      subtitle={positionLabel}
      trailing={trailing}
    />
  );
}

export function GameSeatGrid({
  sides,
  canJoinVacant,
  joinLabel,
  joining,
  canMove,
  moving,
  isOrganizer,
  cancelled,
  kickPending,
  onJoin,
  onMove,
  onKick,
  sideNoun = "Team",
}: {
  sides: SeatSideView[];
  canJoinVacant: boolean;
  joinLabel: string;
  joining: boolean;
  canMove: boolean;
  moving: boolean;
  isOrganizer: boolean;
  cancelled: boolean;
  kickPending: boolean;
  onJoin: (sideIndex: number, position: "left" | "right") => void;
  onMove: (sideIndex: number, position: "left" | "right") => void;
  onKick: (userId: string) => void;
  sideNoun?: string;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {sides.map((side) => (
        <div key={side.sideIndex} className="space-y-2">
          <h3 className="text-title font-medium">
            {formatSeatSideHeading(sideNoun, side.sideIndex, sides.length)}
          </h3>
          <RowList>
            <SeatRow
              positionLabel="Left"
              occupant={side.left}
              canJoin={canJoinVacant && !cancelled}
              joinLabel={joinLabel}
              joining={joining}
              canMove={canMove && !cancelled}
              moving={moving}
              isOrganizer={isOrganizer && !cancelled}
              kickPending={kickPending}
              onJoin={() => onJoin(side.sideIndex, "left")}
              onMove={() => onMove(side.sideIndex, "left")}
              onKick={onKick}
            />
            <SeatRow
              positionLabel="Right"
              occupant={side.right}
              canJoin={canJoinVacant && !cancelled}
              joinLabel={joinLabel}
              joining={joining}
              canMove={canMove && !cancelled}
              moving={moving}
              isOrganizer={isOrganizer && !cancelled}
              kickPending={kickPending}
              onJoin={() => onJoin(side.sideIndex, "right")}
              onMove={() => onMove(side.sideIndex, "right")}
              onKick={onKick}
            />
          </RowList>
        </div>
      ))}
    </div>
  );
}
