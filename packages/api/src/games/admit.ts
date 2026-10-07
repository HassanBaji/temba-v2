import { and, eq } from "drizzle-orm";

import { gamePlayers, gameTeams, teamMembers, teams } from "@repo/db";

import {
  FRIENDLY_PLAYERS_ALLOWED,
  FRIENDLY_TEAMS_ALLOWED,
  type GameRow,
  gameAdminUserIds,
  isRegistrationOpen,
  registeredGameTeamCount,
  registeredUserCount,
} from "#src/games/access";
import {
  firstFullyVacantSideIndex,
  insertIndividualPairOnVacantSide,
  isIndividualSeatGame,
  occupySeat,
  remainingCapacity,
} from "#src/games/seats";
import { gameNotificationsSuppressed } from "#src/notifications/game-notifications-suppressed";
import { notify } from "#src/notifications/notify";
import { consult } from "#src/soft-archive";
import { type db } from "#src/db";
import {
  partyUserIdsForAdmit,
  userAllowedByLevelRange,
} from "#src/games/user-allowed-by-level-range";
import type {
  AdmitDb,
  AdmitDoor,
  AdmitParty,
  AdmitResult,
  SeatPosition,
} from "#src/games/utils";

export type {
  AdmitDb,
  AdmitDoor,
  AdmitParty,
  AdmitPlacement,
  AdmitReason,
  AdmitResult,
} from "#src/games/utils";

