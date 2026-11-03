"use client";

import { Button } from "~/components/ui/button";
import { ListRow, RowList } from "~/components/common/row-list";
import { UserAvatar } from "~/components/common/user-avatar";
import { formatSeatSideHeading } from "@repo/domain/game-side-label";
import { OpenSeat } from "~/components/temba/seat";
import {
  displayLabelFromStoredBand,
  type LevelBand,
} from "@repo/domain/level-bands";
import { useLocale, useMessages } from "~/components/locale-provider";

// Self-contained rather than derived from `RouterOutputs["games"]["byId"]`:
// this grid also renders invite-preview sides (`@repo/api/games/utils`'s
// plain `GameSide`), which don't carry `byId`'s additive per-seat fields
// (e.g. `levelBand`, TEM-177) that this component doesn't read anyway.
type SeatOccupant = {
  userId: string;
  name: string;
  image: string | null;
  levelBand?: LevelBand | null;
};
type GameSide = {
  sideIndex: number;
  gameTeamId: string | null;
  left: SeatOccupant | null;
  right: SeatOccupant | null;
};

function SeatRow({
  position,
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
  position: "left" | "right";
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
  const m = useMessages();
  const positionLabel = m.game.players[position];
  const trailing = occupant ? (
    isOrganizer ? (
      <Button
        variant="outline"
        size="sm"
        onClick={() => onKick(occupant.userId)}
        disabled={kickPending}
      >
        {m.game.action.kick}
      </Button>
    ) : undefined
  ) : canMove ? (
    <Button onClick={onMove} disabled={moving} variant="outline" size="sm">
      {moving ? m.webGame.seatGrid.moving : m.webGame.seatGrid.moveHere}
    </Button>
  ) : canJoin ? (
    <Button onClick={onJoin} disabled={joining} size="sm">
      {joining ? m.game.cta.joining : joinLabel}
    </Button>
  ) : undefined;

  const occupantSubtitle = occupant?.levelBand
    ? m.game.players.seatWithLevel(
        positionLabel,
        displayLabelFromStoredBand(occupant.levelBand),
      )
    : positionLabel;

  return (
    <ListRow
      leading={
        occupant ? (
          <UserAvatar name={occupant.name} image={occupant.image} size="lg" />
        ) : (
          <OpenSeat joinable={canJoin || canMove} />
        )
      }
      title={
        occupant ? (
          occupant.name
        ) : canJoin || canMove ? (
          <span className="text-foreground font-medium">
            {m.webGame.seatBlocks.open}
          </span>
        ) : (
          <span className="text-muted-foreground font-medium">
            {m.webGame.seatBlocks.vacant}
          </span>
        )
      }
      subtitle={occupantSubtitle}
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
  const locale = useLocale();
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {sides.map((side) => (
        <div key={side.sideIndex} className="space-y-2">
          <h3 className="text-title font-medium">
            {formatSeatSideHeading(
              sideNoun,
              side.sideIndex,
              sides.length,
              locale,
            )}
          </h3>
          <RowList>
            <SeatRow
              position="left"
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
              position="right"
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
