import { PlusIcon, UserPlusIcon } from "lucide-react";
import type { ReactNode } from "react";

import { EntityMonogram } from "~/components/common/entity-monogram";
import {
  ACTION_BOX,
  HEADER_BLEED,
} from "~/components/groups/group-home-chrome";
import { PageTitle } from "~/components/layout/page-title";
import { Badge } from "~/components/ui/badge";
import { BackButton } from "~/components/ui/nav-icon-button";
import { TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  communityHomeMetaLine,
  type CommunityRoleName,
  type CommunityVisibility,
} from "~/lib/community-chrome";
import type { CommunityHomeTab } from "@repo/domain/community-home-tab";
import { cn } from "~/lib/utils";

const TAB_LABELS: Record<CommunityHomeTab, string> = {
  groups: "Groups",
  teams: "Teams",
  members: "Members",
  requests: "Requests",
};

/**
 * Rendered once inside the page's `Tabs` root and outside `TabsContent`, so
 * switching tabs never remounts or shifts it.
 */
export function CommunityHomeChrome({
  name,
  type,
  sports,
  memberCount,
  role,
  logoImageUrl,
  isArchived,
  joinStatus,
  hasCreateAccess,
  tab,
  availableTabs,
  requestCount,
  canInvite,
  canCreateClubGroup,
  onInvite,
  onCreateClubGroup,
  overflow,
}: {
  name: string;
  type: CommunityVisibility;
  sports: readonly string[];
  memberCount: number;
  role: CommunityRoleName | null;
  logoImageUrl?: string | null;
  isArchived: boolean;
  joinStatus: string | null;
  hasCreateAccess: boolean;
  tab: CommunityHomeTab;
  availableTabs: readonly CommunityHomeTab[];
  requestCount: number;
  canInvite: boolean;
  canCreateClubGroup: boolean;
  onInvite: () => void;
  onCreateClubGroup: () => void;
  overflow?: ReactNode;
}) {
  const meta = communityHomeMetaLine({ type, sports, memberCount, role });
  const showInviteBox = tab !== "groups" && canInvite;
  const showCreateBox = tab === "groups" && canCreateClubGroup;
  const hasBadges =
    isArchived || joinStatus === "pending" || joinStatus === "rejected";

  return (
    <div className={cn("border-rule border-b pb-5", HEADER_BLEED)}>
      <div className="flex items-center justify-between gap-3">
        {hasCreateAccess ? (
          <BackButton
            variant="boxed"
            href="/dashboard/communities"
            label="Back to Communities"
          />
        ) : (
          <BackButton variant="boxed" href="/dashboard" label="Back to Home" />
        )}

        <div className="flex items-center gap-2">
          {showInviteBox ? (
            <button
              type="button"
              onClick={onInvite}
              aria-label="Manage invites"
              className={ACTION_BOX}
            >
              <UserPlusIcon aria-hidden="true" className="size-[18px]" />
            </button>
          ) : null}

          {showCreateBox ? (
            <button
              type="button"
              onClick={onCreateClubGroup}
              aria-label="Create Club Group"
              className={ACTION_BOX}
            >
              <PlusIcon aria-hidden="true" className="size-5" />
            </button>
          ) : null}

          {overflow}
        </div>
      </div>

      <header className="mt-5 flex items-start gap-3">
        <div className="shrink-0">
          <EntityMonogram name={name} image={logoImageUrl} size="lg" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <PageTitle className="text-h1 tracking-[-0.01em]">{name}</PageTitle>
          {meta ? (
            <p className="text-meta text-muted-foreground min-w-0 break-words">
              {meta}
            </p>
          ) : null}
          {hasBadges ? (
            <div className="flex flex-wrap items-center gap-2">
              {isArchived ? (
                <Badge variant="outline">Soft-archived</Badge>
              ) : null}
              {joinStatus === "pending" ? (
                <Badge variant="outline">Join request pending</Badge>
              ) : null}
              {joinStatus === "rejected" ? (
                <Badge variant="outline">Join request rejected</Badge>
              ) : null}
            </div>
          ) : null}
        </div>
      </header>

      {availableTabs.length > 1 ? (
        <TabsList variant="segmented" className="mt-5">
          {availableTabs.map((value) => (
            <TabsTrigger key={value} value={value}>
              {TAB_LABELS[value]}
              {value === "requests" && requestCount > 0 ? (
                <Badge variant="secondary" size="sm">
                  {requestCount}
                </Badge>
              ) : null}
            </TabsTrigger>
          ))}
        </TabsList>
      ) : null}
    </div>
  );
}
