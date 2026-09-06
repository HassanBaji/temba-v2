import {
  CalendarIcon,
  DollarSign,
  MapPin,
  Signal,
  SignalMedium,
  Tag,
  Users,
} from "lucide-react";
import Link from "next/link";

import { ListRow, RowList } from "~/components/common/row-list";
import { FriendlyGameDirectionsLink } from "~/components/games/friendly-game-directions-link";
import { GameLevelRangePanel } from "~/components/games/game-level-range-panel";
import { formatGameTimeWindow } from "~/lib/format-game-start";
import {
  friendlyGameDateTimeLine,
  friendlyGameDirectionsUrl,
  friendlyGameOccupancyLabel,
  friendlyGamePriceRow,
} from "~/lib/friendly-game-chrome";
import { formatGameWindowName } from "~/lib/game-window";
import { formatLevelRangeLabel } from "~/lib/level-range";
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
  const time = formatGameTimeWindow(
    game.windowStart,
    game.windowEnd,
    game.windowStart ?? new Date(),
  );
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
  const directionsUrl = friendlyGameDirectionsUrl(
    game.venue?.latitude,
    game.venue?.longitude,
  );

  const levelMeta = formatLevelRangeLabel(
    game.levelMinTenths,
    game.levelMaxTenths,
  );

  return (
    <div className="space-y-6">
      <RowList>
        <ListRow
          title={dateTime}
          subtitle={`${time} · ${duration}`}
          icon={<CalendarIcon strokeWidth={1.5} />}
        />
        {levelMeta ? (
          <ListRow title={levelMeta} icon={<Signal strokeWidth={1.5} />} />
        ) : null}
        {game.venue ? (
          <ListRow
            title={game.venue.name}
            subtitle={courtName}
            icon={<MapPin />}
            trailing={
              directionsUrl ? (
                <FriendlyGameDirectionsLink href={directionsUrl} />
              ) : undefined
            }
          />
        ) : courtName ? (
          <ListRow title={courtName} icon={<MapPin strokeWidth={1} />} />
        ) : null}
        {price ? (
          <ListRow
            title={`${price.amount} per player`}
            subtitle={price.helper}
            icon={<Tag strokeWidth={1.5} />}
          />
        ) : null}

        {game.groupId ? (
          <ListRow asChild title={game.groupName ?? "Group"} icon={<Users />}>
            <Link href={`/dashboard/groups/${game.groupId}`} />
          </ListRow>
        ) : (
          <ListRow title="Pickup" />
        )}
      </RowList>

      <GameLevelRangePanel game={game} />
    </div>
  );
}
