import type { ReactNode } from "react";
import { Ban, MapPin } from "lucide-react";

import { AvatarStack } from "~/components/common/avatar-stack";
import { FriendlyGameDirectionsLink } from "~/components/games/friendly-game-directions-link";
import { GameRegistrationStatusBadge } from "~/components/temba/typed-labels";
import {
  friendlyGameDateDurationLine,
  friendlyGameDirectionsUrl,
  friendlyGameOccupancyLabel,
  friendlyGameVenueLine,
  friendlyGameViewerLine,
} from "~/lib/friendly-game-chrome";
import { formatGameClock } from "~/lib/format-game-start";
import type { GameViewerStatus } from "~/lib/game-summary-cta";
import { cn } from "~/lib/utils";

export function FriendlyGameHomeHero({
  name,
  windowStart,
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
  const clock = windowStart ? formatGameClock(windowStart) : "Time unset";
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
                "text-display font-bold tabular-nums tracking-tight",
                cancelled ? "text-muted-foreground line-through" : null,
              )}
            >
              {clock}
            </p>
            {dateDuration ? (
              <p className="text-body text-muted-foreground">{dateDuration}</p>
            ) : null}
            <h1
              className={cn(
                "text-lead text-muted-foreground min-w-0 break-words font-semibold",
                name ? null : "sr-only",
              )}
            >
              {heading}
            </h1>
          </div>

          {venueLine || directionsUrl ? (
            <div className="space-y-1">
              {venueLine ? (
                <p className="text-body text-muted-foreground flex min-w-0 items-start gap-1.5">
                  <MapPin
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0"
                    strokeWidth={2}
                  />
                  <span className="min-w-0 break-words">{venueLine}</span>
                </p>
              ) : null}
              {directionsUrl ? (
                <FriendlyGameDirectionsLink href={directionsUrl} />
              ) : null}
            </div>
          ) : null}

          <div className="flex min-w-0 flex-wrap items-center gap-3">
            {people.length > 0 ? (
              <AvatarStack people={people} size="sm" />
            ) : null}
            <p className="text-meta text-muted-foreground">{occupancy}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <GameRegistrationStatusBadge status={registrationStatus} />
            {viewerLine ? (
              <p
                className={cn(
                  "text-meta font-semibold",
                  viewerStatus === "in" ? "text-success" : "text-warning",
                )}
              >
                {viewerLine}
              </p>
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
