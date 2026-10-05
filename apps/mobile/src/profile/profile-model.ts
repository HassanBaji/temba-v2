import {
  deriveRecentForm,
  type RecentFormView,
} from "@repo/domain/home-recent-form";
import {
  isPreferredPosition,
  type PreferredPosition,
} from "@repo/domain/preferred-position";
import type { ProfileAllTimeInput } from "@repo/domain/profile-all-time";
import type { ProfileFixture } from "@repo/domain/profile-fixtures";
import type { ProfileLevelInput } from "@repo/domain/profile-level";

import type { Slot } from "../home/home-model";
import type { RouterOutputs } from "../trpc/react";

export type PositionSetting = {
  position: PreferredPosition | null;
  editable: boolean;
};

export type ProfileModel = {
  name: string;
  imageUri: string | null;
  position: Slot<PositionSetting>;
  level: Slot<ProfileLevelInput | null>;
  recentForm: Slot<RecentFormView>;
  allTime: Slot<ProfileAllTimeInput>;
  pendingInviteCount: number;
  teamCount: number;
};

type ApiRating = RouterOutputs["ratings"]["me"];
type ApiStats = RouterOutputs["users"]["profileStats"];
type ApiOnboardingState = RouterOutputs["users"]["onboardingState"];

export function levelFromApi(data: ApiRating): ProfileLevelInput | null {
  if (!data.rating) {
    return null;
  }
  return {
    band: data.rating.levelBand,
    level: data.rating.level,
    provisional: data.rating.provisional,
    ratedMatchCount: data.ratedMatchCount,
    ratedMatchesRemaining: data.rating.ratedMatchesRemaining,
    progressPercent: data.progressPercent,
    history: data.history,
  };
}

export function allTimeFromApi(data: ApiStats): ProfileAllTimeInput {
  return {
    matchesPlayed: data.matchesPlayed,
    matchesWon: data.matchesWon,
    matchesLost: data.matchesLost,
    setsWon: data.setsWon,
    setsLost: data.setsLost,
    longestWinStreak: data.longestWinStreak,
    mostPlayedPartnerName: data.mostPlayedPartner?.name ?? null,
    firstMatchAt: data.firstMatchAt,
  };
}

export function positionFromApi(data: ApiOnboardingState): PositionSetting {
  return {
    position: isPreferredPosition(data.preferredPosition)
      ? data.preferredPosition
      : null,
    editable: !data.provisioning,
  };
}

export function profileModelFromFixture(fixture: ProfileFixture): ProfileModel {
  return {
    name: fixture.userName,
    imageUri: null,
    position: {
      status: "ready",
      value: { position: fixture.preferredPosition, editable: true },
    },
    level: { status: "ready", value: fixture.level },
    recentForm: {
      status: "ready",
      value: deriveRecentForm(
        fixture.recentForm.map((outcome) => ({ outcome })),
      ),
    },
    allTime: { status: "ready", value: fixture.allTime },
    pendingInviteCount: fixture.pendingInviteCount,
    teamCount: fixture.teamCount,
  };
}
