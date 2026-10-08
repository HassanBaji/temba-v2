"use client";

import { ErrorState } from "~/components/common/error-state";
import { Skeleton } from "~/components/ui/skeleton";
import { isNotFoundError } from "@repo/domain/is-not-found-error";
import {
  lastTenSummary,
  playerMatchRowView,
} from "@repo/domain/player-profile-matches";
import { api } from "~/trpc/react";

import { PlayerMatchRow } from "./player-match-row";
import { PlayerProfileRefused } from "./player-profile";

export function PlayerMatches({ userId }: { userId: string }) {
  const profile = api.users.playerProfile.useQuery({ userId });

  if (isNotFoundError(profile.error)) {
    return <PlayerProfileRefused />;
  }

  if (profile.isLoading) {
    return (
      <Skeleton aria-busy="true" className="rounded-card h-[320px] w-full" />
    );
  }

  if (!profile.data) {
    return (
      <ErrorState
        title="Games could not be loaded"
        message={profile.error?.message}
        onRetry={() => {
          void profile.refetch();
        }}
      />
    );
  }

  const data = profile.data;
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-bold tracking-[-0.01em]">
          Last 10 games
        </h1>
        <p className="text-meta text-muted-foreground mt-1">
          {`${data.player.name}, ${lastTenSummary(data.lastMatches).record}`}
        </p>
      </div>
      <ul className="border-rule bg-paper rounded-card divide-rule divide-y overflow-hidden border">
        {data.lastMatches.map((match) => (
          <li key={match.matchId}>
            <PlayerMatchRow row={playerMatchRowView(match)} />
          </li>
        ))}
      </ul>
    </div>
  );
}
