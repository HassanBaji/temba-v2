import type { ReactNode } from "react";
import { Globe } from "lucide-react";
import Link from "next/link";

import { PageTitle } from "~/components/layout/page-title";
import { GameViewerStatusBadge } from "~/components/temba/game-viewer-status-badge";
import { SportBadge } from "~/components/temba/sport-badge";
import {
  GameFormatBadge,
  GameRegistrationModeBadge,
  GameRegistrationStatusBadge,
} from "~/components/temba/typed-labels";
import { Badge } from "~/components/ui/badge";
import type { GameViewerStatus } from "@repo/domain/game-summary-cta";

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
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
      <div className="col-start-1 row-start-1 min-w-0 space-y-2">
        <PageTitle>{name}</PageTitle>
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
      {primaryAction ? (
        <div className="col-span-2 row-start-2 flex flex-wrap items-center gap-2 sm:col-span-1 sm:col-start-2 sm:row-start-1">
          {primaryAction}
        </div>
      ) : null}
      {actions ? (
        <div className="col-start-2 row-start-1 sm:col-start-3">{actions}</div>
      ) : null}
    </header>
  );
}
