import type { ReactNode } from "react";
import { Globe } from "lucide-react";
import Link from "next/link";

import { GameViewerStatusBadge } from "~/components/temba/game-viewer-status-badge";
import { SportBadge } from "~/components/temba/sport-badge";
import {
  GameFormatBadge,
  GameRegistrationModeBadge,
  GameRegistrationStatusBadge,
} from "~/components/temba/typed-labels";
import { Badge } from "~/components/ui/badge";
import type { GameViewerStatus } from "~/lib/game-summary-cta";

export function GameHomeHeader({
  name,
  groupId,
  groupName,
  sport,
  isPublic,
  format,
  registrationMode,
  registrationStatus,
  viewerStatus,
  primaryAction,
  actions,
}: {
  name: string;
  groupId: string | null;
  groupName: string | null;
  sport: string | null;
  isPublic: boolean;
  format: string;
  registrationMode: string;
  registrationStatus: string;
  viewerStatus: GameViewerStatus;
  primaryAction?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex items-start gap-3">
      <div className="min-w-0 flex-1 space-y-2">
        <h1 className="text-h2 lg:text-h1 min-w-0 break-words font-bold tracking-[-0.02em]">
          {name}
        </h1>
        {groupId ? (
          <p className="text-meta text-muted-foreground">
            On Group{" "}
            <Link
              href={`/dashboard/groups/${groupId}`}
              className="text-foreground underline underline-offset-2"
            >
              {groupName ?? "Group"}
            </Link>
          </p>
        ) : (
          <p className="text-meta text-muted-foreground">Pickup Game</p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <GameRegistrationStatusBadge status={registrationStatus} />
          {viewerStatus ? (
            <GameViewerStatusBadge status={viewerStatus} />
          ) : null}
          {format === "friendly_game" ? null : (
            <GameFormatBadge format={format} />
          )}
          {registrationMode === "team_only" ? (
            <GameRegistrationModeBadge mode={registrationMode} />
          ) : null}
          {sport ? <SportBadge sport={sport} /> : null}
          {isPublic ? (
            <Badge variant="outline">
              <Globe aria-hidden="true" strokeWidth={2} />
              Public
            </Badge>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 flex-nowrap items-center gap-1">
        {primaryAction}
        {actions}
      </div>
    </header>
  );
}
