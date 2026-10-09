"use client";

import { useState } from "react";
import { Users, X } from "lucide-react";

import { EmptyState } from "~/components/common/empty-state";
import { MemberRow } from "~/components/common/member-row";
import { RowList } from "~/components/common/row-list";
import { FormStrip } from "~/components/temba/form-strip";
import { LevelCell } from "~/components/temba/level-cell";
import type { ResultMarkVariant } from "~/components/temba/result-mark";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Surface } from "~/components/ui/surface";
import {
  groupMemberSetLevelHref,
  playerProfilePath,
} from "~/lib/dashboard-paths";
import {
  filterGroupMembersByName,
  groupHomeShowsMemberSearch,
  groupMemberFormMarks,
  groupMemberRoleCaption,
} from "@repo/domain/group-home-chrome";
import type { GroupLevelOverrideData } from "@repo/domain/group-data";
import type { LevelBand } from "@repo/domain/level-bands";
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
  joinedAt: Date | string | null;
  formMarks: ResultMarkVariant[];
  levelBand: LevelBand | null;
  levelProvisional: boolean;
  level: string | null;
  ratedMatchCount: number;
  levelOverride: GroupLevelOverrideData | null;
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

function memberCaption(member: GroupMember, canSetLevel: boolean) {
  const parts = [
    groupMemberRoleCaption(member),
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

function GroupMemberRow({
  member,
  canSetLevel,
  href,
}: {
  member: GroupMember;
  canSetLevel: boolean;
  href?: string;
}) {
  return (
    <MemberRow
      size="lg"
      name={member.name}
      image={member.image}
      isViewer={member.isViewer}
      href={href}
      meta={memberCaption(member, canSetLevel)}
      trailing={
        <>
          <FormStrip
            marks={groupMemberFormMarks(member.formMarks)}
            size={14}
            gap={4}
          />
          <LevelCell
            band={member.levelBand}
            level={member.level}
            provisional={member.levelProvisional}
            className="w-16"
          />
        </>
      }
    />
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
}: {
  groupId: string;
  members: GroupMember[];
  linkToPlayers: boolean;
  canInvite: boolean;
  canSetLevel: boolean;
  /** The member whose Level was just set, from the Set Level page. */
  savedUserId: string | null;
  onDismissSaved: () => void;
  onInvite: () => void;
}) {
  const [query, setQuery] = useState("");
  const saved = canSetLevel
    ? savedLevelOf(members.find((member) => member.userId === savedUserId))
    : null;
  const showSearch = groupHomeShowsMemberSearch(members.length);
  const visible = showSearch
    ? filterGroupMembersByName(members, query)
    : members;

  if (members.length === 0) {
    return (
      <div className="flex flex-col gap-[26px]">
        <EmptyState
          icon={Users}
          title="No members yet"
          description="People who join this Group will show up here."
        />
        {canInvite ? <InviteBlock onInvite={onInvite} /> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[26px]">
      {saved ? <SavedBanner saved={saved} onDismiss={onDismissSaved} /> : null}
      {showSearch ? (
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search members"
          aria-label="Search members"
        />
      ) : null}

      {visible.length === 0 ? (
        <p className="text-body text-muted-foreground py-6 text-center">
          No members match that name.
        </p>
      ) : (
        <RowList variant="card">
          {visible.map((member) => (
            <GroupMemberRow
              key={member.userId}
              member={member}
              canSetLevel={canSetLevel}
              href={
                canSetLevel && !member.isViewer
                  ? groupMemberSetLevelHref(groupId, member.userId)
                  : linkToPlayers
                    ? playerProfilePath(member.userId)
                    : undefined
              }
            />
          ))}
        </RowList>
      )}

      {canSetLevel ? (
        <p className="text-meta text-muted-foreground">
          Select a member to set their Level. Hatched Levels are still
          Provisional.
        </p>
      ) : null}

      {canInvite ? <InviteBlock onInvite={onInvite} /> : null}
    </div>
  );
}
