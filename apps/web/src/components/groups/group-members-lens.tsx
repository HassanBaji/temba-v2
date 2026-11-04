"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDownUp, Check, ChevronDown } from "lucide-react";

import type {
  GroupMemberFilter,
  GroupMemberFilterChip,
  GroupMemberSort,
  GroupMemberSortOption,
} from "@repo/domain/group-members-table";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { useMessages } from "~/components/locale-provider";
import { ChoiceChip } from "~/components/temba/choice-chip";
import { RovingRadioGroup } from "~/components/ui/roving-radio-group";
import {
  EMPTY_MEMBER_LENS,
  readMemberLens,
  writeMemberLens,
  type StoredMemberLens,
} from "~/lib/member-lens";
import { cardFrame } from "~/lib/page-layout";
import { cn } from "~/lib/utils";

const SCROLL_LEAD = 60;

/** The Members tab sort and filter, remembered per Group on this device. */
export function useMemberLens(groupId: string) {
  const [lens, setLens] = useState<StoredMemberLens>(EMPTY_MEMBER_LENS);
  const latest = useRef(lens);
  latest.current = lens;

  useEffect(() => {
    setLens(readMemberLens(groupId));
  }, [groupId]);

  const update = useCallback(
    (patch: Partial<StoredMemberLens>) => {
      const next = { ...latest.current, ...patch };
      latest.current = next;
      setLens(next);
      writeMemberLens(groupId, next);
    },
    [groupId],
  );

  return {
    lens,
    setSort: useCallback((sort: GroupMemberSort) => update({ sort }), [update]),
    setFilter: useCallback(
      (filter: GroupMemberFilter) => update({ filter }),
      [update],
    ),
  };
}

/**
 * The chip row under search (design "Group members" 4a): the sort chip opens
 * the sort dialog, the filters are single-select with live counts. The row
 * scrolls sideways and keeps the picked filter in view.
 */
export function GroupMembersLensRow({
  sortLabel,
  filters,
  onOpenSort,
  onPickFilter,
}: {
  sortLabel: string;
  filters: GroupMemberFilterChip[];
  onOpenSort: () => void;
  onPickFilter: (filter: GroupMemberFilter) => void;
}) {
  const m = useMessages();
  const lens = m.group.members.lens;
  const row = useRef<HTMLDivElement>(null);
  const picked = filters.find((chip) => chip.selected)?.id;

  useEffect(() => {
    const container = row.current;
    const chip = container?.querySelector<HTMLElement>('[aria-checked="true"]');
    if (
      !container ||
      !chip ||
      getComputedStyle(container).direction === "rtl"
    ) {
      return;
    }
    const start = chip.offsetLeft - container.offsetLeft;
    const end = start + chip.offsetWidth;
    if (
      start < container.scrollLeft ||
      end > container.scrollLeft + container.clientWidth
    ) {
      container.scrollLeft = Math.max(0, start - SCROLL_LEAD);
    }
  }, [picked]);

  return (
    <div
      ref={row}
      className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <button
        type="button"
        onClick={onOpenSort}
        aria-label={lens.sort.chip(sortLabel)}
        aria-haspopup="dialog"
        className="border-ink bg-paper text-ink hover:bg-wash focus-visible:ring-ring/50 text-body inline-flex min-h-11 shrink-0 items-center gap-[7px] whitespace-nowrap rounded-md border pe-2.5 ps-3 outline-none focus-visible:ring-[3px]"
      >
        <ArrowDownUp aria-hidden="true" className="size-[15px]" />
        {sortLabel}
        <ChevronDown
          aria-hidden="true"
          className="text-muted-foreground size-[15px]"
        />
      </button>
      <span aria-hidden="true" className="bg-rule h-6 w-px shrink-0" />
      <RovingRadioGroup
        aria-label={lens.filters.label}
        className="flex shrink-0 gap-2"
      >
        {filters.map((chip) => (
          <ChoiceChip
            key={chip.id}
            role="radio"
            selected={chip.selected}
            aria-label={chip.accessibilityLabel}
            onClick={() => onPickFilter(chip.id)}
            className="shrink-0 gap-[7px] whitespace-nowrap px-3"
          >
            {chip.label}
            <span
              aria-hidden="true"
              className={cn(
                "font-mono text-[11px] font-normal",
                chip.selected ? "text-dim" : "text-muted-foreground",
              )}
            >
              {chip.count}
            </span>
          </ChoiceChip>
        ))}
      </RovingRadioGroup>
    </div>
  );
}

/** Design "Group members" 4b. Picking a sort closes the dialog. */
export function GroupMembersSortDialog({
  open,
  onOpenChange,
  options,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: GroupMemberSortOption[];
  onPick: (sort: GroupMemberSort) => void;
}) {
  const m = useMessages().group.members.lens.sort;
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{m.title}</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>
        <div className="mx-4 mb-4 flex flex-col gap-4 md:mx-0 md:mb-0">
          <RovingRadioGroup
            aria-label={m.title}
            className={cn(cardFrame, "divide-rule flex flex-col divide-y")}
          >
            {options.map((option) => (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={option.selected}
                onClick={() => {
                  onPick(option.id);
                  onOpenChange(false);
                }}
                className="bg-paper hover:bg-wash focus-visible:ring-ring/50 flex min-h-[60px] w-full items-center gap-3 px-4 py-3 text-start outline-none focus-visible:ring-[3px] focus-visible:ring-inset"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-body font-semibold">
                    {option.label}
                  </span>
                  <span className="text-meta text-muted-foreground">
                    {option.hint}
                  </span>
                </span>
                {option.selected ? (
                  <span
                    aria-hidden="true"
                    className="bg-ink text-paper flex size-6 shrink-0 items-center justify-center rounded-full"
                  >
                    <Check className="size-3.5" />
                  </span>
                ) : (
                  <span
                    aria-hidden="true"
                    className="border-rule size-6 shrink-0 rounded-full border"
                  />
                )}
              </button>
            ))}
          </RovingRadioGroup>
          <p className="text-eyebrow text-muted-foreground">{m.footnote}</p>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
