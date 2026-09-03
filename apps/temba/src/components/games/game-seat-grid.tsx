"use client";

import { Button } from "~/components/ui/button";
import { ListRow, RowList } from "~/components/common/row-list";
import { UserAvatar } from "~/components/common/user-avatar";
import { formatSeatSideHeading } from "~/components/games/game-side-label";
import { cn } from "~/lib/utils";
import { type RouterOutputs } from "~/trpc/react";

type GameSide = RouterOutputs["games"]["byId"]["sides"][number];
type SeatOccupant = NonNullable<GameSide["left"]>;

function VacantAvatar({ joinable }: { joinable: boolean }) {
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
  occupant: SeatOccupant | null;
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
    <Button onClick={onJoin} disabled={joining} variant="brand" size="sm">
      {joining ? "Joining…" : joinLabel}
    </Button>
  ) : undefined;

  return (
    <ListRow
      leading={
        occupant ? (
          <UserAvatar name={occupant.name} image={occupant.image} size="lg" />
        ) : (
          <VacantAvatar joinable={canJoin || canMove} />
        )
      }
      title={
        occupant ? (
          occupant.name
        ) : canJoin || canMove ? (
          <span className="text-foreground font-medium">Open</span>
        ) : (
          <span className="text-muted-foreground font-medium">Vacant</span>
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
  sides: GameSide[];
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
