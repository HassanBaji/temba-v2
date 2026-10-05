"use client";

import * as React from "react";

import { ConfirmDialog } from "~/components/common/confirm-dialog";
import { TournamentKnockoutDrawPanel } from "~/components/games/tournament-knockout-draw-panel";
import { TournamentPoolDrawPanel } from "~/components/games/tournament-pool-draw-panel";
import { Button } from "~/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "~/components/ui/drawer";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import { CloseButton } from "~/components/ui/nav-icon-button";
import { globalFormErrorMessage } from "~/lib/form-mutation-error";
import { ORGANIZER_EYEBROW } from "@repo/domain/tournament-half-teams";
import { type KnockoutViewGameTeam } from "@repo/domain/tournament-knockout-view";
import {
  DRAW_DRAWER_TITLE,
  DRAW_ENTRY_ACTION_LABEL,
  UNDO_POOL_DRAW_ACTION,
  UNDO_POOL_DRAW_CONFIRM_COPY,
  UNDO_POOL_DRAW_CONFIRM_LABEL,
  UNDO_POOL_DRAW_CONFIRM_TITLE,
  UNDO_KNOCKOUT_DRAW_ACTION,
  UNDO_KNOCKOUT_DRAW_CONFIRM_COPY,
  UNDO_KNOCKOUT_DRAW_CONFIRM_TITLE,
  drawDrawerLead,
  knockoutDrawDrawerLead,
  drawEntryStateLine,
  drawEntryTitle,
  type DraftPoolTeam,
} from "@repo/domain/tournament-pool-draw";

export function TournamentDrawEntry({
  completeTeams,
  teamCount,
  hasDraft,
  knockoutOnly,
  onOpen,
}: {
  completeTeams: number;
  teamCount: number;
  hasDraft: boolean;
  knockoutOnly: boolean;
  onOpen: () => void;
}) {
  return (
    <div className="border-rule rounded-card border p-5">
      <p className="text-eyebrow text-muted-foreground uppercase tracking-[0.06em]">
        {ORGANIZER_EYEBROW}
      </p>
      <p className="text-body mt-2 font-semibold">
        {drawEntryTitle(hasDraft, knockoutOnly)}
      </p>
      <p className="text-muted-foreground text-meta mt-1.5 leading-relaxed">
        {drawEntryStateLine(completeTeams, teamCount)}
      </p>
      <Button
        type="button"
        variant="outline"
        onClick={onOpen}
        className="border-ink mt-4 w-full font-semibold"
      >
        {DRAW_ENTRY_ACTION_LABEL}
      </Button>
    </div>
  );
}

export function TournamentUndoPoolDraw({
  knockoutOnly,
  undoPending,
  undoError,
  onUndo,
}: {
  knockoutOnly: boolean;
  undoPending: boolean;
  undoError: { message: string; data?: { zodError?: unknown } | null } | null;
  onUndo: () => void | Promise<void>;
}) {
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const undoButtonRef = React.useRef<HTMLButtonElement>(null);

  return (
    <div className="space-y-3">
      <FormErrorSummary message={globalFormErrorMessage(undoError)} />
      <Button
        ref={undoButtonRef}
        type="button"
        variant="outline"
        className="min-h-11 w-full"
        disabled={undoPending}
        aria-busy={undoPending}
        onClick={() => setConfirmOpen(true)}
      >
        {undoPending
          ? "Undoing…"
          : knockoutOnly
            ? UNDO_KNOCKOUT_DRAW_ACTION
            : UNDO_POOL_DRAW_ACTION}
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={
          knockoutOnly
            ? UNDO_KNOCKOUT_DRAW_CONFIRM_TITLE
            : UNDO_POOL_DRAW_CONFIRM_TITLE
        }
        description={
          knockoutOnly
            ? UNDO_KNOCKOUT_DRAW_CONFIRM_COPY
            : UNDO_POOL_DRAW_CONFIRM_COPY
        }
        confirmLabel={UNDO_POOL_DRAW_CONFIRM_LABEL}
        pending={undoPending}
        restoreFocusRef={undoButtonRef}
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
  knockoutOnly,
  viewerUserId,
  gameTeams,
  teamCount,
  completeTeams,
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
  knockoutOnly: boolean;
  viewerUserId: string;
  gameTeams: readonly (DraftPoolTeam & KnockoutViewGameTeam)[];
  teamCount: number | null | undefined;
  completeTeams: number;
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
              <CloseButton variant="boxed" onClick={close} disabled={busy} />
              <p className="text-eyebrow text-muted-foreground uppercase tracking-[0.06em]">
                {ORGANIZER_EYEBROW}
              </p>
            </div>
            <DrawerTitle className="font-expanded text-display mt-6 leading-none tracking-[-0.03em]">
              {DRAW_DRAWER_TITLE}
            </DrawerTitle>
            <DrawerDescription className="text-ink text-body mt-2.5 leading-relaxed">
              {knockoutOnly
                ? knockoutDrawDrawerLead(completeTeams)
                : drawDrawerLead(teamCount)}
            </DrawerDescription>
          </div>
          {knockoutOnly ? (
            <TournamentKnockoutDrawPanel
              gameTeams={gameTeams}
              viewerUserId={viewerUserId}
              drawPending={drawPending}
              drawError={drawError}
              onDraw={onDraw}
              postPending={postPending}
              postError={postError}
              onPost={confirmPost}
            />
          ) : (
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
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
