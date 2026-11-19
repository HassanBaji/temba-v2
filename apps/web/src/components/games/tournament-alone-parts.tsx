"use client";

import { PencilIcon, ShareIcon, ShuffleIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import type { SideChoice } from "@repo/domain/padel-sides";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import { Surface } from "~/components/ui/surface";
import { globalFormErrorMessage } from "~/lib/form-mutation-error";
import { cn } from "~/lib/utils";

import { SideOptionCards } from "./padel-side-picker";
import { InitialsMark } from "./tournament-round-parts";

export function aloneMakeTeamsHref(gameId: string) {
  return `/dashboard/games/${gameId}/make-teams`;
}

export function aloneShareTeamsHref(gameId: string) {
  return `/dashboard/games/${gameId}/share-teams`;
}

/** The hero's sport tag, on ink. */
export function HeroPadelTag() {
  const m = useMessages();
  return (
    <span className="border-dimrule text-dim text-eyebrow rounded-sm border px-2 py-1 uppercase tracking-[0.1em]">
      {m.common.padel}
    </span>
  );
}

const ICON_BOX_INK =
  "bg-raised border-dimrule inline-flex size-10 shrink-0 items-center justify-center rounded-md border";

/** 2c: the Organizer's card before the teams are posted. */
export function AloneOrganizerCard({
  gameId,
  taken,
  cap,
  canMakeTeams,
  minPlayers,
}: {
  gameId: string;
  taken: number;
  cap: number;
  canMakeTeams: boolean;
  minPlayers: number;
}) {
  const m = useMessages().aloneTeams.organizerCard;
  const full = cap > 0 && taken >= cap;
  return (
    <Surface
      tone="ink"
      className="rounded-card flex flex-wrap items-center gap-3 p-4"
    >
      <span className={ICON_BOX_INK}>
        <UsersIcon aria-hidden="true" className="size-[18px]" />
      </span>
      <div className="min-w-[10rem] flex-1">
        <p className="text-body font-semibold leading-snug">
          {full ? m.allIn(taken) : m.someIn(taken, cap)}
        </p>
        <p className="text-dim text-meta">
          {canMakeTeams ? m.body : m.needMore(minPlayers, taken)}
        </p>
      </div>
      {canMakeTeams ? (
        <Button variant="inverse" className="font-semibold" asChild>
          <Link href={aloneMakeTeamsHref(gameId)}>{m.action}</Link>
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline-inverse"
          className="font-semibold"
          disabled
        >
          {m.action}
        </Button>
      )}
    </Surface>
  );
}

/** 2a: what everyone else sees before the teams are posted. */
export function AloneWaitingCard({ cap }: { cap: number }) {
  const m = useMessages().aloneTeams.waiting;
  return (
    <div className="border-rule rounded-card relative flex items-start gap-3 overflow-hidden border border-dashed p-4">
      <span aria-hidden="true" className="hatch absolute inset-0 opacity-40" />
      <span className="border-rule bg-paper relative inline-flex size-10 shrink-0 items-center justify-center rounded-md border">
        <ShuffleIcon aria-hidden="true" className="size-[18px]" />
      </span>
      <div className="relative min-w-0">
        <p className="text-body font-semibold">{m.title}</p>
        <p className="text-muted-foreground text-meta leading-relaxed">
          {m.body(cap)}
        </p>
      </div>
    </div>
  );
}

/** 3b: the Organizer's card once the teams are posted, until the draw. */
export function AlonePostedOrganizerCard({
  gameId,
  title,
  onOpenDraw,
  onEditTeams,
}: {
  gameId: string;
  title: string;
  onOpenDraw: () => void;
  onEditTeams?: () => void;
}) {
  const m = useMessages().aloneTeams.posted;
  const editTeams = useMessages().editTeams.action;
  return (
    <div className="space-y-2">
      <Surface
        tone="ink"
        className="rounded-card flex flex-wrap items-center gap-3 p-4"
      >
        <span className={ICON_BOX_INK}>
          <ShuffleIcon aria-hidden="true" className="size-[18px]" />
        </span>
        <div className="min-w-[10rem] flex-1">
          <p className="text-body font-semibold leading-snug">{title}</p>
          <p className="text-dim text-meta">{m.organizerBody}</p>
        </div>
        <Button
          type="button"
          variant="inverse"
          className="font-semibold"
          onClick={onOpenDraw}
        >
          {m.openDraw}
        </Button>
      </Surface>
      <div className={cn("grid gap-2", onEditTeams && "grid-cols-2")}>
        <Button variant="outline" className="min-h-11 font-semibold" asChild>
          <Link href={aloneShareTeamsHref(gameId)}>
            <ShareIcon aria-hidden="true" />
            {m.share}
          </Link>
        </Button>
        {onEditTeams ? (
          <Button
            type="button"
            variant="outline"
            className="min-h-11 font-semibold"
            onClick={onEditTeams}
          >
            <PencilIcon aria-hidden="true" />
            {editTeams}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/** 3c: who the player is with, once the teams are posted. */
export function AlonePlayerCard({
  viewerName,
  title,
  body,
}: {
  viewerName: string;
  title: string;
  body: string;
}) {
  return (
    <div className="border-rule rounded-card flex items-start gap-3 border p-4">
      <InitialsMark name={viewerName} isViewer className="size-10" />
      <div className="min-w-0">
        <p dir="auto" className="text-body font-semibold">
          {title}
        </p>
        <p className="text-muted-foreground text-meta leading-relaxed">
          {body}
        </p>
      </div>
    </div>
  );
}

/** 2b: Take a seat on an Alone-only Social: only the side is left to pick. */
export function AloneJoinSheet({
  open,
  onOpenChange,
  pending,
  error,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  error: { message: string; data?: { zodError?: unknown } | null } | null;
  onSubmit: (side: "left" | "right" | undefined) => void;
}) {
  const m = useMessages().aloneTeams.join;
  const [side, setSide] = React.useState<SideChoice>("either");

  React.useEffect(() => {
    if (open) {
      setSide("either");
    }
  }, [open]);

  const sideLabel = side === "left" ? m.left : side === "right" ? m.right : "";
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-y-auto p-0 sm:max-w-[460px]">
        <ResponsiveDialogHeader className="px-[22px] pb-0 pt-[22px] text-start group-data-[vaul-drawer-direction=bottom]/drawer-content:text-start">
          <ResponsiveDialogTitle className="text-h2 tracking-[-0.02em]">
            {m.title}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription className="text-meta">
            {m.body}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <form
          className="flex flex-col gap-5 px-[22px] pb-[22px] pt-5"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(side === "either" ? undefined : side);
          }}
        >
          <section className="space-y-2.5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-meta text-muted-foreground">{m.side}</p>
              <p className="text-meta text-muted-foreground">{m.optional}</p>
            </div>
            <SideOptionCards
              team={null}
              value={side}
              disabled={pending}
              onChange={setSide}
            />
            <p className="text-muted-foreground text-meta">{m.sideHint}</p>
          </section>
          <div className="border-rule rounded-card text-body flex items-baseline justify-between gap-3 border px-5 py-4">
            <span className="text-muted-foreground">{m.partner}</span>
            <span className="text-end">{m.partnerValue}</span>
          </div>
          <FormErrorSummary message={globalFormErrorMessage(error)} />
          <Button
            type="submit"
            size="lg"
            className="w-full font-semibold"
            pending={pending}
          >
            {sideLabel ? m.submitWithSide(sideLabel) : m.submit}
          </Button>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

/** The footer of 2a: seats left and Take a seat, or the Waitlist when full. */
export function AloneJoinBar({
  seatsLeft,
  canRegister,
  pending,
  onJoin,
}: {
  seatsLeft: number;
  canRegister: boolean;
  pending: boolean;
  onJoin: () => void;
}) {
  const messages = useMessages();
  const m = messages.aloneTeams.join;
  return (
    <div className="border-rule bg-paper lg:rounded-card fixed inset-x-0 bottom-0 z-30 border-t px-4 py-3 lg:static lg:border">
      <div className="mx-auto flex max-w-lg items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-body font-semibold">{m.seatsLeft(seatsLeft)}</p>
          <p className="text-muted-foreground text-meta truncate">{m.footer}</p>
        </div>
        <Button
          type="button"
          size="lg"
          disabled={pending}
          aria-busy={pending}
          onClick={onJoin}
        >
          {canRegister ? m.submit : messages.game.cta.joinWaitlist}
        </Button>
      </div>
    </div>
  );
}
