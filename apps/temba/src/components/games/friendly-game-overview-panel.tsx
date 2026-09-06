import Link from "next/link";

import { ListRow, RowList } from "~/components/common/row-list";
import { GameLevelRangePanel } from "~/components/games/game-level-range-panel";
import {
  friendlyGameDateTimeLine,
  friendlyGameOccupancyLabel,
  friendlyGamePriceRow,
} from "~/lib/friendly-game-chrome";
import { type RouterOutputs } from "~/trpc/react";

type GameDetail = RouterOutputs["games"]["byId"];

export function FriendlyGameOverviewPanel({
  game,
  onSelectPlayers,
}: {
  game: GameDetail;
  onSelectPlayers: () => void;
}) {
  const firstMatch = game.matches[0];
  const dateTime = friendlyGameDateTimeLine(game.windowStart);
  const duration =
    firstMatch?.durationInMinutes != null
      ? `${firstMatch.durationInMinutes} min`
      : null;
  const price = friendlyGamePriceRow(game.pricePerPlayerCents);
  const occupancy = friendlyGameOccupancyLabel(
    game.registeredUserCount,
    game.playersAllowed,
  );
  const courtName = firstMatch?.courtName ?? null;

  return (
    <div className="space-y-6">
      <RowList>
        <ListRow
          title="Date & time"
          subtitle={dateTime ?? "Not set"}
          meta={duration}
        />
        {game.venue ? (
          <ListRow title="Venue" subtitle={game.venue.name} meta={courtName} />
        ) : courtName ? (
          <ListRow title="Venue" subtitle={courtName} />
        ) : null}
        {price ? (
          <ListRow
            title="Price per player"
            subtitle={price.amount}
            meta={price.helper}
          />
        ) : null}
        {game.groupId ? (
          <ListRow asChild title="Group" subtitle={game.groupName ?? "Group"}>
            <Link href={`/dashboard/groups/${game.groupId}`} />
          </ListRow>
        ) : (
          <ListRow title="Pickup" />
        )}
        <ListRow asChild title="Players" subtitle={occupancy}>
          <button type="button" onClick={onSelectPlayers} />
        </ListRow>
      </RowList>

      <GameLevelRangePanel game={game} />
    </div>
  );
}
