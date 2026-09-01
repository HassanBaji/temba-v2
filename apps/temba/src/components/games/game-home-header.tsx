import type { ReactNode } from "react";
import Link from "next/link";

import { SportBadge } from "~/components/temba/sport-badge";
import {
  GameRegistrationModeBadge,
  GameRegistrationStatusBadge,
} from "~/components/temba/typed-labels";
import { Badge } from "~/components/ui/badge";

export function GameHomeHeader({
  name,
  groupId,
  groupName,
  sport,
  isPublic,
  registrationMode,
  registrationStatus,
  primaryAction,
  actions,
}: {
  name: string;
  groupId: string | null;
  groupName: string | null;
  sport: string | null;
  isPublic: boolean;
  registrationMode: string;
  registrationStatus: string;
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
          <p className="text-meta text-muted-foreground">Groupless Game</p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <GameRegistrationStatusBadge status={registrationStatus} />
          <GameRegistrationModeBadge mode={registrationMode} />
          {isPublic ? <Badge variant="outline">Public</Badge> : null}
          {sport ? <SportBadge sport={sport} /> : null}
        </div>
      </div>
      <div className="flex shrink-0 flex-nowrap items-center gap-1">
        {primaryAction}
        {actions}
      </div>
    </header>
  );
}
