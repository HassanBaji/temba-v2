"use client";

import { ListRow, RowList } from "~/components/common/row-list";
import { Button } from "~/components/ui/button";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import { useLocale, useMessages } from "~/components/locale-provider";
import { globalFormErrorMessage } from "~/lib/form-mutation-error";
import {
  draftPoolMetaLine,
  draftPoolsFromGameTeams,
  hasDraftPoolDraw,
  type DraftPoolTeam,
} from "@repo/domain/tournament-pool-draw";

export function TournamentPoolDrawPanel({
  gameTeams,
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
  gameTeams: readonly DraftPoolTeam[];
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
  const m = useMessages();
  const locale = useLocale();
  const hasDraft = hasDraftPoolDraw(gameTeams);
  const pools = draftPoolsFromGameTeams({
    gameTeams,
    storedRoundCount,
    windowStart,
    windowEnd,
    matchMinutes,
    courtNames,
    locale,
  });
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
        {hasDraft ? (
          pools.map((pool) => {
            const meta = draftPoolMetaLine(pool);
            return (
              <section key={pool.poolIndex}>
                <div className="flex items-baseline gap-2.5 pb-2.5">
                  <h3 className="font-expanded text-title tracking-[-0.03em]">
                    {pool.label}
                  </h3>
                  {meta ? (
                    <p className="text-muted-foreground text-meta">{meta}</p>
                  ) : null}
                </div>
                <RowList
                  aria-label={pool.label}
                  className="border-rule divide-rule rounded-card"
                >
                  {pool.teams.map((team) => (
                    <ListRow
                      key={team.id}
                      className="min-h-11"
                      title={team.name}
                    />
                  ))}
                </RowList>
              </section>
            );
          })
        ) : (
          <p className="text-muted-foreground text-body leading-relaxed">
            {m.tournament.poolDraw.emptyDraft}
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
                : m.tournament.poolDraw.post}
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
              {m.tournament.poolDraw.postFooter}
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
              : m.tournament.poolDraw.drawPools}
          </Button>
        )}
      </div>
    </div>
  );
}
