"use client";

import { CalendarPlus, Info, Users } from "lucide-react";
import * as React from "react";

import { EntityMonogram } from "~/components/common/entity-monogram";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { useLocale } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { SelectCard } from "~/components/ui/select-card";
import {
  gameInviteGroupCard,
  gameInviteGroupSheetCopy,
  type GameInviteGroup,
  type GameInviteGroupChoice,
} from "@repo/domain/invites";

const OPTION_ICONS = {
  with_seat: CalendarPlus,
  group_only: Users,
} as const;

function GroupCard({ group }: { group: GameInviteGroup }) {
  const locale = useLocale();
  const card = gameInviteGroupCard(group, locale);
  return (
    <div className="border-rule bg-paper divide-rule divide-y overflow-hidden rounded-xl border">
      <div className="flex items-center gap-3 p-4">
        <EntityMonogram name={card.name} image={group.imageUrl} size="lg" />
        <div className="min-w-0 flex-1">
          {card.sport ? (
            <p className="text-eyebrow text-muted-foreground">{card.sport}</p>
          ) : null}
          <p className="text-lead truncate font-semibold">{card.name}</p>
          <p className="text-meta text-muted-foreground">{card.meta}</p>
        </div>
      </div>
      <p className="text-meta text-muted-foreground truncate px-4 py-2.5">
        {card.memberLine}
      </p>
    </div>
  );
}

/** The Group question a non-member answers before taking a seat (design "Join via link" 1b, 1c). */
export function GroupJoinDialog({
  open,
  group,
  pending,
  onChoose,
  onOpenChange,
}: {
  open: boolean;
  group: GameInviteGroup;
  pending: GameInviteGroupChoice | null;
  onChoose: (choice: GameInviteGroupChoice) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const locale = useLocale();
  const copy = gameInviteGroupSheetCopy(group, locale);
  const busy = pending != null;
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[460px]">
        <ResponsiveDialogHeader className="px-[22px] pb-0 pt-[22px] text-start group-data-[vaul-drawer-direction=bottom]/drawer-content:text-start">
          <ResponsiveDialogTitle className="text-h2 tracking-[-0.02em]">
            {copy.title}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>{copy.lead}</ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <div className="flex flex-col gap-3 overflow-y-auto px-[22px] pb-[22px] pt-4">
          <GroupCard group={group} />
          <div className="flex flex-col gap-2.5 pt-1">
            {copy.options.map((option, index) => {
              const Icon = OPTION_ICONS[option.choice];
              return (
                <SelectCard
                  key={option.choice}
                  selected={index === 0}
                  icon={<Icon aria-hidden="true" className="size-5" />}
                  title={option.title}
                  description={option.description}
                  disabled={busy}
                  aria-busy={pending === option.choice}
                  onClick={() => onChoose(option.choice)}
                />
              );
            })}
          </div>
          {copy.dismissLabel ? (
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              {copy.dismissLabel}
            </Button>
          ) : null}
          {copy.note ? (
            <div className="border-rule bg-paper flex items-start gap-2.5 rounded-xl border p-4">
              <Info
                aria-hidden="true"
                className="text-muted-foreground mt-0.5 size-4 shrink-0"
              />
              <p className="text-meta text-muted-foreground">{copy.note}</p>
            </div>
          ) : null}
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
