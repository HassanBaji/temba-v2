"use client";

import { type TeamHomeView } from "@repo/domain/teams";
import Link from "next/link";

import { EntityMonogram } from "~/components/common/entity-monogram";
import { ListRow, RowList } from "~/components/common/row-list";
import { ResultTag } from "~/components/temba/result-mark";
import { Button } from "~/components/ui/button";

/** Rematch opens the post form for this Team, pre-filled from the Rival. */
function rematchHref(teamId: string, rivalTeamId: string) {
  return `/dashboard/challenges/new?${new URLSearchParams({ team: teamId, rematch: rivalTeamId }).toString()}`;
}

export function TeamRivalsList({
  view,
  teamId,
}: {
  view: TeamHomeView;
  teamId: string;
}) {
  if (view.rivals.length === 0) {
    return (
      <p className="text-body text-muted-foreground">
        {view.closestLine ?? view.rivalsEmptyCopy}
      </p>
    );
  }
  return (
    <RowList>
      {view.rivals.map((rival) => (
        <ListRow
          key={rival.teamId}
          asChild
          leading={<EntityMonogram name={rival.name} size="sm" />}
          title={rival.name}
          meta={rival.played}
          trailing={
            <span className="flex items-center gap-3">
              <span className="text-lead font-semibold tabular-nums" dir="ltr">
                {rival.headToHead}
              </span>
              {rival.lastResult ? (
                <ResultTag variant={rival.lastResult}>{rival.last}</ResultTag>
              ) : (
                <span className="text-meta text-muted-foreground">
                  {rival.last}
                </span>
              )}
            </span>
          }
          stackTrailing
          action={
            view.rematch?.disabled ? (
              <Button
                variant="outline"
                size="sm"
                disabled
                aria-label={view.rematch.accessibilityLabels[rival.teamId]}
              >
                {view.rematch.label}
              </Button>
            ) : view.rematch ? (
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={rematchHref(teamId, rival.teamId)}
                  aria-label={view.rematch.accessibilityLabels[rival.teamId]}
                >
                  {view.rematch.label}
                </Link>
              </Button>
            ) : undefined
          }
        >
          <Link
            href={`/dashboard/teams/${rival.teamId}`}
            aria-label={rival.accessibilityLabel}
          />
        </ListRow>
      ))}
    </RowList>
  );
}
