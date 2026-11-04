"use client";

import { Check, Search } from "lucide-react";
import * as React from "react";

import { SectionHeading } from "~/app/dashboard/games/new/_parts/section-heading";
import { useMessages } from "~/components/locale-provider";
import { ChoiceChip } from "~/components/temba/choice-chip";
import { FieldError } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { RovingRadioGroup } from "~/components/ui/roving-radio-group";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import {
  visibleCreateGroups,
  VISIBLE_GROUP_CHIP_COUNT,
} from "@repo/domain/create-game-flow";
import type { Messages } from "@repo/i18n/messages";

export type CreateGroup = {
  id: string;
  name: string | null;
  communityName: string | null;
  sport?: string | null;
  verified: boolean;
};

function groupOptionLabel(group: CreateGroup, m: Messages) {
  const name = group.name ?? m.group.untitled;
  if (!group.communityName) {
    return name;
  }
  return `${name} · ${group.communityName}`;
}

function GroupChips({
  groups,
  selectedGroupId,
  labelledBy,
  onSelect,
}: {
  groups: readonly CreateGroup[];
  selectedGroupId: string;
  labelledBy?: string;
  onSelect: (groupId: string) => void;
}) {
  const m = useMessages();
  return (
    <RovingRadioGroup
      aria-label={labelledBy ? undefined : m.invite.kind.group}
      aria-labelledby={labelledBy}
      className="flex flex-wrap gap-2"
    >
      {groups.map((group) => {
        const selected = group.id === selectedGroupId;
        return (
          <ChoiceChip
            key={group.id}
            role="radio"
            selected={selected}
            onClick={() => {
              onSelect(group.id);
            }}
          >
            {selected ? (
              <Check aria-hidden="true" className="size-3.5" />
            ) : null}
            {groupOptionLabel(group, m)}
          </ChoiceChip>
        );
      })}
    </RovingRadioGroup>
  );
}

export function GroupField({
  groups,
  selectedGroupId,
  groupError,
  onGroupId,
}: {
  groups: readonly CreateGroup[];
  selectedGroupId: string;
  groupError?: string;
  onGroupId: (groupId: string) => void;
}) {
  const m = useMessages();
  const c = m.webDashboard.createGame;
  const [groupsOpen, setGroupsOpen] = React.useState(false);
  const [groupQuery, setGroupQuery] = React.useState("");
  const visibleGroups = visibleCreateGroups(groups, selectedGroupId);
  const filteredGroups = groups.filter((group) =>
    groupOptionLabel(group, m)
      .toLowerCase()
      .includes(groupQuery.trim().toLowerCase()),
  );

  return (
    <section className="flex flex-col gap-3">
      <SectionHeading
        id="game-group-label"
        title={m.invite.kind.group}
        meta={m.common.required}
      />
      <div
        id="game-group"
        tabIndex={-1}
        aria-invalid={groupError ? true : undefined}
        aria-describedby={groupError ? "game-group-error" : undefined}
        className="outline-none"
      >
        <GroupChips
          groups={visibleGroups}
          selectedGroupId={selectedGroupId}
          labelledBy="game-group-label"
          onSelect={onGroupId}
        />
      </div>
      {groups.length > VISIBLE_GROUP_CHIP_COUNT ? (
        <ChoiceChip
          dashed
          onClick={() => {
            setGroupQuery("");
            setGroupsOpen(true);
          }}
        >
          <Search aria-hidden="true" className="size-3.5" />
          {c.allGroups(groups.length)}
        </ChoiceChip>
      ) : null}
      <FieldError id="game-group-error">{groupError}</FieldError>
      <Sheet open={groupsOpen} onOpenChange={setGroupsOpen}>
        <SheetContent side="bottom" className="max-h-[85svh]">
          <SheetHeader>
            <SheetTitle>{c.allGroups(groups.length)}</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-3 overflow-y-auto px-4 pb-4">
            <Input
              value={groupQuery}
              onChange={(event) => {
                setGroupQuery(event.target.value);
              }}
              placeholder={c.searchGroups}
              aria-label={c.searchGroups}
            />
            {filteredGroups.length === 0 ? (
              <p className="text-muted-foreground text-body">
                {c.noGroupsMatch}
              </p>
            ) : (
              <GroupChips
                groups={filteredGroups}
                selectedGroupId={selectedGroupId}
                onSelect={(groupId) => {
                  onGroupId(groupId);
                  setGroupsOpen(false);
                }}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </section>
  );
}
