"use client";

import { useState } from "react";
import { Users } from "lucide-react";

import { EmptyState } from "~/components/common/empty-state";
import { FormStrip } from "~/components/temba/form-strip";
import { LevelCell } from "~/components/temba/level-cell";
import type { ResultMarkVariant } from "~/components/temba/result-mark";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  filterGroupMembersByName,
  groupHomeShowsMemberSearch,
  groupMemberRoleCaption,
} from "~/lib/group-home-chrome";
import { initials } from "~/lib/initials";
import type { LevelBand } from "~/lib/level-bands";
import { cn } from "~/lib/utils";

/** Design 06c draws four marks per member; the derivation returns up to five. */
const MEMBER_FORM_MARKS = 4;

type GroupMember = {
  userId: string;
  name: string;
  isViewer: boolean;
  isOrganizer: boolean;
  joinedAt: Date | string | null;
  formMarks: ResultMarkVariant[];
  levelBand: LevelBand | null;
  levelProvisional: boolean;
};

const CARD = "border-rule overflow-hidden rounded-[14px] border";

function MemberRow({ member }: { member: GroupMember }) {
  const caption = groupMemberRoleCaption(member);

  return (
    <li className="border-rule flex items-center gap-3.5 border-t px-5 py-[18px] first:border-t-0">
      <span
        aria-hidden="true"
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-[10px] text-[13px] font-semibold",
          member.isViewer ? "bg-ink text-paper" : "border-rule border",
        )}
      >
        {initials(member.name)}
      </span>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-[15px]",
            member.isViewer && "font-semibold",
          )}
        >
          {member.isViewer ? "You" : member.name}
        </p>
        {caption ? (
          <p className="text-eyebrow text-muted-foreground truncate">
            {caption}
          </p>
        ) : null}
      </div>

      <FormStrip
        marks={member.formMarks.slice(-MEMBER_FORM_MARKS)}
        size={14}
        gap={4}
        className="shrink-0"
      />

      <LevelCell
        band={member.levelBand}
        provisional={member.levelProvisional}
        className="w-12 shrink-0"
      />
    </li>
  );
}

function InviteBlock({ onInvite }: { onInvite: () => void }) {
  return (
    <section className="border-rule rounded-[14px] border p-5">
      <h2 className="text-[15px] font-semibold">Invite players</h2>
      <p className="text-meta text-muted-foreground mt-1.5">
        Invite players and the standing fills in as their matches are rated.
      </p>
      <Button
        type="button"
        onClick={onInvite}
        className="bg-ink text-paper hover:bg-dimrule mt-4 h-[46px] w-full rounded-[12px] font-semibold"
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
        <ul className={CARD}>
          {visible.map((member) => (
            <MemberRow key={member.userId} member={member} />
          ))}
        </ul>
      )}

      {canInvite ? <InviteBlock onInvite={onInvite} /> : null}
    </div>
  );
}
