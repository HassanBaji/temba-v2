import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import {
  MatchStatusEnum,
  gamePlayers,
  gameTeams,
  gameWaitlist,
  groups,
  matches,
  ratingEvents,
  ratings,
  teamMembers,
  venues,
} from "@repo/db";

import { showsFriendlyRoster } from "~/lib/game-summary-cta";
import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import {
  canViewGame,
  getRegistrationStatus,
  isClubGroupGameJoinFrozen,
  isGameOrganizer,
  registeredGameTeamCount,
  registeredUserCount,
  requireGame,
  userPassesJoinGate,
} from "~/server/games/access";
import {
  homeCarouselPhase,
  type HomeCarouselCandidate,
  type HomeCarouselPhase,
} from "~/server/home/carousel-games";
import { userAlreadyOnGame } from "~/server/games/helpers/user-already-on-game";
import { viewerLevelRangeFields } from "~/server/games/level-range-requests";
import {
  matchResultConfirmationCompletedAt,
  matchResultConfirmedUserIds,
  matchSeatedUserIds,
} from "~/server/games/match-result-confirmations";
import { userAllowedByLevelRange } from "~/server/games/user-allowed-by-level-range";
import {
  isIndividualSeatGame,
  listGameSides,
  sitsOnCompletedMatch,
  type SeatOccupant,
} from "~/server/games/seats";
import { bothSlotsFilled } from "~/server/games/both-slots-filled";
import { bothSlottedTeamsComplete } from "~/server/games/both-slotted-teams-complete";
import { matchOutcome } from "~/server/games/match-outcome";
import { setWinsForGames } from "~/server/games/set-wins-for-games";
import {
  bandFromLevel,
  bandWithHysteresis,
  formatLevel,
  isProvisional,
  levelFromMu,
  ratedMatchesRemainingToConfirm,
  type LevelBand,
} from "~/server/ratings/level";

import { listLevelRangeRequests } from "./listLevelRangeRequests";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Individual Friendly game details phase (game-details redesign, TEM-177).
 * `needs_results` reuses `isHomeCarouselNeedsResults`/`homeCarouselPhase`'s
 * exact rule shape (`~/server/home/carousel-games.ts`), adapted to this
 * Game's single Match rather than a hub list's many-Game/many-Match scan.
 */
export type GameDetailsPhase = HomeCarouselPhase | "final" | "cancelled";

type GameDetailsPhaseGame = {
  id: string;
  groupId: string | null;
  cancelledAt: Date | null;
  windowStart: Date | null;
  windowEnd: Date | null;
  createdAt: Date;
  format: string;
  createdBy: string;
  registrationMode: string;
  playersAllowed: number | null;
  teamsAllowed: number | null;
};

function individualFriendlyGamePhase(args: {
  game: GameDetailsPhaseGame;
  match: { status: string | null; startTime: Date | null } | undefined;
  registeredUserCount: number;
  registeredTeamCount: number;
  now: Date;
}): GameDetailsPhase {
  const { game, match, registeredUserCount, registeredTeamCount, now } = args;

  if (
    game.cancelledAt !== null ||
    match?.status === MatchStatusEnum.CANCELLED
  ) {
    return "cancelled";
  }
  if (match?.status === MatchStatusEnum.COMPLETED) {
    return "final";
  }

  const candidate: HomeCarouselCandidate = {
    id: game.id,
    groupId: game.groupId,
    cancelledAt: game.cancelledAt,
    windowStart: game.windowStart,
    windowEnd: game.windowEnd,
    createdAt: game.createdAt,
    format: game.format,
    matches: match
      ? [{ startTime: match.startTime, status: match.status }]
      : [],
    createdBy: game.createdBy,
    // Neither field is read by isHomeCarouselNeedsResults/homeCarouselPhase —
    // this door computes phase for the Game's own details page, not a
    // viewer-scoped carousel membership list.
    viewerHasGameAdmit: false,
    viewerIsOrganizer: false,
    registrationMode: game.registrationMode,
    playersAllowed: game.playersAllowed,
    teamsAllowed: game.teamsAllowed,
    registeredUserCount,
    registeredTeamCount,
  };

  const phase = homeCarouselPhase(candidate, now);
  if (phase) {
    return phase;
  }

  // homeCarouselPhase returns null only when the Game is neither live nor
  // needs_results (its window ended without ever reaching cap, so its one
  // Match never had a chance to be scored). Home simply drops such a Game
  // from the carousel; the details screen has no "drop it" option and the
  // same "nobody has entered a result" description still applies, so it
  // resolves to needs_results here too.
  return "needs_results";
}

