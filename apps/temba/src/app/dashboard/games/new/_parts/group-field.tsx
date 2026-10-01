"use client";

import { Check, Search } from "lucide-react";
import * as React from "react";

import { SectionHeading } from "~/app/dashboard/games/new/_parts/section-heading";
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
} from "~/lib/create-game-flow";

export type CreateGroup = {
  id: string;
  name: string | null;
  communityName: string | null;
};

function groupOptionLabel(group: CreateGroup) {
  const name = group.name ?? "Untitled Group";
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
  return (
    <RovingRadioGroup
      aria-label={labelledBy ? undefined : "Group"}
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
            {groupOptionLabel(group)}
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
  const [groupsOpen, setGroupsOpen] = React.useState(false);
  const [groupQuery, setGroupQuery] = React.useState("");
  const visibleGroups = visibleCreateGroups(groups, selectedGroupId);
  const filteredGroups = groups.filter((group) =>
    groupOptionLabel(group)
      .toLowerCase()
      .includes(groupQuery.trim().toLowerCase()),
  );

  return (
    <section className="flex flex-col gap-3">
      <SectionHeading id="game-group-label" title="Group" meta="Required" />
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
          All {groups.length} groups
        </ChoiceChip>
      ) : null}
      <FieldError id="game-group-error">{groupError}</FieldError>
      <Sheet open={groupsOpen} onOpenChange={setGroupsOpen}>
        <SheetContent side="bottom" className="max-h-[85svh]">
          <SheetHeader>
            <SheetTitle>All {groups.length} groups</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-3 overflow-y-auto px-4 pb-4">
            <Input
              value={groupQuery}
              onChange={(event) => {
                setGroupQuery(event.target.value);
              }}
              placeholder="Search groups"
              aria-label="Search groups"
            />
            {filteredGroups.length === 0 ? (
              <p className="text-muted-foreground text-body">
                No groups match.
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
