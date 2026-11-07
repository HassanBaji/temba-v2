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
import { FootballInfoRows } from "~/components/games/football-info-rows";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { Hatch } from "~/components/ui/hatch";
import { SelectCard } from "~/components/ui/select-card";
import { formatGameStart } from "@repo/domain/format-game-start";
import {
  gameInviteGroupCard,
  gameInviteGroupJoinedCopy,
  gameInviteGroupLandingCopy,
  gameInviteGroupRequestCard,
  gameInviteGroupSheetCopy,
  type GameInviteGroup,
  type GameInviteGroupChoice,
} from "@repo/domain/invites";

const OPTION_ICONS = {
  with_seat: CalendarPlus,
  group_only: Users,
} as const;

function GroupRows({
  group,
  rangeLabel,
}: {
  group: GameInviteGroup;
  rangeLabel: string | null;
}) {
  const m = useMessages();
  const locale = useLocale();
  const card = gameInviteGroupCard(group, locale);
  const rows = [
    { label: m.mobileInvite.link.group.groupRow, value: card.meta },
  ];
  if (rangeLabel) {
    rows.push({ label: m.common.level, value: rangeLabel });
  }
  return <FootballInfoRows rows={rows} />;
}

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

/** Design 1a: the Game as the hook, the decision about the Group. */
export function GameLinkGroupLanding({
  group,
  gameName,
  rangeLabel,
  openSeats,
  pending,
  dialogOpen,
  onDialogOpenChange,
  onChoose,
}: {
  group: GameInviteGroup;
  gameName: string;
  rangeLabel: string | null;
  openSeats: number;
  pending: GameInviteGroupChoice | null;
  dialogOpen: boolean;
  onDialogOpenChange: (open: boolean) => void;
  onChoose: (choice: GameInviteGroupChoice) => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  const copy = gameInviteGroupLandingCopy(group, openSeats, locale);
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h1 className="text-title font-semibold">
          {m.invite.link.joinLabel(gameName)}
        </h1>
        <p className="text-body text-muted-foreground">{copy.heroNote}</p>
      </div>
      <GroupRows group={group} rangeLabel={rangeLabel} />
      <div className="border-rule bg-paper flex items-center gap-3 rounded-xl border p-4">
        <p className="text-meta text-muted-foreground flex-1">{copy.note}</p>
        <Button
          variant="outline"
          size="sm"
          disabled={pending != null}
          onClick={() => onChoose("group_only")}
        >
          {copy.joinGroupLabel}
        </Button>
      </div>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          {copy.barTitle ? (
            <p className="text-body font-semibold">{copy.barTitle}</p>
          ) : null}
          <p className="text-meta text-muted-foreground">{copy.barSubline}</p>
        </div>
        <Button
          className="min-h-11"
          disabled={pending != null}
          onClick={() => onDialogOpenChange(true)}
        >
          {copy.joinGameLabel}
        </Button>
      </div>
      <GroupJoinDialog
        open={dialogOpen}
        group={group}
        pending={pending}
        onChoose={onChoose}
        onOpenChange={onDialogOpenChange}
      />
    </div>
  );
}

/** Design 1f: the request is with the Organizers; the seat may be held. */
export function GameLinkGroupRequested({
  group,
  gameName,
  rangeLabel,
  withdrawPending,
  onWithdraw,
}: {
  group: GameInviteGroup;
  gameName: string;
  rangeLabel: string | null;
  withdrawPending: boolean;
  onWithdraw: (requestId: string) => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  const request = group.pendingRequest;
  const heldLabel = request?.seatHeldUntil
    ? formatGameStart(request.seatHeldUntil, locale)
    : null;
  const copy = gameInviteGroupRequestCard(group, heldLabel, locale);
  return (
    <div className="space-y-4">
      <h1 className="text-title font-semibold">
        {m.invite.link.joinLabel(gameName)}
      </h1>
      <div className="border-rule bg-paper divide-rule divide-y overflow-hidden rounded-xl border">
        <div className="flex items-center gap-3 p-4">
          <span className="relative size-11 shrink-0 overflow-hidden rounded-full">
            <Hatch className="absolute inset-0 rounded-full" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-lead font-semibold">{copy.title}</p>
            <p className="text-meta text-muted-foreground">
              {copy.description}
            </p>
          </div>
        </div>
        {copy.sharedByValue ? (
          <div className="flex justify-between gap-4 px-4 py-3.5">
            <span className="text-muted-foreground">{copy.sharedByLabel}</span>
            <span className="text-end">{copy.sharedByValue}</span>
          </div>
        ) : null}
        {request ? (
          <div className="flex justify-center p-3">
            <Button
              variant="outline"
              disabled={withdrawPending}
              onClick={() => onWithdraw(request.id)}
            >
              {copy.withdrawLabel}
            </Button>
          </div>
        ) : null}
      </div>
      <GroupRows group={group} rangeLabel={rangeLabel} />
      <div>
        <p className="text-body font-semibold">{copy.barTitle}</p>
        <p className="text-meta text-muted-foreground">{copy.barSubline}</p>
      </div>
    </div>
  );
}

/** Design 1d: in the Group now, the seat still open. */
export function GameLinkGroupJoined({
  group,
  openSeats,
  groupHref,
}: {
  group: GameInviteGroup;
  openSeats: number;
  groupHref: string;
}) {
  const locale = useLocale();
  const copy = gameInviteGroupJoinedCopy(group, openSeats, locale);
  return (
    <div className="border-rule bg-paper space-y-2 rounded-xl border p-4">
      <p className="text-lead font-semibold">{copy.title}</p>
      <p className="text-meta text-muted-foreground">{copy.description}</p>
      <Button variant="outline" size="sm" asChild>
        <a href={groupHref}>{copy.openGroupLabel}</a>
      </Button>
    </div>
  );
}
