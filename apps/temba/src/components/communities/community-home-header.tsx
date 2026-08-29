import type { ReactNode } from "react";

import { EntityMonogram } from "~/components/common/entity-monogram";
import { CommunityTypeBadge } from "~/components/temba/community-type-badge";
import { RoleBadge } from "~/components/temba/role-badge";
import { SportBadge } from "~/components/temba/sport-badge";
import { Badge } from "~/components/ui/badge";

export function CommunityHomeHeader({
  name,
  type,
  sports,
  role,
  isArchived,
  joinStatus,
  logoImageUrl,
  actions,
}: {
  name: string;
  type: string;
  sports: string[];
  role: string | null;
  isArchived: boolean;
  joinStatus: string | null;
  logoImageUrl?: string | null;
  actions: ReactNode;
}) {
  return (
    <header className="flex items-start gap-3">
      <EntityMonogram name={name} image={logoImageUrl} size="lg" />
      <div className="min-w-0 flex-1 space-y-2">
        <h1 className="text-h2 lg:text-h1 font-bold tracking-[-0.02em]">
          {name}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <CommunityTypeBadge type={type} />
          {sports.map((sport) => (
            <SportBadge key={sport} sport={sport} />
          ))}
          {role ? <RoleBadge role={role} /> : null}
          {isArchived ? <Badge variant="outline">Soft-archived</Badge> : null}
          {joinStatus === "pending" ? (
            <Badge variant="outline">Join request pending</Badge>
          ) : null}
          {joinStatus === "rejected" ? (
            <Badge variant="outline">Join request rejected</Badge>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 flex-nowrap items-center gap-1">
        {actions}
      </div>
    </header>
  );
}
