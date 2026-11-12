"use client";

import { Check, Search } from "lucide-react";
import * as React from "react";

import { SectionHeading } from "~/app/dashboard/games/new/_parts/section-heading";
import { useMessages } from "~/components/locale-provider";
import { ChoiceChip } from "~/components/temba/choice-chip";
import { FieldDescription, FieldError } from "~/components/ui/field";
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
  venueName: string | null;
  sport?: string | null;
  verified: boolean;
};

function groupOptionLabel(group: CreateGroup, m: Messages) {
  const name = group.name ?? m.group.untitled;
  if (!group.venueName) {
    return name;
  }
  return `${name} · ${group.venueName}`;
}

/** The Public game chip beside the Groups: a Public Game has no Group. */
export type PublicGameChoice = {
  label: string;
  note: string;
  selected: boolean;
  onSelect: () => void;
};

function GroupChips({
  groups,
  selectedGroupId,
  labelledBy,
  publicChoice,
  onSelect,
}: {
  groups: readonly CreateGroup[];
  selectedGroupId: string;
  labelledBy?: string;
  publicChoice?: PublicGameChoice;
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
      {publicChoice ? (
        <ChoiceChip
          role="radio"
          selected={publicChoice.selected}
          aria-describedby={
            publicChoice.selected ? "game-group-public-copy" : undefined
          }
          onClick={publicChoice.onSelect}
        >
          {publicChoice.selected ? (
            <Check aria-hidden="true" className="size-3.5" />
          ) : null}
          {publicChoice.label}
        </ChoiceChip>
      ) : null}
    </RovingRadioGroup>
  );
}

export function GroupField({
  groups,
  selectedGroupId,
  groupError,
  publicChoice,
  onGroupId,
}: {
  groups: readonly CreateGroup[];
  selectedGroupId: string;
  groupError?: string;
  publicChoice?: PublicGameChoice;
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
          publicChoice={publicChoice}
          onSelect={onGroupId}
        />
      </div>
      {publicChoice?.selected ? (
        <FieldDescription id="game-group-public-copy">
          {publicChoice.note}
        </FieldDescription>
      ) : null}
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
