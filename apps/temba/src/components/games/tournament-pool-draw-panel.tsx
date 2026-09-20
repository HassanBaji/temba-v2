"use client";

import { ListRow, RowList } from "~/components/common/row-list";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import { globalFormErrorMessage } from "~/lib/form-mutation-error";
import {
  DRAW_AGAIN_ACTION,
  DRAW_POOLS_ACTION,
  POST_POOL_DRAW_ACTION,
  POOL_DRAW_RANDOM_COPY,
  UNDO_POOL_DRAW_ACTION,
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
  drawPostedAt,
  drawPending,
  drawError,
  onDraw,
  postPending,
  postError,
  onPost,
  undoPending,
  undoError,
  onUndo,
}: {
  gameTeams: readonly DraftPoolTeam[];
  poolCount: number | null | undefined;
  teamCount: number | null | undefined;
  windowStart: Date | string | null | undefined;
  windowEnd: Date | string | null | undefined;
  courtNames: readonly string[];
  drawPostedAt: Date | string | null | undefined;
  drawPending: boolean;
  drawError: { message: string; data?: { zodError?: unknown } | null } | null;
  onDraw: () => void | Promise<void>;
  postPending: boolean;
  postError: { message: string; data?: { zodError?: unknown } | null } | null;
  onPost: () => void | Promise<void>;
  undoPending: boolean;
  undoError: { message: string; data?: { zodError?: unknown } | null } | null;
  onUndo: () => void | Promise<void>;
}) {
  const hasDraft = hasDraftPoolDraw(gameTeams);
  const posted = drawPostedAt != null;
  const pools = draftPoolsFromGameTeams({
    gameTeams,
    poolCount,
    teamCount,
    windowStart,
    windowEnd,
    courtNames,
  });
  const busy = drawPending || postPending || undoPending;

  return (
    <Card variant="outlined" className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-title font-medium">Pool draw</h3>
        <p className="text-muted-foreground text-sm">{POOL_DRAW_RANDOM_COPY}</p>
      </div>

      {hasDraft ? (
        <div className="space-y-4">
          {pools.map((pool) => (
            <div key={pool.poolIndex} className="space-y-2">
              <p className="text-lead font-semibold">{pool.label}</p>
              {pool.dateLines.length > 0 ? (
                <ul className="text-meta text-muted-foreground">
                  {pool.dateLines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : null}
              {pool.courtNames.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {pool.courtNames.map((name) => (
                    <Badge key={name} variant="secondary">
                      {name}
                    </Badge>
                  ))}
                </div>
              ) : null}
              <RowList aria-label={pool.label}>
                {pool.teams.map((team) => (
                  <ListRow key={team.id} title={team.name} />
                ))}
              </RowList>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          Draw the Pools to see which Game teams land in which Pool.
        </p>
      )}

      <FormErrorSummary
        message={globalFormErrorMessage(drawError ?? postError ?? undoError)}
      />
      <div className="flex flex-wrap gap-2">
        {posted ? (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            aria-busy={undoPending}
            onClick={() => {
              void onUndo();
            }}
          >
            {undoPending ? "Undoing…" : UNDO_POOL_DRAW_ACTION}
          </Button>
        ) : (
          <>
            <Button
              type="button"
              disabled={busy}
              aria-busy={drawPending}
              onClick={() => {
                void onDraw();
              }}
            >
              {drawPending
                ? "Drawing…"
                : hasDraft
                  ? DRAW_AGAIN_ACTION
                  : DRAW_POOLS_ACTION}
            </Button>
            {hasDraft ? (
              <Button
                type="button"
                disabled={busy}
                aria-busy={postPending}
                onClick={() => {
                  void onPost();
                }}
              >
                {postPending ? "Posting…" : POST_POOL_DRAW_ACTION}
              </Button>
            ) : null}
          </>
        )}
      </div>
    </Card>
  );
}
