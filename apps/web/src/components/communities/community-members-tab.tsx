"use client";

import { Users } from "lucide-react";
import { type KeyboardEvent, useRef, useState } from "react";

import { ConfirmDialog } from "~/components/common/confirm-dialog";
import { EmptyState } from "~/components/common/empty-state";
import { ErrorState } from "~/components/common/error-state";
import { UserAvatar } from "~/components/common/user-avatar";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Skeleton } from "~/components/ui/skeleton";
import {
  COMMUNITY_INVITE_BLOCK_COPY,
  COMMUNITY_MEMBERS_ERROR_TITLE,
  COMMUNITY_MEMBERS_NO_MATCH_COPY,
  COMMUNITY_NO_MEMBERS_EMPTY,
  COMMUNITY_ROLE_LABELS,
  communityMemberList,
  communityRoleChangeAction,
} from "@repo/domain/community";
import {
  COMMUNITY_ROLES,
  type CommunityRoleChange,
  type CommunityRoleValue,
  isCommunityRole,
  roleChangeConfirmCopy,
} from "@repo/domain/community-role-change";
import { cn } from "~/lib/utils";
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

const MEMBER_TILE =
  "rounded-[10px] [&_[data-slot=avatar-fallback]]:rounded-[10px]";
const VIEWER_TILE =
  "[&_[data-slot=avatar-fallback]]:bg-ink [&_[data-slot=avatar-fallback]]:text-paper";
const OTHER_TILE =
  "border-rule border [&_[data-slot=avatar-fallback]]:bg-paper [&_[data-slot=avatar-fallback]]:text-ink";

function InviteBlock({ onInvite }: { onInvite: () => void }) {
  return (
    <section className="border-rule rounded-[14px] border p-5">
      <h2 className="text-body font-semibold">
        {COMMUNITY_INVITE_BLOCK_COPY.title}
      </h2>
      <p className="text-meta text-muted-foreground mt-1.5">
        {COMMUNITY_INVITE_BLOCK_COPY.description}
      </p>
      <Button
        type="button"
        onClick={onInvite}
        className="bg-ink text-paper hover:bg-dimrule mt-4 h-11 w-full rounded-[10px] font-semibold"
      >
        {COMMUNITY_INVITE_BLOCK_COPY.action}
      </Button>
    </section>
  );
}

function MembersSkeleton() {
  return (
    <div
      aria-busy="true"
      className="divide-rule border-rule divide-y overflow-hidden rounded-[14px] border"
    >
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3.5 px-5 py-[18px]">
          <Skeleton className="size-10 shrink-0 rounded-[10px]" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-5 w-40 max-w-full" />
            <Skeleton className="h-3 w-28 max-w-full" />
          </div>
        </div>
      ))}
    </div>
  );
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
  leaveNotices,
  canInvite,
  onInvite,
}: {
  members: CommunityMember[] | undefined;
  isLoading: boolean;
  errorMessage?: string;
  onRetry: () => void;
  viewerUserId: string | undefined;
  canManageRoles: boolean;
  rolePending: boolean;
  onRoleChange: (userId: string, role: CommunityRoleValue) => void;
  leaveNotices: string[];
  canInvite: boolean;
  onInvite: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingChange, setPendingChange] = useState<
    (CommunityRoleChange & { userId: string }) | null
  >(null);
  const roleTriggerRef = useRef<HTMLElement | null>(null);
  const [query, setQuery] = useState("");

  function requestRoleChange(
    change: CommunityRoleChange & { userId: string },
    triggerId: string,
  ) {
    const action = communityRoleChangeAction(change);
    if (action === "none") {
      return;
    }
    if (action === "apply") {
      onRoleChange(change.userId, change.to);
      return;
    }
    roleTriggerRef.current = document.getElementById(triggerId);
    setPendingChange(change);
    setConfirmOpen(true);
  }

  if (isLoading) {
    return <MembersSkeleton />;
  }

  if (errorMessage) {
    return (
      <ErrorState
        title={COMMUNITY_MEMBERS_ERROR_TITLE}
        message={errorMessage}
        onRetry={onRetry}
      />
    );
  }

  if (!members || members.length === 0) {
    return <EmptyState icon={Users} {...COMMUNITY_NO_MEMBERS_EMPTY} />;
  }

  const { showSearch, rows } = communityMemberList(
    members,
    viewerUserId,
    query,
  );
  const memberById = new Map(members.map((member) => [member.id, member]));

  return (
    <div className="flex flex-col gap-[26px]">
      {leaveNotices.map((notice) => (
        <p key={notice} className="text-body text-muted-foreground">
          {notice}
        </p>
      ))}
      {showSearch ? (
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search members"
          aria-label="Search members"
        />
      ) : null}
      {rows.length === 0 ? (
        <p className="text-body text-muted-foreground py-6 text-center">
          {COMMUNITY_MEMBERS_NO_MATCH_COPY}
        </p>
      ) : (
        <ul className="divide-rule border-rule divide-y overflow-hidden rounded-[14px] border">
          {rows.map((row) => {
            const { name, isSelf } = row;
            const selectId = `member-role-${row.id}`;
            const member = memberById.get(row.id)!;
            return (
              <li
                key={member.id}
                className="flex min-w-0 items-center gap-3.5 px-5 py-[18px]"
              >
                <UserAvatar
                  name={name}
                  image={member.user.image}
                  size="lg"
                  className={cn(MEMBER_TILE, isSelf ? VIEWER_TILE : OTHER_TILE)}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-body break-words",
                      isSelf && "font-semibold",
                    )}
                  >
                    {row.displayName}
                  </p>
                  {member.user.email ? (
                    <p className="text-eyebrow text-muted-foreground break-words">
                      {member.user.email}
                    </p>
                  ) : null}
                </div>
                {canManageRoles ? (
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
                      className="border-rule bg-paper dark:bg-paper w-28 shrink-0 rounded-[10px] px-3 text-sm data-[size=default]:h-10 data-[size=default]:min-h-10"
                      onKeyDown={blockClosedTypeahead}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMUNITY_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {COMMUNITY_ROLE_LABELS[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className="text-meta text-muted-foreground shrink-0">
                    {row.roleLabel}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {canInvite ? <InviteBlock onInvite={onInvite} /> : null}
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
