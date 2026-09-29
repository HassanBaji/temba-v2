"use client";

import { X } from "lucide-react";
import * as React from "react";

import { ConfirmDialog } from "~/components/common/confirm-dialog";
import { TournamentPoolDrawPanel } from "~/components/games/tournament-pool-draw-panel";
import { Button } from "~/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "~/components/ui/drawer";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import { globalFormErrorMessage } from "~/lib/form-mutation-error";
import { ORGANIZER_EYEBROW } from "~/lib/tournament-half-teams";
import {
  DRAW_DRAWER_TITLE,
  DRAW_ENTRY_ACTION_LABEL,
  UNDO_POOL_DRAW_ACTION,
  UNDO_POOL_DRAW_CONFIRM_COPY,
  UNDO_POOL_DRAW_CONFIRM_LABEL,
  UNDO_POOL_DRAW_CONFIRM_TITLE,
  drawDrawerLead,
  drawEntryStateLine,
  drawEntryTitle,
  type DraftPoolTeam,
} from "~/lib/tournament-pool-draw";

export function TournamentDrawEntry({
  completeTeams,
  teamCount,
  hasDraft,
  onOpen,
}: {
  completeTeams: number;
  teamCount: number;
  hasDraft: boolean;
  onOpen: () => void;
}) {
  return (
    <div className="border-rule rounded-[14px] border p-5">
      <p className="text-eyebrow text-muted-foreground uppercase tracking-[0.06em]">
        {ORGANIZER_EYEBROW}
      </p>
      <p className="mt-2 text-[15px] font-semibold">
        {drawEntryTitle(hasDraft)}
      </p>
      <p className="text-muted-foreground mt-1.5 text-[13px] leading-relaxed">
        {drawEntryStateLine(completeTeams, teamCount)}
      </p>
      <button
        type="button"
        onClick={onOpen}
        className="border-ink mt-4 flex h-[46px] min-h-11 w-full items-center justify-center rounded-[12px] border text-sm font-semibold"
      >
        {DRAW_ENTRY_ACTION_LABEL}
      </button>
    </div>
  );
}

export function TournamentUndoPoolDraw({
  undoPending,
  undoError,
  onUndo,
}: {
  undoPending: boolean;
  undoError: { message: string; data?: { zodError?: unknown } | null } | null;
  onUndo: () => void | Promise<void>;
}) {
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  return (
    <div className="space-y-3">
      <FormErrorSummary message={globalFormErrorMessage(undoError)} />
      <Button
        type="button"
        variant="outline"
        className="min-h-11 w-full"
        disabled={undoPending}
        aria-busy={undoPending}
        onClick={() => setConfirmOpen(true)}
      >
        {undoPending ? "Undoing…" : UNDO_POOL_DRAW_ACTION}
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={UNDO_POOL_DRAW_CONFIRM_TITLE}
        description={UNDO_POOL_DRAW_CONFIRM_COPY}
        confirmLabel={UNDO_POOL_DRAW_CONFIRM_LABEL}
        pending={undoPending}
        onConfirm={async () => {
          try {
            await onUndo();
          } catch {
            // The failure is already shown by FormErrorSummary above.
          }
        }}
      />
    </div>
  );
}

export function TournamentDrawDrawer({
  open,
  onOpenChange,
  gameTeams,
  teamCount,
  storedRoundCount,
  windowStart,
  windowEnd,
  matchMinutes,
  courtNames,
  drawPending,
  drawError,
  onDraw,
  postPending,
  postError,
  onPost,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameTeams: readonly DraftPoolTeam[];
  teamCount: number | null | undefined;
  storedRoundCount: number | null | undefined;
  windowStart: Date | string | null | undefined;
  windowEnd: Date | string | null | undefined;
  matchMinutes: number | null;
  courtNames: readonly string[];
  drawPending: boolean;
  drawError: { message: string; data?: { zodError?: unknown } | null } | null;
  onDraw: () => void | Promise<void>;
  postPending: boolean;
  postError: { message: string; data?: { zodError?: unknown } | null } | null;
  onPost: () => void | Promise<void>;
}) {
  const busy = drawPending || postPending;

  function close() {
    if (busy) {
      return;
    }
    onOpenChange(false);
  }

  async function confirmPost() {
    try {
      await onPost();
      onOpenChange(false);
    } catch {
      return;
    }
  }

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        if (busy && !next) {
          return;
        }
        onOpenChange(next);
      }}
    >
      <DrawerContent className="mt-0 h-dvh max-h-dvh rounded-none p-0 data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:max-h-dvh [&>div.bg-muted]:hidden">
        <div className="flex h-full min-h-0 flex-col">
          <div className="border-rule shrink-0 px-[22px] pb-0 pt-[22px]">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={close}
                disabled={busy}
                className="border-rule text-ink focus-visible:ring-ring/50 flex size-11 min-h-11 min-w-11 items-center justify-center rounded-[10px] border outline-none focus-visible:ring-[3px] disabled:opacity-50"
                aria-label="Close"
              >
                <X aria-hidden="true" className="size-5" strokeWidth={2} />
              </button>
              <p className="text-eyebrow text-muted-foreground uppercase tracking-[0.06em]">
                {ORGANIZER_EYEBROW}
              </p>
            </div>
            <DrawerTitle className="font-expanded mt-6 text-[38px] leading-none tracking-[-0.03em]">
              {DRAW_DRAWER_TITLE}
            </DrawerTitle>
            <DrawerDescription className="text-ink mt-2.5 text-[15px] leading-relaxed">
              {drawDrawerLead(teamCount)}
            </DrawerDescription>
          </div>
          <TournamentPoolDrawPanel
            gameTeams={gameTeams}
            storedRoundCount={storedRoundCount}
            windowStart={windowStart}
            windowEnd={windowEnd}
            matchMinutes={matchMinutes}
            courtNames={courtNames}
            drawPending={drawPending}
            drawError={drawError}
            onDraw={onDraw}
            postPending={postPending}
            postError={postError}
            onPost={confirmPost}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
