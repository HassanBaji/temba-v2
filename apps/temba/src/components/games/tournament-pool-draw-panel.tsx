"use client";

import { ListRow, RowList } from "~/components/common/row-list";
import { Button } from "~/components/ui/button";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import { globalFormErrorMessage } from "~/lib/form-mutation-error";
import {
  DRAW_AGAIN_ACTION,
  DRAW_EMPTY_DRAFT_COPY,
  DRAW_POOLS_ACTION,
  POST_POOL_DRAW_ACTION,
  POST_POOL_DRAW_FOOTER_COPY,
  draftPoolMetaLine,
  draftPoolsFromGameTeams,
  hasDraftPoolDraw,
  type DraftPoolTeam,
} from "~/lib/tournament-pool-draw";

export function TournamentPoolDrawPanel({
  gameTeams,
  poolCount,
  teamCount,
  windowStart,
  windowEnd,
  courtNames,
  drawPending,
  drawError,
  onDraw,
  postPending,
  postError,
  onPost,
}: {
  gameTeams: readonly DraftPoolTeam[];
  poolCount: number | null | undefined;
  teamCount: number | null | undefined;
  windowStart: Date | string | null | undefined;
  windowEnd: Date | string | null | undefined;
  courtNames: readonly string[];
  drawPending: boolean;
  drawError: { message: string; data?: { zodError?: unknown } | null } | null;
  onDraw: () => void | Promise<void>;
  postPending: boolean;
  postError: { message: string; data?: { zodError?: unknown } | null } | null;
  onPost: () => void | Promise<void>;
}) {
  const hasDraft = hasDraftPoolDraw(gameTeams);
  const pools = draftPoolsFromGameTeams({
    gameTeams,
    poolCount,
    teamCount,
    windowStart,
    windowEnd,
    courtNames,
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
                  <h3 className="font-expanded text-[19px] tracking-[-0.03em]">
                    {pool.label}
                  </h3>
                  {meta ? (
                    <p className="text-muted-foreground text-[13px]">{meta}</p>
                  ) : null}
                </div>
                <RowList
                  aria-label={pool.label}
                  className="border-rule divide-rule rounded-[14px]"
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
          <p className="text-muted-foreground text-[15px] leading-relaxed">
            {DRAW_EMPTY_DRAFT_COPY}
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
              className="h-[52px] min-h-[52px] w-full rounded-[12px] text-base font-semibold"
              disabled={busy}
              aria-busy={postPending}
              onClick={() => {
                void confirmPost();
              }}
            >
              {postPending ? "Posting…" : POST_POOL_DRAW_ACTION}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-[52px] min-h-[52px] w-full rounded-[12px] text-[15px]"
              disabled={busy}
              aria-busy={drawPending}
              onClick={() => {
                void onDraw();
              }}
            >
              {drawPending ? "Drawing…" : DRAW_AGAIN_ACTION}
            </Button>
            <p className="text-muted-foreground text-center text-[13px] leading-relaxed">
              {POST_POOL_DRAW_FOOTER_COPY}
            </p>
          </>
        ) : (
          <Button
            type="button"
            className="h-[52px] min-h-[52px] w-full rounded-[12px] text-base font-semibold"
            disabled={busy}
            aria-busy={drawPending}
            onClick={() => {
              void onDraw();
            }}
          >
            {drawPending ? "Drawing…" : DRAW_POOLS_ACTION}
          </Button>
        )}
      </div>
    </div>
  );
}