function writeDb(database: AdmitDb): typeof db {
  return database as typeof db;
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function userOnGame(database: AdmitDb, gameId: string, userId: string) {
  const row = await database.query.gamePlayers.findFirst({
    where: and(eq(gamePlayers.gameId, gameId), eq(gamePlayers.userId, userId)),
    columns: { id: true },
  });
  return Boolean(row);
}

async function notifyGameJoined(
  database: AdmitDb,
  game: GameRow,
  door: AdmitDoor,
  party: { userIds: readonly string[]; teamId?: string },
) {
  if (await gameNotificationsSuppressed(database, game)) {
    return;
  }
  const adminIds = await gameAdminUserIds(database, game);
  await notify(database, {
    type: "game_player_joined",
    recipients: adminIds.map((userId) => ({ userId, audience: "admin" })),
    excludeUserIds: [...party.userIds],
    actorUserId: party.userIds[0],
    partnerUserId: party.userIds[1],
    teamId: party.teamId,
    groupId: game.groupId,
    gameId: game.id,
    viaWaitlist: door === "promote",
  });
}

async function refuseRegisterDoors(
  database: AdmitDb,
  game: GameRow,
  door: AdmitDoor,
  now: Date,
): Promise<AdmitResult | null> {
  const view = await consult(database, {
    clubGroupGame: { groupId: game.groupId },
  });
  if (view.ok && view.freeze("join")) {
    return { ok: false, reason: "join_frozen" };
  }
  if (door === "register" && !isRegistrationOpen(game, now)) {
    return { ok: false, reason: "registration_closed" };
  }
  return null;
}

export async function admit(
  database: AdmitDb,
  args: {
    game: GameRow;
    door: AdmitDoor;
    party: AdmitParty;
    now?: Date;
  },
): Promise<AdmitResult> {
  const now = args.now ?? new Date();
  const closed = await refuseRegisterDoors(database, args.game, args.door, now);
  if (closed) {
    return closed;
  }

  if (args.door === "register") {
    const userIds = await partyUserIdsForAdmit(database, args.party);
    if (userIds) {
      for (const userId of userIds) {
        if (!(await userAllowedByLevelRange(database, args.game, userId))) {
          return { ok: false, reason: "level_range" };
        }
      }
    }
  }

  if (args.party.kind === "user") {
    return admitUser(database, args.game, args.door, args.party);
  }
  if (args.party.kind === "pair") {
    return admitPair(database, args.game, args.door, args.party);
  }
  return admitTeam(database, args.game, args.door, args.party);
}

async function admitUser(
  database: AdmitDb,
  game: GameRow,
  door: AdmitDoor,
  party: Extract<AdmitParty, { kind: "user" }>,
): Promise<AdmitResult> {
  if (await userOnGame(database, game.id, party.userId)) {
    return { ok: false, reason: "already_on_game" };
  }

  if (!party.seat && isIndividualSeatGame(game)) {
    return { ok: false, reason: "seat_required" };
  }

  if (party.seat) {
    if ((await remainingCapacity(writeDb(database), game)) <= 0) {
      return { ok: false, reason: "full" };
    }
    await occupySeat(
      database as Tx,
      game,
      party.userId,
      party.seat.sideIndex,
      party.seat.position,
    );
    await notifyGameJoined(database, game, door, { userIds: [party.userId] });
    return {
      ok: true,
      placement: {
        kind: "user",
        userId: party.userId,
        sideIndex: party.seat.sideIndex,
        position: party.seat.position,
      },
    };
  }

  const userCount = await registeredUserCount(writeDb(database), game.id);
  if (userCount >= (game.playersAllowed ?? FRIENDLY_PLAYERS_ALLOWED)) {
    return { ok: false, reason: "full" };
  }

  await database.insert(gamePlayers).values({
    gameId: game.id,
    userId: party.userId,
  });
  await notifyGameJoined(database, game, door, { userIds: [party.userId] });
  return {
    ok: true,
    placement: { kind: "user", userId: party.userId },
  };
}

async function admitPair(
  database: AdmitDb,
  game: GameRow,
  door: AdmitDoor,
  party: Extract<AdmitParty, { kind: "pair" }>,
): Promise<AdmitResult> {
  for (const userId of party.userIds) {
    if (await userOnGame(database, game.id, userId)) {
      return { ok: false, reason: "already_on_game" };
    }
  }
  if ((await remainingCapacity(writeDb(database), game)) < 2) {
    return { ok: false, reason: "full" };
  }
  await insertIndividualPairOnVacantSide(
    database as Tx,
    game,
    [party.userIds[0], party.userIds[1]],
    party.sideIndex,
    party.callerPosition,
  );
  await notifyGameJoined(database, game, door, { userIds: party.userIds });
  return {
    ok: true,
    placement: {
      kind: "pair",
      userIds: party.userIds,
      sideIndex: party.sideIndex,
    },
  };
}

async function admitTeam(
  database: AdmitDb,
  game: GameRow,
  door: AdmitDoor,
  party: Extract<AdmitParty, { kind: "team" }>,
): Promise<AdmitResult> {
  const team = await database.query.teams.findFirst({
    where: eq(teams.id, party.teamId),
    columns: { id: true },
  });
  if (!team) {
    return { ok: false, reason: "team_not_found" };
  }
  const members = await database.query.teamMembers.findMany({
    where: eq(teamMembers.teamId, party.teamId),
    columns: { userId: true },
  });
  if (members.length !== 2) {
    return { ok: false, reason: "team_incomplete" };
  }
  const existing = await database.query.gameTeams.findFirst({
    where: and(
      eq(gameTeams.gameId, game.id),
      eq(gameTeams.teamId, party.teamId),
    ),
    columns: { id: true },
  });
  if (existing) {
    return { ok: false, reason: "team_already_on_game" };
  }
  for (const member of members) {
    if (await userOnGame(database, game.id, member.userId)) {
      return { ok: false, reason: "already_on_game" };
    }
  }
  const teamCount = await registeredGameTeamCount(writeDb(database), game.id);
  if (teamCount >= (game.teamsAllowed ?? FRIENDLY_TEAMS_ALLOWED)) {
    return { ok: false, reason: "full" };
  }
  const sideIndex = await firstFullyVacantSideIndex(writeDb(database), game);
  if (sideIndex == null) {
    return { ok: false, reason: "no_vacant_side" };
  }

  const positions: SeatPosition[] = ["left", "right"];
  let occupiedTeamId: string | null = null;
  for (const [index, member] of members.entries()) {
    const position = positions[index] ?? "left";
    const occupied = await occupySeat(
      database as Tx,
      game,
      member.userId,
      sideIndex,
      position,
    );
    occupiedTeamId = occupied.id;
  }
  if (occupiedTeamId) {
    await database
      .update(gameTeams)
      .set({ teamId: party.teamId, updatedAt: new Date() })
      .where(eq(gameTeams.id, occupiedTeamId));
  }
  await notifyGameJoined(database, game, door, {
    userIds: members.map((member) => member.userId),
    teamId: party.teamId,
  });

  return {
    ok: true,
    placement: { kind: "team", teamId: party.teamId, sideIndex },
  };
}