export async function gameById(
  database: DbClient,
  args: { gameId: string; userId: string },
) {
  const game = await requireGame(database, args.gameId);

  if (!(await canViewGame(database, game, args.userId))) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Game not found",
    });
  }

  const now = new Date();
  const organizer = await isGameOrganizer(database, game, args.userId);
  const passesGate = await userPassesJoinGate(database, game, args.userId);
  const alreadyOnGame = await userAlreadyOnGame(database, game.id, args.userId);
  const userCount = await registeredUserCount(database, game.id);
  const teamCount = await registeredGameTeamCount(database, game.id);
  const registrationStatus = await getRegistrationStatus(database, game, now);
  const waitlistRows = await database.query.gameWaitlist.findMany({
    where: eq(gameWaitlist.gameId, game.id),
    with: {
      user: { columns: { id: true, name: true, image: true } },
      team: { columns: { id: true, name: true } },
    },
    orderBy: (table, { asc }) => [asc(table.createdAt), asc(table.id)],
  });

  const matchRows = await database.query.matches.findMany({
    where: eq(matches.gameId, game.id),
    with: {
      court: {
        columns: { id: true, name: true },
      },
      sets: {
        orderBy: (table, { asc }) => [asc(table.createdAt), asc(table.id)],
      },
    },
    orderBy: (table, { asc }) => [asc(table.createdAt)],
  });

  const teamRows = await database.query.gameTeams.findMany({
    where: eq(gameTeams.gameId, game.id),
    with: {
      team: {
        columns: { id: true, name: true },
      },
      players: {
        with: {
          gamePlayer: {
            with: {
              user: {
                columns: { id: true, name: true, image: true },
              },
            },
          },
        },
      },
    },
    orderBy: (table, { asc }) => [asc(table.createdAt)],
  });

  const playerRows = await database.query.gamePlayers.findMany({
    where: eq(gamePlayers.gameId, game.id),
    with: {
      user: {
        columns: { id: true, name: true, image: true },
      },
    },
    orderBy: (table, { asc }) => [asc(table.createdAt), asc(table.id)],
  });

  const group = game.groupId
    ? await database.query.groups.findFirst({
        where: eq(groups.id, game.groupId),
        columns: { id: true, name: true },
      })
    : null;

  const venue = await database.query.venues.findFirst({
    where: eq(venues.id, game.venueId),
    columns: {
      id: true,
      name: true,
      city: true,
      country: true,
      latitude: true,
      longitude: true,
      archivedAt: true,
      logoImageUrl: true,
    },
  });

  const memberships = await database.query.teamMembers.findMany({
    where: eq(teamMembers.userId, args.userId),
    columns: { teamId: true },
  });
  const myTeamIds = memberships.map((row) => row.teamId);
  const isWaitlisted = waitlistRows.some(
    (row) =>
      row.userId === args.userId ||
      (row.teamId !== null && myTeamIds.includes(row.teamId)),
  );
  const waitlistIndex = waitlistRows.findIndex(
    (row) =>
      row.userId === args.userId ||
      (row.teamId !== null && myTeamIds.includes(row.teamId)),
  );
  const waitlistPlace =
    isWaitlisted && waitlistIndex >= 0 ? waitlistIndex + 1 : null;
  const eligibleTeams = [];
  if (game.registrationMode === "team_only" && myTeamIds.length > 0) {
    const memberRows = await database.query.teamMembers.findMany({
      where: inArray(teamMembers.teamId, myTeamIds),
      with: {
        team: { columns: { id: true, name: true } },
        user: { columns: { id: true, name: true, image: true } },
      },
    });
    const byTeam = new Map<string, typeof memberRows>();
    for (const row of memberRows) {
      const list = byTeam.get(row.teamId) ?? [];
      list.push(row);
      byTeam.set(row.teamId, list);
    }
    for (const [teamId, members] of byTeam) {
      if (members.length !== 2) {
        continue;
      }
      const partnerIds = members.map((member) => member.userId);
      const bothAllowed = (
        await Promise.all(
          partnerIds.map(async (userId) => {
            if (!(await userPassesJoinGate(database, game, userId))) {
              return false;
            }
            return userAllowedByLevelRange(database, game, userId);
          }),
        )
      ).every(Boolean);
      if (!bothAllowed) {
        continue;
      }
      const already = teamRows.some((row) => row.teamId === teamId);
      if (already) {
        continue;
      }
      const names = members.map((member) => member.user.name);
      eligibleTeams.push({
        id: teamId,
        name: members[0]?.team.name ?? names.join(" / "),
        memberNames: names,
      });
    }
  }

  const myGameTeamIds = new Set(
    teamRows
      .filter((row) =>
        row.players.some((link) => link.gamePlayer.user?.id === args.userId),
      )
      .map((row) => row.id),
  );

  const seatedUserIds = new Set(
    teamRows.flatMap((row) =>
      row.players.flatMap((link) =>
        link.gamePlayer.user?.id ? [link.gamePlayer.user.id] : [],
      ),
    ),
  );
  const isSeated = seatedUserIds.has(args.userId);
  const unseatedPlayers = playerRows.flatMap((row) =>
    row.user && !seatedUserIds.has(row.user.id)
      ? [{ id: row.user.id, name: row.user.name, image: row.user.image }]
      : [],
  );
  const sides = isIndividualSeatGame(game)
    ? await listGameSides(database, game)
    : [];
  const canPickSeat =
    alreadyOnGame &&
    !isSeated &&
    registrationStatus !== "cancelled" &&
    registrationStatus !== "closed";
  const hasVacantPosition = sides.some(
    (side) => side.left == null || side.right == null,
  );
  let sitsCompleted = false;
  if (isSeated) {
    for (const teamId of myGameTeamIds) {
      if (await sitsOnCompletedMatch(database, game.id, teamId)) {
        sitsCompleted = true;
        break;
      }
    }
  }
  const canMove =
    isSeated &&
    registrationStatus === "open" &&
    hasVacantPosition &&
    !sitsCompleted;
  const levelRange = await viewerLevelRangeFields(
    database,
    game,
    args.userId,
    organizer,
  );
  const pendingLevelRangeRequests = organizer
    ? await listLevelRangeRequests(database, {
        gameId: game.id,
        userId: args.userId,
      })
    : [];

  // `sides[].left/right` per-seat Level band (TEM-177): joined from the
  // existing `ratings` table for every seated User across every side, `null`
  // when the seated User has no Rating yet for this Game's sport.
  const seatedOccupantUserIds = [
    ...new Set(
      sides.flatMap((side) =>
        [side.left?.userId, side.right?.userId].filter(
          (userId): userId is string => Boolean(userId),
        ),
      ),
    ),
  ];
  const ratingSport: "padel" | "football" =
    game.sport === "football" ? "football" : "padel";
  const levelBandByUserId = new Map<string, LevelBand>();
  if (seatedOccupantUserIds.length > 0) {
    const seatedRatingRows = await database.query.ratings.findMany({
      where: and(
        inArray(ratings.userId, seatedOccupantUserIds),
        eq(ratings.sport, ratingSport),
      ),
      columns: { userId: true, levelBand: true },
    });
    for (const row of seatedRatingRows) {
      levelBandByUserId.set(row.userId, row.levelBand);
    }
  }
  const withLevelBand = (occupant: SeatOccupant | null) =>
    occupant
      ? {
          ...occupant,
          levelBand: levelBandByUserId.get(occupant.userId) ?? null,
        }
      : null;
  const sidesWithLevelBand = sides.map((side) => ({
    ...side,
    left: withLevelBand(side.left),
    right: withLevelBand(side.right),
  }));

  // Individual Friendly game (`showsFriendlyRoster`) additive read model
  // (TEM-177): derived `phase`, Match result confirmation state (ADR-0011,
  // TEM-176), and viewer-scoped rating-impact fields for the Final phase.
  // Americano, Friendly tournament, and team_only Games get `null` for all
  // three — this screen's redesign is scoped to individual Friendly games
  // only (`.scratch/game-details-redesign/spec.md`).
  const isIndividualFriendlyGame = showsFriendlyRoster(
    game.format,
    game.registrationMode,
  );
  const friendlyMatch = isIndividualFriendlyGame ? matchRows[0] : undefined;

  const phase: GameDetailsPhase | null =
    isIndividualFriendlyGame && friendlyMatch
      ? individualFriendlyGamePhase({
          game,
          match: {
            status: friendlyMatch.status,
            startTime: friendlyMatch.startTime,
          },
          registeredUserCount: userCount,
          registeredTeamCount: teamCount,
          now,
        })
      : null;

  let matchResultConfirmation: {
    confirmedUserIds: string[];
    requiredUserIds: string[];
    viewerHasConfirmed: boolean;
    // Final-phase-only Score section footer copy (TEM-181): "Confirmed by
    // all four players on [date]." The latest confirmation row's timestamp,
    // not a proxy off `match.updatedAt` (which any unrelated Match edit,
    // e.g. a court change, could also touch) — additive read of an existing
    // column, no schema change.
    confirmedAt: Date | null;
  } | null = null;

  let ratingImpact: {
    levelChange: number;
    newLevel: number;
    newLevelBand: LevelBand;
    isProvisional: boolean;
    ratedMatchesRemainingToConfirm: number | null;
  } | null = null;

  if (isIndividualFriendlyGame && friendlyMatch) {
    const [requiredUserIds, confirmedUserIds] = await Promise.all([
      matchSeatedUserIds(database, friendlyMatch),
      matchResultConfirmedUserIds(database, friendlyMatch.id),
    ]);
    const confirmedAt =
      phase === "final"
        ? await matchResultConfirmationCompletedAt(database, friendlyMatch.id)
        : null;
    matchResultConfirmation = {
      confirmedUserIds,
      requiredUserIds,
      viewerHasConfirmed: confirmedUserIds.includes(args.userId),
      confirmedAt,
    };

    if (phase === "final") {
      const viewerRatingEvent = await database.query.ratingEvents.findFirst({
        where: and(
          eq(ratingEvents.matchId, friendlyMatch.id),
          eq(ratingEvents.userId, args.userId),
        ),
        columns: { muBefore: true, muAfter: true, phiAfter: true },
      });
      if (viewerRatingEvent) {
        const beforeLevel = levelFromMu(viewerRatingEvent.muBefore);
        const afterLevel = levelFromMu(viewerRatingEvent.muAfter);
        const newLevel = Number(formatLevel(afterLevel));
        const levelChange =
          Math.round((newLevel - Number(formatLevel(beforeLevel))) * 10) / 10;
        // ratingEvents stores only before/after μ/φ/σ, not the stored Level
        // band that was in effect immediately before this Match — so the
        // hysteresis anchor is the strict band for the before-Level. This
        // matches applyRatedMatch's own bandWithHysteresis(after, before)
        // shape without reimplementing it.
        const newLevelBand = bandWithHysteresis(
          afterLevel,
          bandFromLevel(beforeLevel),
        );
        const viewerIsProvisional = isProvisional(viewerRatingEvent.phiAfter);
        ratingImpact = {
          levelChange,
          newLevel,
          newLevelBand,
          isProvisional: viewerIsProvisional,
          ratedMatchesRemainingToConfirm: viewerIsProvisional
            ? ratedMatchesRemainingToConfirm(viewerRatingEvent.phiAfter)
            : null,
        };
      }
    }
  }

  return {
    id: game.id,
    name: game.name,
    format: game.format,
    registrationMode: game.registrationMode,
    isPublic: game.isPublic,
    groupId: game.groupId,
    groupName: group?.name ?? null,
    venueId: game.venueId,
    venue: venue
      ? {
          name: venue.name,
          city: venue.city,
          country: venue.country,
          latitude: venue.latitude,
          longitude: venue.longitude,
          archivedAt: venue.archivedAt,
          logoImageUrl: venue.logoImageUrl,
        }
      : null,
    windowStart: game.windowStart,
    windowEnd: game.windowEnd,
    pricePerPlayerCents: game.pricePerPlayerCents,
    levelMinTenths: game.levelMinTenths,
    levelMaxTenths: game.levelMaxTenths,
    playersAllowed: game.playersAllowed,
    teamsAllowed: game.teamsAllowed,
    sport: game.sport,
    cancelledAt: game.cancelledAt,
    registrationClosedAt: game.registrationClosedAt,
    createdBy: game.createdBy,
    createdAt: game.createdAt,
    isOrganizer: organizer,
    viewerUserId: args.userId,
    joinFrozen: await isClubGroupGameJoinFrozen(database, game),
    isRegistered: alreadyOnGame,
    isSeated,
    isWaitlisted,
    waitlistPlace,
    registrationStatus,
    canRegister:
      registrationStatus === "open" &&
      passesGate &&
      levelRange.viewerPassesLevelRange &&
      !alreadyOnGame &&
      !isWaitlisted,
    canWaitlist:
      registrationStatus === "full" &&
      passesGate &&
      levelRange.viewerPassesLevelRange &&
      !alreadyOnGame &&
      !isWaitlisted,
    canPickSeat,
    canMove,
    canLeave: alreadyOnGame || isWaitlisted,
    registeredUserCount: userCount,
    registeredTeamCount: teamCount,
    waitlist: waitlistRows.map((row) => ({
      id: row.id,
      userId: row.userId,
      teamId: row.teamId,
      createdAt: row.createdAt,
      name: row.user?.name ?? row.team?.name ?? "Waitlisted",
      image: row.user?.image ?? null,
    })),
    matches: await Promise.all(
      matchRows.map(async (match) => {
        const onSides =
          Boolean(match.slot1GameTeamId) &&
          Boolean(match.slot2GameTeamId) &&
          (myGameTeamIds.has(match.slot1GameTeamId ?? "") ||
            myGameTeamIds.has(match.slot2GameTeamId ?? ""));
        const frozen =
          match.status === "completed" || match.status === "cancelled";
        const canWriteSets =
          !frozen && game.format !== "americano" && (organizer || onSides);
        const sidesComplete = await bothSlottedTeamsComplete(database, match);
        const outcome = matchOutcome(match.sets);
        return {
          id: match.id,
          startTime: match.startTime,
          endTime: match.endTime,
          durationInMinutes: match.durationInMinutes,
          status: match.status,
          courtId: match.courtId,
          courtName: match.court?.name ?? null,
          slot1GameTeamId: match.slot1GameTeamId,
          slot2GameTeamId: match.slot2GameTeamId,
          bothSlotsFilled: bothSlotsFilled(match),
          bothSidesComplete: sidesComplete,
          canAddSet: canWriteSets && (organizer || onSides),
          canScoreSets: canWriteSets && sidesComplete && (organizer || onSides),
          canComplete:
            !frozen &&
            game.format !== "americano" &&
            (organizer || onSides) &&
            sidesComplete &&
            match.sets.length > 0 &&
            outcome.result !== "none",
          outcome,
          sets: match.sets.map((set) => ({
            id: set.id,
            slot1GamesWon: set.slot1GamesWon,
            slot2GamesWon: set.slot2GamesWon,
            wins: setWinsForGames(set.slot1GamesWon, set.slot2GamesWon),
          })),
        };
      }),
    ),
    gameTeams: teamRows.map((row) => ({
      id: row.id,
      teamId: row.teamId,
      name: row.name,
      sideIndex: row.sideIndex,
      members: row.players.flatMap((link) =>
        link.gamePlayer.user
          ? [
              {
                id: link.gamePlayer.user.id,
                name: link.gamePlayer.user.name,
                image: link.gamePlayer.user.image,
                position: link.position,
              },
            ]
          : [],
      ),
    })),
    sides: sidesWithLevelBand,
    phase,
    matchResultConfirmation,
    ratingImpact,
    unseatedPlayers,
    registeredPlayers: playerRows.flatMap((row) =>
      row.user
        ? [
            {
              id: row.user.id,
              name: row.user.name,
              image: row.user.image,
            },
          ]
        : [],
    ),
    eligibleTeams,
    ...levelRange,
    pendingLevelRangeRequests,
  };
}

export const byId = protectedProcedure
  .input(z.object({ id: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return gameById(ctx.db, { gameId: input.id, userId: appUser.id });
  });
