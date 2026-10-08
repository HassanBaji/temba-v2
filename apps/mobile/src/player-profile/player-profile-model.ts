import { isNotFoundError } from "@repo/domain/is-not-found-error";
import {
  overallView,
  playerHeaderSubtitle,
  type PlayerOverallView,
} from "@repo/domain/player-profile";
import {
  playerLevelCardView,
  type PlayerLevelCardView,
} from "@repo/domain/player-profile-level";
import type { PlayerProfileFixture } from "@repo/domain/player-profile-fixtures";

import { mediaUrl } from "../lib/media-url";
import type { RouterOutputs } from "../trpc/react";

type ApiPlayerProfile = RouterOutputs["users"]["playerProfile"];

export type PlayerProfileModel = {
  name: string;
  imageUri: string | null;
  subtitle: string;
  level: PlayerLevelCardView;
  overall: PlayerOverallView;
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
  return {
    name: data.player.name,
    imageUri: mediaUrl(data.player.image, apiOrigin),
    subtitle: playerHeaderSubtitle(data.venue),
    level: playerLevelCardView(data.rating),
    overall: overallView(data.overall),
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
