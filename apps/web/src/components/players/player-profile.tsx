"use client";

import { ErrorState } from "~/components/common/error-state";
import { Skeleton } from "~/components/ui/skeleton";
import { isNotFoundError } from "@repo/domain/is-not-found-error";
import {
  PLAYER_PROFILE_REFUSED,
  overallView,
  playedSideView,
  playerHeaderSubtitle,
  streaksView,
} from "@repo/domain/player-profile";
import { playerLevelCardView } from "@repo/domain/player-profile-level";
import {
  LAST_TEN_RECENT_ROWS,
  lastTenSummary,
  levelTrendLabel,
  playerMatchRowView,
} from "@repo/domain/player-profile-matches";
import { api } from "~/trpc/react";

import { PlayerBackButton, PlayerHeader } from "./player-header";
import { PlayerLastTenCard } from "./player-last-ten-card";
import { PlayerOverallCard } from "./player-overall-card";
import { PlayerPositionCard } from "./player-position-card";
import { PlayerStreaksCard } from "./player-streaks-card";

export function PlayerProfileRefused() {
  return (
    <div className="space-y-5">
      <PlayerBackButton surface="paper" />
      <section className="border-rule rounded-card border p-5">
        <h1 className="text-lead font-semibold">
          {PLAYER_PROFILE_REFUSED.title}
        </h1>
        <p className="text-meta text-muted-foreground mt-1.5">
          {PLAYER_PROFILE_REFUSED.description}
        </p>
      </section>
    </div>
  );
}

function PlayerProfileSkeleton() {
  return (
    <div aria-busy="true" className="space-y-[26px]">
      <Skeleton className="h-[300px] w-full rounded-xl" />
      <Skeleton className="rounded-card h-[200px] w-full" />
    </div>
  );
}

export function PlayerProfile({ userId }: { userId: string }) {
  const profile = api.users.playerProfile.useQuery({ userId });

  if (isNotFoundError(profile.error)) {
    return <PlayerProfileRefused />;
  }

  if (profile.isLoading) {
    return <PlayerProfileSkeleton />;
  }

  if (!profile.data) {
    return (
      <ErrorState
        title="Profile could not be loaded"
        message={profile.error?.message}
        onRetry={() => {
          void profile.refetch();
        }}
      />
    );
  }

  const data = profile.data;
  return (
    <div className="space-y-[26px]">
      <PlayerHeader
        name={data.player.name}
        image={data.player.image}
        subtitle={playerHeaderSubtitle(data.venue)}
        level={playerLevelCardView(data.rating)}
        trend={levelTrendLabel(data.trend)}
      />
      <PlayerStreaksCard view={streaksView(data.streaks)} />
      <PlayerPositionCard view={playedSideView(data.position)} />
      <PlayerOverallCard view={overallView(data.overall)} />
      <PlayerLastTenCard
        userId={userId}
        summary={lastTenSummary(data.lastMatches)}
        rows={data.lastMatches
          .slice(0, LAST_TEN_RECENT_ROWS)
          .map((match) => playerMatchRowView(match, data.player.id))}
      />
    </div>
  );
}
