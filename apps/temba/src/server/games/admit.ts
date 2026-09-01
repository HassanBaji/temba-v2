import { and, eq } from "drizzle-orm";

import { gamePlayers, gameTeams, teamMembers, teams } from "@repo/db";

import {
  FRIENDLY_PLAYERS_ALLOWED,
  FRIENDLY_TEAMS_ALLOWED,
  type GameRow,
  isRegistrationOpen,
  registeredGameTeamCount,
  registeredUserCount,
} from "~/server/games/access";
import {
  firstFullyVacantSideIndex,
  insertIndividualPairOnVacantSide,
  isIndividualSeatGame,
  occupySeat,
  remainingCapacity,
} from "~/server/games/seats";
import { consult } from "~/server/soft-archive";
import { type db } from "~/server/db";
import type {
  AdmitDb,
  AdmitDoor,
  AdmitParty,
  AdmitResult,
  SeatPosition,
} from "~/server/games/utils";

export type {
  AdmitDb,
  AdmitDoor,
  AdmitParty,
  AdmitPlacement,
  AdmitReason,
  AdmitResult,
} from "~/server/games/utils";

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

  if (args.party.kind === "user") {
    return admitUser(database, args.game, args.party);
  }
  if (args.party.kind === "pair") {
    return admitPair(database, args.game, args.party);
  }
  return admitTeam(database, args.game, args.party);
}

async function admitUser(
  database: AdmitDb,
  game: GameRow,
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
  return {
    ok: true,
    placement: { kind: "user", userId: party.userId },
  };
}

async function admitPair(
  database: AdmitDb,
  game: GameRow,
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

  return {
    ok: true,
    placement: { kind: "team", teamId: party.teamId, sideIndex },
  };
}
