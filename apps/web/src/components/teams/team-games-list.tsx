"use client";

import { type TeamHomeView } from "@repo/domain/teams";

import { ListRow, RowList } from "~/components/common/row-list";
import { ResultMark } from "~/components/temba/result-mark";

export function TeamGamesList({ view }: { view: TeamHomeView }) {
  if (view.games.length === 0) {
    return (
      <p className="text-body text-muted-foreground">{view.gamesEmptyCopy}</p>
    );
  }
  return (
    <RowList>
      {view.games.map((game) => (
        <ListRow
          key={game.key}
          leading={<ResultMark variant={game.result} className="size-6" />}
          title={game.opponentName}
          meta={game.meta}
          trailing={
            <span className="text-lead font-semibold tabular-nums">
              {game.scoreLine}
            </span>
          }
        />
      ))}
    </RowList>
  );
}
