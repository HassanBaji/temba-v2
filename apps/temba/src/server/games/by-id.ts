import { TRPCError } from "@trpc/server";
import { eq, inArray } from "drizzle-orm";

import {
  gamePlayers,
  gameTeams,
  gameWaitlist,
  groups,
  matches,
  teamMembers,
  venues,
} from "@repo/db";

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
import { userAlreadyOnGame } from "~/server/games/helpers/user-already-on-game";
import {
  isIndividualSeatGame,
  listGameSides,
  sitsOnCompletedMatch,
} from "~/server/games/seats";
import {
  bothSlotsFilled,
  bothSlottedTeamsComplete,
  matchOutcome,
  setWinsForGames,
} from "~/server/games/sets";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

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
          partnerIds.map((userId) =>
            userPassesJoinGate(database, game, userId),
          ),
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
          archivedAt: venue.archivedAt,
          logoImageUrl: venue.logoImageUrl,
        }
      : null,
    windowStart: game.windowStart,
    windowEnd: game.windowEnd,
    pricePerPlayerCents: game.pricePerPlayerCents,
    playersAllowed: game.playersAllowed,
    teamsAllowed: game.teamsAllowed,
    sport: game.sport,
    cancelledAt: game.cancelledAt,
    registrationClosedAt: game.registrationClosedAt,
    createdBy: game.createdBy,
    createdAt: game.createdAt,
    isOrganizer: organizer,
    joinFrozen: await isClubGroupGameJoinFrozen(database, game),
    isRegistered: alreadyOnGame,
    isSeated,
    isWaitlisted,
    registrationStatus,
    canRegister:
      registrationStatus === "open" &&
      passesGate &&
      !alreadyOnGame &&
      !isWaitlisted,
    canWaitlist:
      registrationStatus === "full" &&
      passesGate &&
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
    sides,
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
  };
}
