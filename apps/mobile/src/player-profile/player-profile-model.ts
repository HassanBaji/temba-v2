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
  footballLastTenSummary,
  footballLevelCardView,
  footballMatchRowView,
  footballOverallView,
  footballRoleView,
  type FootballMatchRowView,
  type FootballRoleView,
} from "@repo/domain/player-profile-football";
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
type ApiFootballProfile = RouterOutputs["users"]["footballProfile"];

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

export type FootballProfileModel = {
  name: string;
  imageUri: string | null;
  subtitle: string;
  level: PlayerLevelCardView;
  trend: null;
  streaks: PlayerStreaksView;
  role: FootballRoleView;
  overall: PlayerOverallView;
  lastTen: LastTenSummary;
  matches: FootballMatchRowView[];
};

export type ProfileState<Model> =
  | { status: "loading" }
  | { status: "refused" }
  | { status: "error"; message: string }
  | { status: "ready"; model: Model };

export type PlayerProfileState = ProfileState<PlayerProfileModel>;

type ProfileQuery<Data> = {
  data: Data | undefined;
  error: ({ message: string } & object) | null;
};

function profileState<Data, Model>(
  query: ProfileQuery<Data>,
  build: (data: Data) => Model,
): ProfileState<Model> {
  if (isNotFoundError(query.error)) {
    return { status: "refused" };
  }
  if (query.data) {
    return { status: "ready", model: build(query.data) };
  }
  if (query.error) {
    return { status: "error", message: query.error.message };
  }
  return { status: "loading" };
}

export function playerProfileModel(
  data: ApiPlayerProfile | PlayerProfileFixture,
  apiOrigin: string,
): PlayerProfileModel {
  const matches = data.lastMatches.map((match) =>
    playerMatchRowView(match, data.player.id),
  );
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
  query: ProfileQuery<ApiPlayerProfile>,
  apiOrigin: string,
): PlayerProfileState {
  return profileState(query, (data) => playerProfileModel(data, apiOrigin));
}

export function footballProfileModel(
  data: ApiFootballProfile,
  apiOrigin: string,
): FootballProfileModel {
  return {
    name: data.player.name,
    imageUri: mediaUrl(data.player.image, apiOrigin),
    subtitle: playerHeaderSubtitle(data.venue, "football"),
    level: footballLevelCardView(data.rating),
    trend: null,
    streaks: streaksView(data.streaks),
    role: footballRoleView(data.role),
    overall: footballOverallView(data.overall),
    lastTen: footballLastTenSummary(data.lastMatches),
    matches: data.lastMatches.map(footballMatchRowView),
  };
}

export function footballProfileState(
  query: ProfileQuery<ApiFootballProfile>,
  apiOrigin: string,
): ProfileState<FootballProfileModel> {
  return profileState(query, (data) => footballProfileModel(data, apiOrigin));
}
