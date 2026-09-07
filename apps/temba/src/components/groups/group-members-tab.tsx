"use client";

import Link from "next/link";
import { useState } from "react";
import { Users } from "lucide-react";

import { EmptyState } from "~/components/common/empty-state";
import { ListRow, RowList } from "~/components/common/row-list";
import { UserAvatar } from "~/components/common/user-avatar";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import {
  filterGroupMembersByName,
  groupHomeMemberGamesLabel,
  groupHomeShowsMemberSearch,
} from "~/lib/group-home-chrome";

export function GroupMembersTab({
  members,
  canInvite,
  onInvite,
}: {
  members: {
    userId: string;
    name: string;
    image?: string | null;
    totalGamesPlayed: number;
    isViewer: boolean;
    isCreator: boolean;
  }[];
  canInvite: boolean;
  onInvite: () => void;
}) {
  const [query, setQuery] = useState("");
  const showSearch = groupHomeShowsMemberSearch(members.length);
  const visible = showSearch
    ? filterGroupMembersByName(members, query)
    : members;

  if (members.length === 0) {
    return (
      <div className="space-y-3">
        <EmptyState
          icon={Users}
          title="No members yet"
          description="People who join this Group will show up here."
        />
        {canInvite ? <InviteMembersFooter onInvite={onInvite} /> : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {showSearch ? (
        <div className="bg-background sticky top-24 z-10 py-2 lg:top-11">
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search members"
            aria-label="Search members"
          />
        </div>
      ) : null}

      {visible.length === 0 ? (
        <p className="text-body text-muted-foreground py-6 text-center">
          No members match that name.
        </p>
      ) : (
        <RowList>
          {visible.map((member) => {
            const title = (
              <>
                {member.name}
                {member.isViewer ? (
                  <Badge variant="outline" className="ml-2 align-middle">
                    You
                  </Badge>
                ) : null}
              </>
            );
            const trailing = member.isCreator ? (
              <Badge variant="outline">Creator</Badge>
            ) : undefined;

            if (member.isViewer) {
              return (
                <ListRow
                  key={member.userId}
                  asChild
                  className="bg-muted"
                  leading={
                    <UserAvatar
                      name={member.name}
                      image={member.image}
                      size="lg"
                    />
                  }
                  title={title}
                  meta={groupHomeMemberGamesLabel(member.totalGamesPlayed)}
                  trailing={trailing}
                >
                  <Link href="/dashboard/you" />
                </ListRow>
              );
            }

            return (
              <ListRow
                key={member.userId}
                leading={
                  <UserAvatar
                    name={member.name}
                    image={member.image}
                    size="lg"
                  />
                }
                title={title}
                meta={groupHomeMemberGamesLabel(member.totalGamesPlayed)}
                trailing={trailing}
              />
            );
          })}
        </RowList>
      )}

      {canInvite ? <InviteMembersFooter onInvite={onInvite} /> : null}
    </div>
  );
}

function InviteMembersFooter({ onInvite }: { onInvite: () => void }) {
  return (
    <button
      type="button"
      onClick={onInvite}
      className="border-border text-body focus-visible:ring-ring/50 flex min-h-11 w-full items-center justify-center rounded-lg border border-dashed px-4 py-3 font-medium outline-none focus-visible:ring-[3px]"
    >
      Invite members
    </button>
  );
}
