"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ChevronRight, UserPlus, Users, X } from "lucide-react";

import {
  ActionMenu,
  ActionMenuItem,
  ActionMenuSeparator,
} from "~/components/common/action-menu";
import { EmptyState } from "~/components/common/empty-state";
import { LinkedTableRow } from "~/components/common/linked-table-row";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { UserAvatar } from "~/components/common/user-avatar";
import { LevelCell } from "~/components/temba/level-cell";
import { NotOnTembaTag, YouTag } from "~/components/temba/seat";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Surface } from "~/components/ui/surface";
import {
  groupMemberSetLevelHref,
  playerProfilePath,
} from "~/lib/dashboard-paths";
import { cardFrame } from "~/lib/page-layout";
import { cn } from "~/lib/utils";
import {
  filterGroupMembersByName,
  groupHomeShowsMemberSearch,
  groupMemberOrganizerAction,
  groupMemberOrganizerActionLabel,
  type GroupMemberOrganizerAction,
} from "@repo/domain/group-home-chrome";
import {
  GROUP_MEMBERS_DEFAULT_SORT,
  GROUP_MEMBERS_NO_MATCH_COPY,
  groupMemberTableCaption,
  groupMembersLegend,
  groupPendingInviteCaption,
  groupPendingInvitesTitle,
  sortGroupMembers,
  type GroupMembersSort,
} from "@repo/domain/group-members-table";
import type { GroupLevelOverrideData } from "@repo/domain/group-data";
import type { LevelBand } from "@repo/domain/level-bands";
import {
  ADD_PLAYER_ACTION,
  REMOVE_UNCLAIMED_PLAYER_ACTION,
  RENAME_UNCLAIMED_PLAYER_ACTION,
} from "@repo/domain/add-player-by-phone";
import {
  levelOverrideCaption,
  levelOverrideReasonLabel,
  levelSliderLabel,
  type LevelOverrideReason,
} from "@repo/domain/level-slider";

type GroupMember = {
  userId: string;
  name: string;
  image: string | null;
  isViewer: boolean;
  isOrganizer: boolean;
  isAppointedOrganizer: boolean;
  joinedAt: Date | string | null;
  lastPlayedAt: Date | string | null;
  totalGamesPlayed: number;
  wins: number;
  levelBand: LevelBand | null;
  levelProvisional: boolean;
  level: string | null;
  ratedMatchCount: number;
  levelOverride: GroupLevelOverrideData | null;
  unclaimed: boolean;
  phoneMasked: string | null;
};

type SavedLevel = {
  name: string;
  levelLabel: string;
  reason: LevelOverrideReason | null;
};

function savedLevelOf(member: GroupMember | undefined): SavedLevel | null {
  if (!member?.level || !member.levelOverride) {
    return null;
  }
  return {
    name: member.name,
    levelLabel: levelSliderLabel(Number(member.level) * 10),
    reason: member.levelOverride.reason,
  };
}

export type GroupPendingInvite = {
  id: string;
  name: string;
  invitedAt: Date | string;
};

