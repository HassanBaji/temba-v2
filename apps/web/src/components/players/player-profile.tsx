"use client";

import { useState, type ReactNode } from "react";

import { ErrorState } from "~/components/common/error-state";
import { SportSegments } from "~/components/temba/sport-segments";
import { Skeleton } from "~/components/ui/skeleton";
import { isNotFoundError } from "@repo/domain/is-not-found-error";
import {
  PLAYER_PROFILE_REFUSED,
  overallView,
  playedSideView,
  playerHeaderSubtitle,
  profileSport,
  streaksView,
} from "@repo/domain/player-profile";
import {
  footballLastTenSummary,
  footballLevelCardView,
  footballMatchRowView,
  footballOverallView,
  footballRoleView,
} from "@repo/domain/player-profile-football";
import { playerLevelCardView } from "@repo/domain/player-profile-level";
import {
  LAST_TEN_RECENT_ROWS,
  lastTenSummary,
  levelTrendLabel,
  playerMatchRowView,
} from "@repo/domain/player-profile-matches";
import type { Sport } from "@repo/domain/sport";
import { api, type RouterOutputs } from "~/trpc/react";

import { PlayerFootballLastTenCard } from "./player-football-last-ten-card";
import { PlayerFootballRoleCard } from "./player-football-role-card";
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

export function PlayerProfile({
  userId,
  requestedSport,
}: {
  userId: string;
  requestedSport?: unknown;
}) {
  const [chosen, setChosen] = useState<Sport | null>(null);
  const padel = api.users.playerProfile.useQuery({ userId });
  const sport = chosen ?? profileSport(requestedSport, padel.data?.sports);
  const football = api.users.footballProfile.useQuery(
    { userId },
    { enabled: sport === "football" },
  );
  const profile = sport === "football" ? football : padel;

  if (isNotFoundError(profile.error)) {
    return <PlayerProfileRefused />;
  }

  if (profile.isLoading || (sport == null && padel.isLoading)) {
    return <PlayerProfileSkeleton />;
  }

  const switcher = sport ? (
    <SportSegments value={sport} onSelect={setChosen} />
  ) : null;

  if (sport === "football" && football.data) {
    return <FootballProfile data={football.data} switcher={switcher} />;
  }

  if (sport === "padel" && padel.data) {
    return (
      <PadelProfile userId={userId} data={padel.data} switcher={switcher} />
    );
  }

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

function PadelProfile({
  userId,
  data,
  switcher,
}: {
  userId: string;
  data: RouterOutputs["users"]["playerProfile"];
  switcher: ReactNode;
}) {
  return (
    <div className="space-y-[26px]">
      <PlayerHeader
        name={data.player.name}
        image={data.player.image}
        subtitle={playerHeaderSubtitle(data.venue)}
        level={playerLevelCardView(data.rating)}
        trend={levelTrendLabel(data.trend)}
      />
      {switcher}
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

function FootballProfile({
  data,
  switcher,
}: {
  data: RouterOutputs["users"]["footballProfile"];
  switcher: ReactNode;
}) {
  return (
    <div className="space-y-[26px]">
      <PlayerHeader
        name={data.player.name}
        image={data.player.image}
        subtitle={playerHeaderSubtitle(data.venue, "football")}
        level={footballLevelCardView(data.rating)}
        trend={null}
      />
      {switcher}
      <PlayerStreaksCard view={streaksView(data.streaks)} />
      <PlayerFootballRoleCard view={footballRoleView(data.role)} />
      <PlayerOverallCard view={footballOverallView(data.overall)} />
      <PlayerFootballLastTenCard
        summary={footballLastTenSummary(data.lastMatches)}
        rows={data.lastMatches.map(footballMatchRowView)}
      />
    </div>
  );
}
