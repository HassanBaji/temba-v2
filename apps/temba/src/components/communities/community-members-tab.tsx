"use client";

import { Users } from "lucide-react";
import { type KeyboardEvent, useRef, useState } from "react";

import { ConfirmDialog } from "~/components/common/confirm-dialog";
import { EmptyState } from "~/components/common/empty-state";
import { ListRow, RowList } from "~/components/common/row-list";
import { UserAvatar } from "~/components/common/user-avatar";
import { ROLE_LABELS, RoleBadge } from "~/components/temba/role-badge";
import { ErrorState } from "~/components/common/error-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Skeleton } from "~/components/ui/skeleton";
import {
  COMMUNITY_ROLES,
  type CommunityRoleChange,
  type CommunityRoleValue,
  isCommunityRole,
  roleChangeConfirmCopy,
  roleChangeNeedsConfirmation,
} from "~/lib/community-role-change";
import { type RouterOutputs } from "~/trpc/react";

type CommunityMember = RouterOutputs["communities"]["listMembers"][number];

// A closed Radix Select commits typeahead matches straight to onValueChange,
// which would fire a role mutation per key press; roles change only from the open list.
function blockClosedTypeahead(event: KeyboardEvent<HTMLButtonElement>) {
  const isModifierKey = event.ctrlKey || event.altKey || event.metaKey;
  if (!isModifierKey && event.key.length === 1 && event.key !== " ") {
    event.preventDefault();
  }
}

export function CommunityMembersTab({
  members,
  isLoading,
  errorMessage,
  onRetry,
  viewerUserId,
  canManageRoles,
  rolePending,
  onRoleChange,
  linkedTeamBlocksLeave,
  isLastOwnerBlockedLeave,
}: {
  members: CommunityMember[] | undefined;
  isLoading: boolean;
  errorMessage?: string;
  onRetry: () => void;
  viewerUserId: string | undefined;
  canManageRoles: boolean;
  rolePending: boolean;
  onRoleChange: (userId: string, role: CommunityRoleValue) => void;
  linkedTeamBlocksLeave: boolean;
  isLastOwnerBlockedLeave: boolean;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingChange, setPendingChange] = useState<
    (CommunityRoleChange & { userId: string }) | null
  >(null);
  const roleTriggerRef = useRef<HTMLElement | null>(null);

  function requestRoleChange(
    change: CommunityRoleChange & { userId: string },
    triggerId: string,
  ) {
    if (change.from === change.to) {
      return;
    }
    if (!roleChangeNeedsConfirmation(change)) {
      onRoleChange(change.userId, change.to);
      return;
    }
    roleTriggerRef.current = document.getElementById(triggerId);
    setPendingChange(change);
    setConfirmOpen(true);
  }

  if (isLoading) {
    return (
      <div aria-busy="true" className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (errorMessage) {
    return (
      <ErrorState
        title="Members could not be loaded"
        message={errorMessage}
        onRetry={onRetry}
      />
    );
  }

  if (!members || members.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No members yet"
        description="People who join this Community will show up here."
      />
    );
  }

  return (
    <div className="space-y-4">
      {linkedTeamBlocksLeave ? (
        <p className="text-body text-muted-foreground">
          Leave is refused while you sit on a Team linked to this Community.
          Unlink or dissolve the Team first.
        </p>
      ) : null}
      {isLastOwnerBlockedLeave ? (
        <p className="text-body text-muted-foreground">
          You are the last Owner. Promote someone else before leaving or
          demoting yourself. Leaving does not Soft-archive this Community.
        </p>
      ) : null}
      <RowList>
        {members.map((member) => {
          const name = member.user.name ?? "Member";
          const isSelf = member.user.id === viewerUserId;
          const selectId = `member-role-${member.id}`;
          return (
            <ListRow
              key={member.id}
              leading={
                <UserAvatar name={name} image={member.user.image} size="lg" />
              }
              title={
                <>
                  {name}
                  {isSelf ? (
                    <span className="text-meta text-muted-foreground ml-2 font-normal">
                      You
                    </span>
                  ) : null}
                </>
              }
              meta={member.user.email ?? undefined}
              trailing={
                canManageRoles ? (
                  <Select
                    value={member.role}
                    disabled={rolePending}
                    onValueChange={(role) => {
                      if (!isCommunityRole(role)) {
                        return;
                      }
                      requestRoleChange(
                        {
                          userId: member.user.id,
                          name,
                          isSelf,
                          from: member.role,
                          to: role,
                        },
                        selectId,
                      );
                    }}
                  >
                    <SelectTrigger
                      id={selectId}
                      aria-label={`Role for ${name}`}
                      className="w-28"
                      onKeyDown={blockClosedTypeahead}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMUNITY_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <RoleBadge role={member.role} />
                )
              }
            />
          );
        })}
      </RowList>
      {pendingChange ? (
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          {...roleChangeConfirmCopy(pendingChange)}
          variant={pendingChange.isSelf ? "destructive" : "default"}
          pending={rolePending}
          restoreFocusRef={roleTriggerRef}
          onConfirm={() => {
            onRoleChange(pendingChange.userId, pendingChange.to);
          }}
        />
      ) : null}
    </div>
  );
}
