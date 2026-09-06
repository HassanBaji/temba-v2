import type { ReactNode } from "react";
import { Ban, MapPin } from "lucide-react";

import { AvatarStack } from "~/components/common/avatar-stack";
import { FriendlyGameDirectionsLink } from "~/components/games/friendly-game-directions-link";
import { GameRegistrationStatusBadge } from "~/components/temba/typed-labels";
import {
  friendlyGameDateDurationLine,
  friendlyGameDirectionsUrl,
  friendlyGameOccupancyLabel,
  friendlyGameOpenSpotsLabel,
  friendlyGameVenueLine,
  friendlyGameViewerLine,
} from "~/lib/friendly-game-chrome";
import { formatGameClock, formatGameTimeWindow } from "~/lib/format-game-start";
import type { GameViewerStatus } from "~/lib/game-summary-cta";
import { cn } from "~/lib/utils";

export function FriendlyGameHomeHero({
  name,
  windowStart,
  windowEnd,
  durationInMinutes,
  venueName,
  venueLatitude,
  venueLongitude,
  courtName,
  registeredUserCount,
  playersAllowed,
  people,
  registrationStatus,
  viewerStatus,
  cancelled,
  primaryAction,
  actions,
}: {
  name: string | null;
  windowStart: Date | string | null;
  windowEnd: Date | string | null;
  durationInMinutes: number | null | undefined;
  venueName: string | null | undefined;
  venueLatitude: string | null | undefined;
  venueLongitude: string | null | undefined;
  courtName: string | null | undefined;
  registeredUserCount: number;
  playersAllowed: number | null | undefined;
  people: { name: string; image?: string | null }[];
  registrationStatus: string;
  viewerStatus: GameViewerStatus;
  cancelled: boolean;
  primaryAction?: ReactNode;
  actions?: ReactNode;
}) {
  const heading = name ?? "Game";
  const clock = windowStart
    ? formatGameTimeWindow(windowStart, windowEnd, windowStart)
    : "Time unset";
  const dateDuration = friendlyGameDateDurationLine(
    windowStart,
    durationInMinutes,
  );
  const venueLine = friendlyGameVenueLine(venueName, courtName);
  const directionsUrl = friendlyGameDirectionsUrl(
    venueLatitude,
    venueLongitude,
  );
  const occupancy = friendlyGameOccupancyLabel(
    registeredUserCount,
    playersAllowed,
  );

  const openSpotsLabel = friendlyGameOpenSpotsLabel(
    registeredUserCount,
    playersAllowed,
  );
  const viewerLine = friendlyGameViewerLine(viewerStatus);

  return (
    <header className="space-y-4">
      {cancelled ? (
        <section
          role="status"
          className="bg-destructive/10 text-destructive rounded-xl p-4"
        >
          <div className="flex gap-3">
            <Ban
              aria-hidden="true"
              className="mt-0.5 size-5 shrink-0"
              strokeWidth={2}
            />
            <p className="text-title font-semibold tracking-[-0.01em]">
              This Game is cancelled
            </p>
          </div>
        </section>
      ) : null}

      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="space-y-1">
            <p
              className={cn(
                "text-2xl font-bold tabular-nums tracking-tight",
                cancelled ? "text-muted-foreground line-through" : null,
              )}
            >
              {clock}
            </p>
            {dateDuration ? <p className="font-light">{dateDuration}</p> : null}
          </div>

          {venueLine || directionsUrl ? (
            <div className="space-y-1">
              {venueLine ? (
                <p className="flex min-w-0 items-start gap-1.5 font-semibold">
                  <span className="min-w-0 break-words">{venueLine}</span>
                </p>
              ) : null}
              {courtName ? (
                <p className="text-muted-foreground text-sm font-light">
                  {courtName}
                </p>
              ) : null}
              {directionsUrl ? (
                <FriendlyGameDirectionsLink href={directionsUrl} />
              ) : null}
            </div>
          ) : null}

          <div className="mt-4 flex min-w-0 flex-wrap items-center gap-3">
            {people.length > 0 ? (
              <AvatarStack
                people={people}
                openSeats={
                  playersAllowed ? playersAllowed - registeredUserCount : 0
                }
              />
            ) : null}
            <div className="flex flex-col">
              <p className="text-lg font-semibold">{occupancy}</p>
              <p className="text-muted-foreground text-sm font-light">
                {openSpotsLabel}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <GameRegistrationStatusBadge status={registrationStatus} />
            {viewerLine ? (
              <p className={cn("mt-1 font-light")}>{viewerLine}</p>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-nowrap items-center gap-1">
          {primaryAction}
          {actions}
        </div>
      </div>
    </header>
  );
}
