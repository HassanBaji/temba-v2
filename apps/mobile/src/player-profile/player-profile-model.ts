import { isNotFoundError } from "@repo/domain/is-not-found-error";
import {
  overallView,
  playedSideView,
  playerHeaderSubtitle,
  streaksView,
  type PlayedSideView,
  type PlayerOverallView,
  type PlayerStreaksView,
} from "@repo/domain/player-profile";
import {
  playerLevelCardView,
  type PlayerLevelCardView,
} from "@repo/domain/player-profile-level";
import type { PlayerProfileFixture } from "@repo/domain/player-profile-fixtures";
import {
  LAST_TEN_RECENT_ROWS,
  lastTenSummary,
  levelTrendLabel,
  playerMatchRowView,
  type LastTenSummary,
  type PlayerMatchRowView,
} from "@repo/domain/player-profile-matches";

import { mediaUrl } from "../lib/media-url";
import type { RouterOutputs } from "../trpc/react";

type ApiPlayerProfile = RouterOutputs["users"]["playerProfile"];

export type PlayerProfileModel = {
  name: string;
  imageUri: string | null;
  subtitle: string;
  level: PlayerLevelCardView;
  trend: string | null;
  streaks: PlayerStreaksView;
  position: PlayedSideView;
  overall: PlayerOverallView;
  lastTen: LastTenSummary;
  matches: PlayerMatchRowView[];
  recentMatches: PlayerMatchRowView[];
};

export type PlayerProfileState =
  | { status: "loading" }
  | { status: "refused" }
  | { status: "error"; message: string }
  | { status: "ready"; model: PlayerProfileModel };

export function playerProfileModel(
  data: ApiPlayerProfile | PlayerProfileFixture,
  apiOrigin: string,
): PlayerProfileModel {
  const matches = data.lastMatches.map(playerMatchRowView);
  return {
    name: data.player.name,
    imageUri: mediaUrl(data.player.image, apiOrigin),
    subtitle: playerHeaderSubtitle(data.venue),
    level: playerLevelCardView(data.rating),
    trend: levelTrendLabel(data.trend),
    streaks: streaksView(data.streaks),
    position: playedSideView(data.position),
    overall: overallView(data.overall),
    lastTen: lastTenSummary(data.lastMatches),
    matches,
    recentMatches: matches.slice(0, LAST_TEN_RECENT_ROWS),
  };
}

export function playerProfileState(
  query: {
    data: ApiPlayerProfile | undefined;
    error: ({ message: string } & object) | null;
  },
  apiOrigin: string,
): PlayerProfileState {
  if (isNotFoundError(query.error)) {
    return { status: "refused" };
  }
  if (query.data) {
    return {
      status: "ready",
      model: playerProfileModel(query.data, apiOrigin),
    };
  }
  if (query.error) {
    return { status: "error", message: query.error.message };
  }
  return { status: "loading" };
}
