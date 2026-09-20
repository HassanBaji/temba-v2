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
  POOL_DRAW_RANDOM_COPY,
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

      <FormErrorSummary message={globalFormErrorMessage(drawError)} />
      <Button
        type="button"
        disabled={drawPending}
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
    </Card>
  );
}
