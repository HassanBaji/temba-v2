import type { ReactNode } from "react";

import { EntityMonogram } from "~/components/common/entity-monogram";
import { GroupTypeBadge } from "~/components/temba/group-type-badge";
import { SportBadge } from "~/components/temba/sport-badge";
import { Badge } from "~/components/ui/badge";

export function GroupHomeHeader({
  name,
  isLoose,
  type,
  sport,
  communityName,
  isCommunityArchived,
  actions,
}: {
  name: string;
  isLoose: boolean;
  type: string | null;
  sport: string | null;
  communityName: string | null;
  isCommunityArchived: boolean;
  actions: ReactNode;
}) {
  const meta = communityName
    ? `Club Group · ${communityName}`
    : "Group outside a Community";

  return (
    <header className="flex items-start gap-3">
      <EntityMonogram name={name} size="lg" />
      <div className="min-w-0 flex-1 space-y-2">
        <h1 className="text-h2 lg:text-h1 font-bold tracking-[-0.02em]">
          {name}
        </h1>
        <p className="text-meta text-muted-foreground">{meta}</p>
        <div className="flex flex-wrap items-center gap-2">
          {sport ? <SportBadge sport={sport} /> : null}
          <GroupTypeBadge isLoose={isLoose} type={type} />
          {isCommunityArchived ? (
            <Badge variant="outline">Soft-archived</Badge>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 flex-nowrap items-center gap-1">
        {actions}
      </div>
    </header>
  );
}
