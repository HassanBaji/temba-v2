import { GameFormatEnum, GameRegistrationModeEnum, GameSportEnum } from "@repo/db";

import { matchOutcome } from "~/server/games/match-outcome";
import { setWinsForGames } from "~/server/games/set-wins-for-games";
import type { RouterOutputs } from "~/trpc/react";

/**
 * The real `games.byId` door output (game-details redesign, TEM-177/TEM-178).
 * Picking straight from `RouterOutputs` — rather than hand-declaring a
 * parallel type — is what keeps this fixture's shape locked to the real
 * door: a field renamed or retyped on `byId.ts` fails this file to compile.
 */
type GameDetailsDoorOutput = RouterOutputs["games"]["byId"];

export type GameDetailsFixture = Pick<
  GameDetailsDoorOutput,
  | "id"
  | "name"
  | "format"
  | "registrationMode"
  | "sport"
  | "venue"
  | "windowStart"
  | "windowEnd"
  | "pricePerPlayerCents"
  | "playersAllowed"
  | "isOrganizer"
  | "viewerUserId"
  | "isSeated"
  | "canLeave"
  | "registeredUserCount"
  | "sides"
  | "matches"
  | "phase"
  | "matchResultConfirmation"
  | "ratingImpact"
>;

type GameDetailsSide = GameDetailsFixture["sides"][number];
type GameDetailsMatch = GameDetailsFixture["matches"][number];
type GameDetailsSeat = NonNullable<GameDetailsSide["left"]>;

const VIEWER_ID = "user-viewer";
const PARTNER_ID = "user-partner";
const OPPONENT_1_ID = "user-opponent-1";
const OPPONENT_2_ID = "user-opponent-2";

function seat(
  userId: string,
  name: string,
  levelBand: GameDetailsSeat["levelBand"],
): GameDetailsSeat {
  return { userId, name, image: null, levelBand };
}

function isoMinutesFrom(now: Date, minutes: number) {
  return new Date(now.getTime() + minutes * 60 * 1000);
}

const venue: GameDetailsFixture["venue"] = {
  name: "Riverside Padel",
  city: "London",
  country: "GB",
  latitude: null,
  longitude: null,
  archivedAt: null,
  logoImageUrl: null,
};

function sidesFor(args: {
  openSeat: boolean;
}): GameDetailsFixture["sides"] {
  const sideA: GameDetailsSide = {
    sideIndex: 1,
    gameTeamId: "game-team-a",
    left: seat(VIEWER_ID, "Alex Rivera", "C2"),
    right: seat(PARTNER_ID, "Sam Chen", "C1"),
  };
  const sideB: GameDetailsSide = {
    sideIndex: 2,
    gameTeamId: "game-team-b",
    left: seat(OPPONENT_1_ID, "Riley Nguyen", "C3"),
    right: args.openSeat ? null : seat(OPPONENT_2_ID, "Jordan Blake", "C2"),
  };
  return [sideA, sideB];
}

function matchFor(args: {
  status: GameDetailsMatch["status"];
  sets: { slot1GamesWon: number; slot2GamesWon: number }[];
  startTime: Date;
  bothSlotsFilled: boolean;
}): GameDetailsMatch {
  const { status, sets, startTime, bothSlotsFilled } = args;
  const scoredSets = sets.map((set, index) => ({
    id: `set-${index + 1}`,
    slot1GamesWon: set.slot1GamesWon,
    slot2GamesWon: set.slot2GamesWon,
    wins: setWinsForGames(set.slot1GamesWon, set.slot2GamesWon),
  }));
  const outcome = matchOutcome(scoredSets);
  const frozen = status === "completed" || status === "cancelled";

  return {
    id: "match-1",
    startTime,
    endTime: null,
    durationInMinutes: 90,
    status,
    courtId: "court-1",
    courtName: "Court 1",
    slot1GameTeamId: "game-team-a",
    slot2GameTeamId: bothSlotsFilled ? "game-team-b" : null,
    bothSlotsFilled,
    bothSidesComplete: bothSlotsFilled,
    canAddSet: !frozen && bothSlotsFilled,
    canScoreSets: !frozen && bothSlotsFilled,
    canComplete: !frozen && bothSlotsFilled && outcome.result !== "none",
    outcome,
    sets: scoredSets,
  };
}

function baseFixture(args: {
  id: string;
  now: Date;
  windowStartMinutes: number;
  windowEndMinutes: number;
  sides: GameDetailsFixture["sides"];
  matches: GameDetailsFixture["matches"];
  phase: GameDetailsFixture["phase"];
  matchResultConfirmation: GameDetailsFixture["matchResultConfirmation"];
  ratingImpact: GameDetailsFixture["ratingImpact"];
}): GameDetailsFixture {
  const registeredUserCount = args.sides.reduce(
    (sum, side) => sum + (side.left ? 1 : 0) + (side.right ? 1 : 0),
    0,
  );
  return {
    id: args.id,
    name: null,
    format: GameFormatEnum.FRIENDLY_GAME,
    registrationMode: GameRegistrationModeEnum.INDIVIDUAL,
    sport: GameSportEnum.PADEL,
    venue,
    windowStart: isoMinutesFrom(args.now, args.windowStartMinutes),
    windowEnd: isoMinutesFrom(args.now, args.windowEndMinutes),
    pricePerPlayerCents: 1200,
    playersAllowed: 4,
    isOrganizer: true,
    viewerUserId: VIEWER_ID,
    isSeated: true,
    canLeave: true,
    registeredUserCount,
    sides: args.sides,
    matches: args.matches,
    phase: args.phase,
    matchResultConfirmation: args.matchResultConfirmation,
    ratingImpact: args.ratingImpact,
  };
}

