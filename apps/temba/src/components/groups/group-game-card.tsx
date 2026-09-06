import Link from "next/link";

import { AvatarStack } from "~/components/common/avatar-stack";
import { GameRegistrationStatusBadge } from "~/components/temba/typed-labels";
import {
  formatGameTimeWindow,
  formatRelativeDay,
} from "~/lib/format-game-start";
import { gameOccupancy } from "~/lib/game-occupancy";
import {
  groupHomeSetScoreLine,
  groupHomeVenueCourtLine,
} from "~/lib/group-home-chrome";
import { formatPricePerPlayerCardMeta } from "~/lib/price-per-player";
import { cn } from "~/lib/utils";
import { type RouterOutputs } from "~/trpc/react";

type GroupHomeGame = RouterOutputs["groups"]["byId"]["upcomingGames"][number];

export function GroupGameCard({
  game,
  showJoinLabel = false,
}: {
  game: GroupHomeGame;
  showJoinLabel?: boolean;
}) {
  const href = `/dashboard/games/${game.id}`;
  const dayLabel = formatRelativeDay(game.startTime, { sameDayLabel: "Today" });
  const timeLabel = formatGameTimeWindow(
    game.windowStart,
    game.windowEnd,
    game.startTime,
  );
  const venueLine = groupHomeVenueCourtLine(game.venueName, game.courtName);
  const occupancy = gameOccupancy(
    game.registeredUserCount,
    game.playersAllowed,
  );
  const price = formatPricePerPlayerCardMeta(game.pricePerPlayerCents);
  const occupancyPrice = [occupancy?.label ?? null, price]
    .filter((part): part is string => Boolean(part))
    .join(" · ");
  const setScores = groupHomeSetScoreLine(game.setScores);
  const joinLabel =
    showJoinLabel &&
    game.registrationStatus === "open" &&
    !game.isRegistered &&
    !game.isWaitlisted &&
    !game.joinFrozen;

  return (
    <li>
      <Link
        href={href}
        className={cn(
          "bg-card focus-visible:ring-ring/50 block rounded-xl border p-4 outline-none focus-visible:ring-[3px]",
        )}
      >
        <p className="text-lead font-semibold tracking-[-0.01em]">
          {dayLabel} · {timeLabel}
        </p>
        {venueLine ? (
          <p className="text-body text-muted-foreground mt-1">{venueLine}</p>
        ) : null}
        <div className="mt-3">
          <GameRegistrationStatusBadge status={game.registrationStatus} />
        </div>
        {game.seatedPeople.length > 0 ? (
          <div className="mt-3">
            <AvatarStack
              people={game.seatedPeople}
              openSeats={
                game.playersAllowed
                  ? Math.max(0, game.playersAllowed - game.registeredUserCount)
                  : 0
              }
            />
          </div>
        ) : null}
        {occupancyPrice ? (
          <p className="text-meta text-muted-foreground mt-3 tabular-nums">
            {occupancyPrice}
          </p>
        ) : null}
        {setScores ? (
          <p className="text-body mt-2 font-medium tabular-nums">{setScores}</p>
        ) : null}
        {joinLabel ? (
          <p className="text-body mt-3 font-semibold">Join</p>
        ) : null}
      </Link>
    </li>
  );
}