function memberCaption(member: GroupMember, canSetLevel: boolean) {
  const parts = [
    groupMemberTableCaption(member),
    member.phoneMasked,
    canSetLevel && member.levelOverride
      ? levelOverrideCaption(member.levelOverride)
      : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

function SavedBanner({
  saved,
  onDismiss,
}: {
  saved: SavedLevel;
  onDismiss: () => void;
}) {
  const reason = saved.reason ? levelOverrideReasonLabel(saved.reason) : null;
  return (
    <Surface
      tone="ink"
      radius="card"
      role="status"
      className="flex items-start justify-between gap-3 px-5 py-4"
    >
      <p className="text-body">
        <span className="font-semibold">
          {saved.name} set to {saved.levelLabel}.
        </span>
        {reason
          ? ` Reason: ${reason.charAt(0).toLowerCase()}${reason.slice(1)}.`
          : null}
      </p>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onDismiss}
        className="-m-2 flex size-11 shrink-0 items-center justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-current"
      >
        <X aria-hidden="true" className="size-[18px]" />
      </button>
    </Surface>
  );
}

function MemberActionsMenu({
  name,
  setLevelHref,
  profileHref,
  organizerAction,
  onOrganizerAction,
  onRename,
  onRemove,
}: {
  name: string;
  setLevelHref?: string;
  profileHref?: string;
  organizerAction?: GroupMemberOrganizerAction;
  onOrganizerAction?: () => void;
  onRename?: () => void;
  onRemove?: () => void;
}) {
  return (
    <ActionMenu label={`Manage ${name}`}>
      {setLevelHref ? (
        <ActionMenuItem asChild>
          <Link href={setLevelHref}>Set Level</Link>
        </ActionMenuItem>
      ) : null}
      {profileHref ? (
        <ActionMenuItem asChild>
          <Link href={profileHref}>View profile</Link>
        </ActionMenuItem>
      ) : null}
      {organizerAction && onOrganizerAction ? (
        <ActionMenuItem onSelect={onOrganizerAction}>
          {groupMemberOrganizerActionLabel(organizerAction)}
        </ActionMenuItem>
      ) : null}
      {onRename ? (
        <ActionMenuItem onSelect={onRename}>
          {RENAME_UNCLAIMED_PLAYER_ACTION}
        </ActionMenuItem>
      ) : null}
      {onRemove ? (
        <>
          {setLevelHref || profileHref || organizerAction || onRename ? (
            <ActionMenuSeparator />
          ) : null}
          <ActionMenuItem variant="destructive" onSelect={onRemove}>
            {REMOVE_UNCLAIMED_PLAYER_ACTION}
          </ActionMenuItem>
        </>
      ) : null}
    </ActionMenu>
  );
}

const COL_STAT = "w-[38px] px-0 text-center";
const COL_LEVEL = "w-11 px-0";
const COL_ACTION = "w-11 px-0";

const SORT_COLUMNS: {
  sort: GroupMembersSort;
  label: string;
  title: string;
  className: string;
}[] = [
  { sort: "played", label: "P", title: "Games played", className: COL_STAT },
  { sort: "won", label: "W", title: "Matches won", className: COL_STAT },
  { sort: "level", label: "LVL", title: "Level", className: COL_LEVEL },
];

function SortHeader({
  column,
  sort,
  onSort,
}: {
  column: (typeof SORT_COLUMNS)[number];
  sort: GroupMembersSort;
  onSort: (sort: GroupMembersSort) => void;
}) {
  const active = column.sort === sort;
  return (
    <th
      scope="col"
      aria-sort={active ? "descending" : "none"}
      className={column.className}
    >
      <button
        type="button"
        title={column.title}
        aria-label={`Sort by ${column.title}`}
        onClick={() => onSort(column.sort)}
        className={cn(
          "h-10 w-full font-mono text-[11px] font-normal outline-none focus-visible:ring-2 focus-visible:ring-current",
          active
            ? "text-ink underline underline-offset-[3px]"
            : "text-muted-foreground",
        )}
      >
        {column.label}
      </button>
    </th>
  );
}

function GroupMemberRow({
  member,
  canSetLevel,
  showLevel,
  managing,
  profileHref,
  actions,
}: {
  member: GroupMember;
  canSetLevel: boolean;
  showLevel: boolean;
  managing: boolean;
  profileHref?: string;
  actions?: ReactNode;
}) {
  const caption = memberCaption(member, canSetLevel);
  const linkHref = managing ? undefined : profileHref;
  const cells = (
    <>
      <td className="py-3 pl-4 pr-2">
        <span className="flex min-w-0 items-center gap-2.5">
          <UserAvatar
            name={member.name}
            image={member.image}
            className="size-8 shrink-0"
          />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="flex min-w-0 items-center gap-1.5">
              {linkHref ? (
                <Link
                  href={linkHref}
                  className="text-body block min-w-0 truncate font-semibold outline-none focus-visible:underline"
                >
                  {member.name}
                </Link>
              ) : (
                <span className="text-body block min-w-0 truncate font-semibold">
                  {member.name}
                </span>
              )}
              {member.isViewer ? <YouTag /> : null}
              {member.unclaimed ? <NotOnTembaTag /> : null}
            </span>
            {caption ? (
              <span className="text-eyebrow text-muted-foreground truncate">
                {caption}
              </span>
            ) : null}
          </span>
        </span>
      </td>
      <td
        className={cn(
          COL_STAT,
          "font-expanded text-body font-bold tabular-nums tracking-[-0.03em]",
        )}
      >
        {member.totalGamesPlayed}
      </td>
      {managing ? null : (
        <td
          className={cn(
            COL_STAT,
            "text-meta text-muted-foreground tabular-nums",
          )}
        >
          {member.wins}
        </td>
      )}
      {showLevel ? (
        <td className={COL_LEVEL}>
          <LevelCell
            band={member.levelBand}
            provisional={member.levelProvisional}
            className="text-meta justify-center text-center font-mono"
          />
        </td>
      ) : null}
      {managing ? (
        <td className={cn(COL_ACTION, "pr-1.5")}>{actions}</td>
      ) : null}
    </>
  );
  return linkHref ? (
    <LinkedTableRow
      href={linkHref}
      className="border-rule hover:bg-wash border-t"
    >
      {cells}
    </LinkedTableRow>
  ) : (
    <tr className="border-rule border-t">{cells}</tr>
  );
}

function PendingInvitesCard({
  invites,
  onOpen,
}: {
  invites: GroupPendingInvite[];
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="border-rule rounded-card hover:border-ink hatch flex w-full items-center justify-between gap-3 border px-[18px] py-3.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-current"
    >
      <span className="min-w-0">
        <span className="text-body block font-semibold">
          {groupPendingInvitesTitle(invites.length)}
        </span>
        <span className="text-eyebrow text-muted-foreground block truncate">
          {invites.map((invite) => invite.name).join(", ")}
        </span>
      </span>
      <ChevronRight
        aria-hidden="true"
        className="text-muted-foreground size-[18px] shrink-0"
      />
    </button>
  );
}

function PendingInvitesDialog({
  open,
  onOpenChange,
  invites,
  revokePendingId,
  onRevoke,
  onInviteMore,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invites: GroupPendingInvite[];
  revokePendingId?: string;
  onRevoke: (inviteId: string) => void;
  onInviteMore?: () => void;
}) {
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Pending invites</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {invites.length === 0
              ? "Everyone you invited has joined or been cancelled."
              : "Cancelling an invite revokes it."}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        {invites.length > 0 ? (
          <ul
            className={cn(cardFrame, "mx-4 mb-4 md:mx-0 md:mb-0")}
            aria-label="Pending invites"
          >
            {invites.map((invite) => (
              <li
                key={invite.id}
                className="border-rule flex items-center gap-3 border-t py-3 pl-4 pr-3 first:border-t-0"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-body truncate font-semibold">
                    {invite.name}
                  </span>
                  <span className="text-eyebrow text-muted-foreground truncate">
                    {groupPendingInviteCaption(invite.invitedAt)}
                  </span>
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  pending={revokePendingId === invite.id}
                  disabled={revokePendingId != null}
                  onClick={() => onRevoke(invite.id)}
                  aria-label={`Cancel the invite to ${invite.name}`}
                >
                  <X aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
        {onInviteMore ? (
          <ResponsiveDialogFooter>
            <Button
              type="button"
              size="lg"
              onClick={() => {
                onOpenChange(false);
                onInviteMore();
              }}
              className="w-full font-semibold"
            >
              <UserPlus aria-hidden="true" />
              Invite someone else
            </Button>
          </ResponsiveDialogFooter>
        ) : null}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

function InviteBlock({ onInvite }: { onInvite: () => void }) {
  return (
    <section className="border-rule rounded-card border p-5">
      <h2 className="text-body font-semibold">Invite players</h2>
      <p className="text-meta text-muted-foreground mt-1.5">
        Invite players and the standing fills in as their matches are rated.
      </p>
      <Button
        type="button"
        onClick={onInvite}
        className="mt-4 w-full font-semibold"
      >
        Share invite link
      </Button>
    </section>
  );
}

export function GroupMembersTab({
  groupId,
  members,
  linkToPlayers,
  canInvite,
  canSetLevel,
  savedUserId,
  onDismissSaved,
  onInvite,
  canAddPlayers = false,
  onAddPlayer,
  onRenameUnclaimed,
  onRemoveUnclaimed,
  canAppointOrganizers = false,
  onOrganizerAction,
  showLevel = true,
  pendingInvites = [],
  revokeInvitePendingId,
  onRevokeInvite,
  top,
  afterTable,
}: {
  showLevel?: boolean;
  canAppointOrganizers?: boolean;
  onOrganizerAction?: (
    member: { userId: string; name: string },
    action: GroupMemberOrganizerAction,
  ) => void;
  canAddPlayers?: boolean;
  onAddPlayer?: () => void;
  onRenameUnclaimed?: (member: { userId: string; name: string }) => void;
  onRemoveUnclaimed?: (member: { userId: string; name: string }) => void;
  groupId: string;
  members: GroupMember[];
  linkToPlayers: boolean;
  canInvite: boolean;
  canSetLevel: boolean;
  /** The member whose Level was just set, from the Set Level page. */
  savedUserId: string | null;
  onDismissSaved: () => void;
  onInvite: () => void;
  /** Lookup invites not yet accepted; only an inviter is given them. */
  pendingInvites?: GroupPendingInvite[];
  revokeInvitePendingId?: string;
  onRevokeInvite?: (inviteId: string) => void;
  /** Above the search row, e.g. the join requests banner. */
  top?: ReactNode;
  /** Between the table and the pending invites card. */
  afterTable?: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<GroupMembersSort>(
    GROUP_MEMBERS_DEFAULT_SORT,
  );
  const [managing, setManaging] = useState(false);
  const [invitesOpen, setInvitesOpen] = useState(false);
  const saved = canSetLevel
    ? savedLevelOf(members.find((member) => member.userId === savedUserId))
    : null;
  const canManage = canSetLevel || canAppointOrganizers || canAddPlayers;
  const isManaging = canManage && managing;
  const showSearch = groupHomeShowsMemberSearch(members.length);
  const visible = sortGroupMembers(
    showSearch ? filterGroupMembersByName(members, query) : members,
    sort,
  );
  const sortColumns = SORT_COLUMNS.filter(
    (column) =>
      (column.sort !== "won" || !isManaging) &&
      (column.sort !== "level" || showLevel),
  );
  const columnCount = 1 + sortColumns.length + (isManaging ? 1 : 0);
  const addPlayerButton =
    canAddPlayers && onAddPlayer ? (
      <Button
        type="button"
        variant="outline"
        onClick={onAddPlayer}
        className="w-full font-semibold"
      >
        <UserPlus aria-hidden="true" />
        {ADD_PLAYER_ACTION}
      </Button>
    ) : null;
  const manageButton = canManage ? (
    <Button
      type="button"
      variant={isManaging ? "default" : "outline"}
      aria-pressed={isManaging}
      onClick={() => setManaging((current) => !current)}
      className={cn("shrink-0 px-4", isManaging && "font-semibold")}
    >
      {isManaging ? "Done" : "Manage"}
    </Button>
  ) : null;

  if (members.length === 0) {
    return (
      <div className="flex flex-col gap-[26px]">
        {top}
        <EmptyState
          icon={Users}
          title="No members yet"
          description="People who join this Group will show up here."
        />
        {addPlayerButton}
        {afterTable}
        {canInvite ? <InviteBlock onInvite={onInvite} /> : null}
      </div>
    );
  }

  function memberActions(member: GroupMember) {
    const setLevelHref =
      canSetLevel && !member.isViewer
        ? groupMemberSetLevelHref(groupId, member.userId)
        : undefined;
    const profileHref = linkToPlayers
      ? playerProfilePath(member.userId)
      : undefined;
    const organizerAction = canAppointOrganizers
      ? (groupMemberOrganizerAction(member) ?? undefined)
      : undefined;
    const target = { userId: member.userId, name: member.name };
    const onRename =
      canAddPlayers && member.unclaimed && onRenameUnclaimed
        ? () => onRenameUnclaimed(target)
        : undefined;
    const onRemove =
      canAddPlayers && member.unclaimed && onRemoveUnclaimed
        ? () => onRemoveUnclaimed(target)
        : undefined;
    if (
      !setLevelHref &&
      !profileHref &&
      !organizerAction &&
      !onRename &&
      !onRemove
    ) {
      return null;
    }
    return (
      <MemberActionsMenu
        name={member.name}
        setLevelHref={setLevelHref}
        profileHref={profileHref}
        organizerAction={organizerAction}
        onOrganizerAction={
          organizerAction && onOrganizerAction
            ? () => onOrganizerAction(target, organizerAction)
            : undefined
        }
        onRename={onRename}
        onRemove={onRemove}
      />
    );
  }

  return (
    <div className="flex flex-col gap-[26px]">
      {saved ? <SavedBanner saved={saved} onDismiss={onDismissSaved} /> : null}
      {top}

      <div className="flex flex-col gap-3.5">
        {showSearch || manageButton ? (
          <div className="flex gap-2">
            {showSearch ? (
              <Input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search members"
                aria-label="Search members"
                className="min-w-0 flex-1"
              />
            ) : (
              <span className="flex-1" />
            )}
            {manageButton}
          </div>
        ) : null}
        {isManaging ? addPlayerButton : null}

        <div className={cardFrame}>
          <table className="w-full table-fixed border-collapse">
            <caption className="sr-only">Group members</caption>
            <thead className="bg-wash">
              <tr>
                <th
                  scope="col"
                  className="text-eyebrow text-muted-foreground py-0 pl-4 text-left font-normal"
                >
                  Member
                </th>
                {sortColumns.map((column) => (
                  <SortHeader
                    key={column.sort}
                    column={column}
                    sort={sort}
                    onSort={setSort}
                  />
                ))}
                {isManaging ? (
                  <th scope="col" className={COL_ACTION}>
                    <span className="sr-only">Actions</span>
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr className="border-rule border-t">
                  <td
                    colSpan={columnCount}
                    className="text-meta text-muted-foreground px-[18px] py-5"
                  >
                    {GROUP_MEMBERS_NO_MATCH_COPY}
                  </td>
                </tr>
              ) : (
                visible.map((member) => (
                  <GroupMemberRow
                    key={member.userId}
                    member={member}
                    canSetLevel={canSetLevel}
                    showLevel={showLevel}
                    managing={isManaging}
                    profileHref={
                      linkToPlayers
                        ? playerProfilePath(member.userId)
                        : undefined
                    }
                    actions={isManaging ? memberActions(member) : undefined}
                  />
                ))
              )}
            </tbody>
          </table>
          <p className="border-rule text-eyebrow text-muted-foreground border-t px-[18px] py-3">
            {groupMembersLegend({ managing: isManaging, showLevel })}
          </p>
        </div>

        {afterTable}

        {pendingInvites.length > 0 && onRevokeInvite ? (
          <PendingInvitesCard
            invites={pendingInvites}
            onOpen={() => setInvitesOpen(true)}
          />
        ) : null}
      </div>

      {onRevokeInvite ? (
        <PendingInvitesDialog
          open={invitesOpen}
          onOpenChange={setInvitesOpen}
          invites={pendingInvites}
          revokePendingId={revokeInvitePendingId}
          onRevoke={onRevokeInvite}
          onInviteMore={canInvite ? onInvite : undefined}
        />
      ) : null}
    </div>
  );
}
