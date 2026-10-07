"use client";

import { useState } from "react";
import { Users } from "lucide-react";

import { EmptyState } from "~/components/common/empty-state";
import { MemberRow } from "~/components/common/member-row";
import { RowList } from "~/components/common/row-list";
import { FormStrip } from "~/components/temba/form-strip";
import { LevelCell } from "~/components/temba/level-cell";
import type { ResultMarkVariant } from "~/components/temba/result-mark";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  filterGroupMembersByName,
  groupHomeShowsMemberSearch,
  groupMemberFormMarks,
  groupMemberRoleCaption,
} from "@repo/domain/group-home-chrome";
import type { LevelBand } from "@repo/domain/level-bands";

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
};

function GroupMemberRow({ member }: { member: GroupMember }) {
  return (
    <MemberRow
      size="lg"
      name={member.name}
      image={member.image}
      isViewer={member.isViewer}
      meta={groupMemberRoleCaption(member) ?? undefined}
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
  members,
  canInvite,
  onInvite,
}: {
  members: GroupMember[];
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
            <GroupMemberRow key={member.userId} member={member} />
          ))}
        </RowList>
      )}

      {canInvite ? <InviteBlock onInvite={onInvite} /> : null}
    </div>
  );
}