/**
 * Dev-only Game-details preview data (game-details redesign, TEM-178). This
 * file is the only place holding fixture records for the preview route —
 * the route itself renders props, following `~/fixtures/home.ts`'s pattern.
 *
 * Four cases cover every hatch/confirmation state named in
 * `.scratch/game-details-redesign/spec.md`:
 * - `upcoming` — an open seat (side 2's right position vacant).
 * - `needsScore` — fully seated, window ended, no Set entered yet.
 * - `needsScorePartiallyConfirmed` — fully seated, one Set entered (the
 *   entering User auto-confirmed per ADR-0011), three confirmations
 *   outstanding.
 * - `final` — fully seated, Match completed and rated, viewer-scoped
 *   rating-impact fields populated.
 */
export function createGameDetailsFixtures(
  now = new Date(),
): {
  upcoming: GameDetailsFixture;
  needsScore: GameDetailsFixture;
  needsScorePartiallyConfirmed: GameDetailsFixture;
  final: GameDetailsFixture;
} {
  const upcoming = baseFixture({
    id: "game-upcoming",
    now,
    windowStartMinutes: 5 * 60 + 42,
    windowEndMinutes: 7 * 60 + 12,
    sides: sidesFor({ openSeat: true }),
    matches: [
      matchFor({
        status: "pending",
        sets: [],
        startTime: isoMinutesFrom(now, 5 * 60 + 42),
        bothSlotsFilled: false,
      }),
    ],
    phase: "upcoming",
    matchResultConfirmation: {
      confirmedUserIds: [],
      requiredUserIds: [VIEWER_ID, PARTNER_ID, OPPONENT_1_ID],
      viewerHasConfirmed: false,
    },
    ratingImpact: null,
  });

  const needsScore = baseFixture({
    id: "game-needs-score",
    now,
    windowStartMinutes: -3 * 60,
    windowEndMinutes: -90,
    sides: sidesFor({ openSeat: false }),
    matches: [
      matchFor({
        status: "pending",
        sets: [],
        startTime: isoMinutesFrom(now, -3 * 60),
        bothSlotsFilled: true,
      }),
    ],
    phase: "needs_results",
    matchResultConfirmation: {
      confirmedUserIds: [],
      requiredUserIds: [VIEWER_ID, PARTNER_ID, OPPONENT_1_ID, OPPONENT_2_ID],
      viewerHasConfirmed: false,
    },
    ratingImpact: null,
  });

  const needsScorePartiallyConfirmed = baseFixture({
    id: "game-needs-score-partial",
    now,
    windowStartMinutes: -3 * 60,
    windowEndMinutes: -90,
    sides: sidesFor({ openSeat: false }),
    matches: [
      matchFor({
        status: "pending",
        sets: [{ slot1GamesWon: 6, slot2GamesWon: 4 }],
        startTime: isoMinutesFrom(now, -3 * 60),
        bothSlotsFilled: true,
      }),
    ],
    phase: "needs_results",
    matchResultConfirmation: {
      confirmedUserIds: [VIEWER_ID],
      requiredUserIds: [VIEWER_ID, PARTNER_ID, OPPONENT_1_ID, OPPONENT_2_ID],
      viewerHasConfirmed: true,
    },
    ratingImpact: null,
  });

  const final = baseFixture({
    id: "game-final",
    now,
    windowStartMinutes: -2 * 24 * 60,
    windowEndMinutes: -2 * 24 * 60 + 90,
    sides: sidesFor({ openSeat: false }),
    matches: [
      matchFor({
        status: "completed",
        sets: [
          { slot1GamesWon: 6, slot2GamesWon: 4 },
          { slot1GamesWon: 6, slot2GamesWon: 3 },
        ],
        startTime: isoMinutesFrom(now, -2 * 24 * 60),
        bothSlotsFilled: true,
      }),
    ],
    phase: "final",
    matchResultConfirmation: {
      confirmedUserIds: [VIEWER_ID, PARTNER_ID, OPPONENT_1_ID, OPPONENT_2_ID],
      requiredUserIds: [VIEWER_ID, PARTNER_ID, OPPONENT_1_ID, OPPONENT_2_ID],
      viewerHasConfirmed: true,
    },
    ratingImpact: {
      levelChange: 0.2,
      newLevel: 3.6,
      newLevelBand: "C2",
      isProvisional: false,
      ratedMatchesRemainingToConfirm: null,
    },
  });

  return { upcoming, needsScore, needsScorePartiallyConfirmed, final };
}
