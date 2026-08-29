import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";

export type SeatSideView = {
  sideIndex: number;
  gameTeamId: string | null;
  left: { userId: string; name: string } | null;
  right: { userId: string; name: string } | null;
};

function SeatCell({
  label,
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
  label: string;
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
  return (
    <div className="border-border flex min-h-24 flex-col justify-between gap-2 rounded-md border p-3">
      <p className="text-muted-foreground text-xs font-medium uppercase">
        {label}
      </p>
      {occupant ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-foreground font-medium">{occupant.name}</p>
          {isOrganizer ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onKick(occupant.userId)}
              disabled={kickPending}
            >
              Kick
            </Button>
          ) : null}
        </div>
      ) : canMove ? (
        <Button onClick={onMove} disabled={moving} variant="outline">
          {moving ? "Moving…" : "Move here"}
        </Button>
      ) : canJoin ? (
        <Button onClick={onJoin} disabled={joining} variant="outline">
          {joining ? "Joining…" : joinLabel}
        </Button>
      ) : (
        <p className="text-muted-foreground text-sm">Vacant</p>
      )}
    </div>
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
  sideNoun = "Slot",
  readOnly = false,
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
  readOnly?: boolean;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {sides.map((side) => (
        <Card key={side.sideIndex} variant="outlined" className="space-y-3">
          <h3 className="text-title font-medium">
            {sideNoun} {side.sideIndex}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <SeatCell
              label="Left"
              occupant={side.left}
              canJoin={!readOnly && canJoinVacant && !cancelled}
              joinLabel={joinLabel}
              joining={joining}
              canMove={!readOnly && canMove && !cancelled}
              moving={moving}
              isOrganizer={!readOnly && isOrganizer && !cancelled}
              kickPending={kickPending}
              onJoin={() => onJoin(side.sideIndex, "left")}
              onMove={() => onMove(side.sideIndex, "left")}
              onKick={onKick}
            />
            <SeatCell
              label="Right"
              occupant={side.right}
              canJoin={!readOnly && canJoinVacant && !cancelled}
              joinLabel={joinLabel}
              joining={joining}
              canMove={!readOnly && canMove && !cancelled}
              moving={moving}
              isOrganizer={!readOnly && isOrganizer && !cancelled}
              kickPending={kickPending}
              onJoin={() => onJoin(side.sideIndex, "right")}
              onMove={() => onMove(side.sideIndex, "right")}
              onKick={onKick}
            />
          </div>
        </Card>
      ))}
    </div>
  );
}
