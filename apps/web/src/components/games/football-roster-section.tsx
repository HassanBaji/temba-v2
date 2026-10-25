"use client";

import Link from "next/link";

import { ListRow, RowList } from "~/components/common/row-list";
import { UserAvatar } from "~/components/common/user-avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { playerProfilePath } from "~/lib/dashboard-paths";
import type { FootballRosterRow } from "@repo/domain/football-game-details";
import { KICK_ACTION } from "@repo/domain/game-copy";

function PlayerName({
  row,
  linked,
}: {
  row: FootballRosterRow;
  linked: boolean;
}) {
  const name = (
    <>
      {row.name}
      {row.isViewer ? (
        <Badge variant="outline" className="ml-2 align-middle">
          You
        </Badge>
      ) : null}
    </>
  );
  return linked ? (
    <Link
      href={playerProfilePath(row.id)}
      className="underline-offset-2 hover:underline"
    >
      {name}
    </Link>
  ) : (
    name
  );
}

export function FootballRosterSection({
  rows,
  count,
  cap,
  openSpots,
  linkToPlayers,
  kickPending,
  onKick,
}: {
  rows: readonly FootballRosterRow[];
  count: number;
  cap: number | null;
  openSpots: number;
  linkToPlayers: boolean;
  kickPending: boolean;
  onKick: (userId: string) => void;
}) {
  return (
    <section aria-labelledby="football-roster-heading" className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2
          id="football-roster-heading"
          className="text-title font-semibold tracking-[-0.01em]"
        >
          Roster
        </h2>
        <p className="text-muted-foreground text-meta tabular-nums">
          {cap == null ? count : `${count}/${cap}`}
          {openSpots > 0 ? ` · ${openSpots} open` : null}
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="text-muted-foreground text-body">
          No one has joined yet.
        </p>
      ) : (
        <RowList>
          {rows.map((row) => (
            <ListRow
              key={row.id}
              leading={
                <UserAvatar name={row.name} image={row.image} size="lg" />
              }
              title={<PlayerName row={row} linked={linkToPlayers} />}
              trailing={
                row.kickable ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={kickPending}
                    aria-label={`${KICK_ACTION} ${row.name}`}
                    onClick={() => onKick(row.id)}
                  >
                    {KICK_ACTION}
                  </Button>
                ) : undefined
              }
            />
          ))}
        </RowList>
      )}
    </section>
  );
}
