"use client";

import { TournamentKnockoutRound } from "~/components/games/tournament-knockout-tree";
import { Button } from "~/components/ui/button";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import { useLocale, useMessages } from "~/components/locale-provider";
import { globalFormErrorMessage } from "~/lib/form-mutation-error";
import {
  draftKnockoutFirstRound,
  hasDraftKnockoutDraw,
  type KnockoutViewGameTeam,
} from "@repo/domain/tournament-knockout-view";

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
  const m = useMessages();
  const locale = useLocale();
  const hasDraft = hasDraftKnockoutDraw(gameTeams);
  const firstRound = hasDraft
    ? draftKnockoutFirstRound({ gameTeams, viewerUserId, locale })
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
            {m.tournament.poolDraw.knockoutEmptyDraft}
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
              {postPending
                ? m.webTournament.draw.posting
                : m.tournament.poolDraw.postKnockout}
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
              {drawPending
                ? m.webTournament.draw.drawing
                : m.tournament.poolDraw.drawAgain}
            </Button>
            <p className="text-muted-foreground text-meta text-center leading-relaxed">
              {m.tournament.poolDraw.postKnockoutFooter}
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
            {drawPending
              ? m.webTournament.draw.drawing
              : m.tournament.poolDraw.drawKnockout}
          </Button>
        )}
      </div>
    </div>
  );
}
