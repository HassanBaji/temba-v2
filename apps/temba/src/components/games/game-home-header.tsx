import type { ReactNode } from "react";
import Link from "next/link";

import { SportBadge } from "~/components/temba/sport-badge";
import {
  GameFormatBadge,
  GameRegistrationStatusBadge,
} from "~/components/temba/typed-labels";

export function GameHomeHeader({
  name,
  groupId,
  groupName,
  sport,
  format,
  registrationStatus,
  primaryAction,
  actions,
}: {
  name: string;
  groupId: string | null;
  groupName: string | null;
  sport: string | null;
  format: string;
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
          <GameFormatBadge format={format} />
          <GameRegistrationStatusBadge status={registrationStatus} />
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
