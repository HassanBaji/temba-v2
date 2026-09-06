import type { ReactNode } from "react";

import { EntityMonogram } from "~/components/common/entity-monogram";
import { groupHomeHeroMeta } from "~/lib/group-home-chrome";

export function GroupHomeHeader({
  name,
  sport,
  memberCount,
  communityName,
  actions,
}: {
  name: string;
  sport: string | null;
  memberCount: number;
  communityName: string | null;
  actions?: ReactNode;
}) {
  const meta = groupHomeHeroMeta({
    sport,
    memberCount,
    communityName,
  });

  return (
    <header className="flex items-start gap-3">
      <EntityMonogram name={name} size="lg" />
      <div className="min-w-0 flex-1 space-y-1">
        <h1 className="text-h2 lg:text-h1 min-w-0 break-words font-bold tracking-[-0.02em]">
          {name}
        </h1>
        <p className="text-meta text-muted-foreground min-w-0 break-words">
          {meta}
        </p>
      </div>
      {actions ? (
        <div className="hidden shrink-0 flex-nowrap items-center gap-1 lg:flex">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
