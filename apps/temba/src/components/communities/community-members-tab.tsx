import { Users } from "lucide-react";

import { EmptyState } from "~/components/common/empty-state";
import { ListRow, RowList } from "~/components/common/row-list";
import { UserAvatar } from "~/components/common/user-avatar";
import { RoleBadge } from "~/components/temba/role-badge";
import { ErrorState } from "~/components/common/error-state";
import { FieldLabel } from "~/components/ui/field";
import { Skeleton } from "~/components/ui/skeleton";
import type { CommunityMember } from "~/server/communities";

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
  onRoleChange: (userId: string, role: "owner" | "admin" | "member") => void;
  linkedTeamBlocksLeave: boolean;
  isLastOwnerBlockedLeave: boolean;
}) {
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
              leading={<UserAvatar name={name} size="lg" />}
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
                  <div className="min-w-0">
                    <FieldLabel htmlFor={selectId}>Role</FieldLabel>
                    <select
                      id={selectId}
                      aria-label={`Role for ${name}`}
                      className="border-input bg-background text-foreground focus-visible:ring-ring/50 min-h-11 rounded-md border px-3 text-sm outline-none focus-visible:ring-[3px]"
                      value={member.role}
                      disabled={rolePending}
                      onChange={(event) => {
                        const role = event.target.value;
                        if (
                          role !== "owner" &&
                          role !== "admin" &&
                          role !== "member"
                        ) {
                          return;
                        }
                        if (role === member.role) {
                          return;
                        }
                        onRoleChange(member.user.id, role);
                      }}
                    >
                      <option value="owner">Owner</option>
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                    </select>
                  </div>
                ) : (
                  <RoleBadge role={member.role} />
                )
              }
            />
          );
        })}
      </RowList>
    </div>
  );
}
