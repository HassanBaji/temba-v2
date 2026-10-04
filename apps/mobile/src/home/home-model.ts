import type { HomeFixture } from "@repo/domain/home-fixtures";
import {
  homeComingUpRows,
  type HomeComingUpRow,
  type HomeComingUpTournamentMatchRow,
  type HomeComingUpTournamentRow,
} from "@repo/domain/home-coming-up";
import { gameFormatLabel } from "@repo/domain/game-format-label";
import type { HomeLevelInput } from "@repo/domain/home-level";
import type { HomeNextGamePhase } from "@repo/domain/home-next-game";
import {
  homeNoGamesCreateAction,
  type HomeNoGamesCreateAction,
} from "@repo/domain/home-no-games";
import {
  deriveRecentForm,
  type RecentFormHistoryRow,
  type RecentFormView,
} from "@repo/domain/home-recent-form";
import { homeNextGameSeats, type HomeSeatView } from "@repo/domain/home-seats";
import type { HomeStandingRow } from "@repo/domain/home-standing";
import {
  isDrawnTournamentSummaryRow,
  isTournamentMatchRow,
} from "@repo/domain/tournament-card";
import { poolRoundLabel } from "@repo/domain/tournament-rounds";

import type { RouterOutputs } from "../trpc/react";

export type Slot<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; value: T };

export type HomeNextGameModel =
  | {
      kind: "game";
      id: string;
      phase: HomeNextGamePhase;
      venueName: string;
      courtLabel: string | null;
      formatLabel: string;
      startsAt: Date;
      seats: HomeSeatView[];
    }
  | {
      kind: "tournament";
      id: string;
      row: HomeComingUpTournamentRow | HomeComingUpTournamentMatchRow;
    };

export type HomeContent = {
  pendingInviteCount: number;
  bookedGameCount: number;
  nextGame: HomeNextGameModel | null;
  comingUp: HomeComingUpRow[];
  allTime: { played: number; won: number; lost: number };
  standing: HomeStandingRow[];
  noGamesAction: HomeNoGamesCreateAction | null;
};

export type HomeModel = {
  name: string;
  imageUri: string | null;
  home: Slot<HomeContent>;
  level: Slot<HomeLevelInput | null>;
  recentForm: Slot<RecentFormView>;
};

type ApiHome = RouterOutputs["users"]["home"];
type ApiRating = RouterOutputs["ratings"]["me"];
type CarouselGame = ApiHome["carouselGames"][number];

function nextGameFromApi(game: CarouselGame): HomeNextGameModel {
  if (isTournamentMatchRow(game) || isDrawnTournamentSummaryRow(game)) {
    const [row] = homeComingUpRows([game]);
    if (row && row.kind !== "game") {
      return { kind: "tournament", id: game.id, row };
    }
  }
  return {
    kind: "game",
    id: game.id,
    phase: game.phase,
    venueName: game.venue?.name ?? "Game",
    courtLabel: game.courtName ?? null,
    formatLabel:
      poolRoundLabel(game.roundNumber, game.roundCount) ??
      gameFormatLabel(String(game.format)),
    startsAt: new Date(game.startTime),
    seats: homeNextGameSeats(
      game.sides,
      game.registeredUserCount,
      game.playersAllowed,
    ),
  };
}

export function homeContentFromApi(
  data: ApiHome,
  noGamesAction: HomeNoGamesCreateAction | null,
): HomeContent {
  const [next, ...comingUp] = data.carouselGames;
  return {
    pendingInviteCount: data.pendingInviteCount,
    bookedGameCount: data.carouselGames.length,
    nextGame: next ? nextGameFromApi(next) : null,
    comingUp: homeComingUpRows(comingUp),
    allTime: {
      played: data.gamesPlayed,
      won: data.gamesWon,
      lost: data.gamesLost,
    },
    standing: data.standing,
    noGamesAction,
  };
}

export function levelFromApi(data: ApiRating): HomeLevelInput | null {
  if (!data.rating) {
    return null;
  }
  return {
    band: data.rating.levelBand,
    level: data.rating.level,
    provisional: data.rating.provisional,
    ratedMatchesRemaining: data.rating.ratedMatchesRemaining,
    history: data.history,
    progressPercent: data.progressPercent,
  };
}

export function recentFormFromHistory(
  rows: readonly RecentFormHistoryRow[],
): RecentFormView {
  return deriveRecentForm(rows);
}

export function homeModelFromFixture(fixture: HomeFixture): HomeModel {
  const { nextGame, level } = fixture;
  const content: HomeContent = {
    pendingInviteCount: fixture.pendingInviteCount,
    bookedGameCount: fixture.bookedGameCount,
    nextGame: nextGame
      ? {
          kind: "game",
          id: nextGame.id,
          phase: nextGame.phase,
          venueName: nextGame.venueName,
          courtLabel: nextGame.courtLabel,
          formatLabel: nextGame.formatLabel,
          startsAt: new Date(nextGame.startsAt),
          seats: nextGame.seats,
        }
      : null,
    comingUp: fixture.comingUp.map((row) => ({
      ...row,
      startsAt: new Date(row.startsAt),
    })),
    allTime: {
      played: fixture.gamesPlayed,
      won: fixture.gamesWon,
      lost: fixture.gamesLost,
    },
    standing: fixture.standing,
    noGamesAction: homeNoGamesCreateAction({
      hasCreateAccess: fixture.hasCreateAccess,
      createGroupCount: fixture.createGroupCount,
    }),
  };
  return {
    name: fixture.userName,
    imageUri: null,
    home: { status: "ready", value: content },
    level: {
      status: "ready",
      value:
        level.band && level.level
          ? {
              band: level.band,
              level: level.level,
              provisional: level.provisional,
              ratedMatchesRemaining: level.ratedMatchesRemaining,
              history: level.history,
              progressPercent: level.progressPercent,
            }
          : null,
    },
    recentForm: {
      status: "ready",
      value: deriveRecentForm(
        fixture.recentForm.map((outcome) => ({ outcome })),
      ),
    },
  };
}
