import type { ReactNode } from "react";

import { EntityMonogram } from "~/components/common/entity-monogram";
import { EntityHomeHeader } from "~/components/layout/entity-home-header";
import { CommunityTypeBadge } from "~/components/temba/community-type-badge";
import { RoleBadge } from "~/components/temba/role-badge";
import { SportBadge } from "~/components/temba/sport-badge";
import { Badge } from "~/components/ui/badge";
import { memberCountLabel } from "~/lib/member-count-label";

export function CommunityHomeHeader({
  name,
  type,
  sports,
  role,
  isArchived,
  joinStatus,
  logoImageUrl,
  memberCount,
  primaryAction,
  menu,
}: {
  name: string;
  type: string;
  sports: string[];
  role: string | null;
  isArchived: boolean;
  joinStatus: string | null;
  logoImageUrl?: string | null;
  memberCount?: number | null;
  primaryAction?: ReactNode;
  menu?: ReactNode;
}) {
  return (
    <EntityHomeHeader
      leading={<EntityMonogram name={name} image={logoImageUrl} size="lg" />}
      title={name}
      badges={
        <>
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
        </>
      }
      // The desktop aside carries the count card; below lg it lives here.
      meta={memberCount != null ? memberCountLabel(memberCount) : undefined}
      metaClassName="lg:hidden"
      primaryAction={primaryAction}
      menu={menu}
    />
  );
}
