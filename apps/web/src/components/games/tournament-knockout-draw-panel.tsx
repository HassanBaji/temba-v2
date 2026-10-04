"use client";

import { TournamentKnockoutRound } from "~/components/games/tournament-knockout-tree";
import { Button } from "~/components/ui/button";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import { globalFormErrorMessage } from "~/lib/form-mutation-error";
import {
  draftKnockoutFirstRound,
  hasDraftKnockoutDraw,
  type KnockoutViewGameTeam,
} from "@repo/domain/tournament-knockout-view";
import {
  DRAW_AGAIN_ACTION,
  DRAW_KNOCKOUT_ACTION,
  DRAW_KNOCKOUT_EMPTY_DRAFT_COPY,
  POST_KNOCKOUT_DRAW_ACTION,
  POST_KNOCKOUT_DRAW_FOOTER_COPY,
} from "@repo/domain/tournament-pool-draw";

export function TournamentKnockoutDrawPanel({
  gameTeams,
  viewerUserId,
  drawPending,
  drawError,
  onDraw,
  postPending,
  postError,
  onPost,
}: {
  gameTeams: readonly KnockoutViewGameTeam[];
  viewerUserId: string;
  drawPending: boolean;
  drawError: { message: string; data?: { zodError?: unknown } | null } | null;
  onDraw: () => void | Promise<void>;
  postPending: boolean;
  postError: { message: string; data?: { zodError?: unknown } | null } | null;
  onPost: () => void | Promise<void>;
}) {
  const hasDraft = hasDraftKnockoutDraw(gameTeams);
  const firstRound = hasDraft
    ? draftKnockoutFirstRound({ gameTeams, viewerUserId })
    : null;
  const busy = drawPending || postPending;

  async function confirmPost() {
    if (busy || !hasDraft) {
      return;
    }
    try {
      await onPost();
    } catch {
      return;
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-[22px] overflow-y-auto overscroll-contain px-[22px] py-[22px]">
        {firstRound ? (
          <TournamentKnockoutRound round={firstRound} />
        ) : (
          <p className="text-muted-foreground text-body leading-relaxed">
            {DRAW_KNOCKOUT_EMPTY_DRAFT_COPY}
          </p>
        )}

        <FormErrorSummary
          message={globalFormErrorMessage(drawError ?? postError)}
        />
      </div>

      <div className="border-rule mt-auto flex shrink-0 flex-col gap-2.5 border-t px-[22px] pb-[max(22px,env(safe-area-inset-bottom))] pt-5">
        {hasDraft ? (
          <>
            <Button
              type="button"
              size="lg"
              className="w-full font-semibold"
              disabled={busy}
              aria-busy={postPending}
              onClick={() => {
                void confirmPost();
              }}
            >
              {postPending ? "Posting…" : POST_KNOCKOUT_DRAW_ACTION}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full"
              disabled={busy}
              aria-busy={drawPending}
              onClick={() => {
                void onDraw();
              }}
            >
              {drawPending ? "Drawing…" : DRAW_AGAIN_ACTION}
            </Button>
            <p className="text-muted-foreground text-meta text-center leading-relaxed">
              {POST_KNOCKOUT_DRAW_FOOTER_COPY}
            </p>
          </>
        ) : (
          <Button
            type="button"
            size="lg"
            className="w-full font-semibold"
            disabled={busy}
            aria-busy={drawPending}
            onClick={() => {
              void onDraw();
            }}
          >
            {drawPending ? "Drawing…" : DRAW_KNOCKOUT_ACTION}
          </Button>
        )}
      </div>
    </div>
  );
}
