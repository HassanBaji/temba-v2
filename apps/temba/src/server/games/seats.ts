import { TRPCError } from "@trpc/server";
import { and, eq, or } from "drizzle-orm";

import {
  MatchStatusEnum,
  gamePlayers,
  gameTeamPlayers,
  gameTeams,
  matches,
} from "@repo/db";

import { type db } from "~/server/db";
import {
  FRIENDLY_PLAYERS_ALLOWED,
  type GameRow,
  registeredUserCount,
} from "~/server/games/access";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DbClient = typeof db | Tx;

export type SeatPosition = "left" | "right";

export type SeatOccupant = {
  userId: string;
  name: string;
};

export type GameSide = {
  sideIndex: number;
  gameTeamId: string | null;
  left: SeatOccupant | null;
  right: SeatOccupant | null;
};

export function vacantPositionsFromSides(sides: GameSide[]) {
  const vacant: { sideIndex: number; position: SeatPosition }[] = [];
  for (const side of sides) {
    if (side.left == null) {
      vacant.push({ sideIndex: side.sideIndex, position: "left" });
    }
    if (side.right == null) {
      vacant.push({ sideIndex: side.sideIndex, position: "right" });
    }
  }
  return vacant;
}

export function isIndividualSeatGame(game: GameRow) {
  return (
    game.registrationMode === "individual" &&
    (game.format === "friendly_game" || game.format === "friendly_tournament")
  );
}

export function sideCount(game: GameRow) {
  if (game.format === "friendly_game") {
    return 2;
  }
  return Math.max(
    2,
    Math.floor((game.playersAllowed ?? FRIENDLY_PLAYERS_ALLOWED) / 2),
  );
}

export function otherPosition(position: SeatPosition): SeatPosition {
  return position === "left" ? "right" : "left";
}

export async function highestOccupiedSideIndex(
  database: DbClient,
  gameId: string,
) {
  const teams = await database.query.gameTeams.findMany({
    where: eq(gameTeams.gameId, gameId),
    columns: { sideIndex: true },
  });
  const indexes = teams
    .map((row) => row.sideIndex)
    .filter((value): value is number => value != null);
  if (indexes.length === 0) {
    return null;
  }
  return Math.max(...indexes);
}

export async function firstFullyVacantSideIndex(
  database: DbClient,
  game: GameRow,
) {
  const n = sideCount(game);
  const teams = await database.query.gameTeams.findMany({
    where: eq(gameTeams.gameId, game.id),
    columns: { sideIndex: true },
  });
  const occupied = new Set(
    teams
      .map((row) => row.sideIndex)
      .filter((value): value is number => value != null),
  );
  for (let sideIndex = 1; sideIndex <= n; sideIndex += 1) {
    if (!occupied.has(sideIndex)) {
      return sideIndex;
    }
  }
  return null;
}

export async function assertFullyVacantSide(
  database: DbClient,
  game: GameRow,
  sideIndex: number,
) {
  const n = sideCount(game);
  if (sideIndex < 1 || sideIndex > n) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "That side is not on this Game",
    });
  }
  const team = await database.query.gameTeams.findFirst({
    where: and(
      eq(gameTeams.gameId, game.id),
      eq(gameTeams.sideIndex, sideIndex),
    ),
    columns: { id: true },
  });
  if (team) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "That side already has a User",
    });
  }
}

async function requirePlayerUser(
  database: DbClient,
  gamePlayerId: string,
): Promise<SeatOccupant | null> {
  const player = await database.query.gamePlayers.findFirst({
    where: eq(gamePlayers.id, gamePlayerId),
    with: {
      user: { columns: { id: true, name: true } },
    },
  });
  if (!player?.user) {
    return null;
  }
  return { userId: player.user.id, name: player.user.name };
}

export async function listGameSides(
  database: DbClient,
  game: GameRow,
): Promise<GameSide[]> {
  const n = sideCount(game);
  const teams = await database.query.gameTeams.findMany({
    where: eq(gameTeams.gameId, game.id),
    with: {
      players: {
        columns: { gamePlayerId: true, position: true },
      },
    },
  });
  const bySide = new Map<number, (typeof teams)[number]>();
  for (const team of teams) {
    if (team.sideIndex != null) {
      bySide.set(team.sideIndex, team);
    }
  }

  const sides: GameSide[] = [];
  for (let sideIndex = 1; sideIndex <= n; sideIndex += 1) {
    const team = bySide.get(sideIndex) ?? null;
    let left: SeatOccupant | null = null;
    let right: SeatOccupant | null = null;
    if (team) {
      for (const link of team.players) {
        const occupant = await requirePlayerUser(database, link.gamePlayerId);
        if (!occupant) {
          continue;
        }
        if (link.position === "left") {
          left = occupant;
        } else if (link.position === "right") {
          right = occupant;
        }
      }
    }
    sides.push({
      sideIndex,
      gameTeamId: team?.id ?? null,
      left,
      right,
    });
  }
  return sides;
}

async function clearMatchSlotsForGameTeam(database: Tx, gameTeamId: string) {
  await database
    .update(matches)
    .set({ slot1GameTeamId: null, updatedAt: new Date() })
    .where(eq(matches.slot1GameTeamId, gameTeamId));
  await database
    .update(matches)
    .set({ slot2GameTeamId: null, updatedAt: new Date() })
    .where(eq(matches.slot2GameTeamId, gameTeamId));
}

export async function setFriendlyMatchSlotForSide(
  database: Tx,
  gameId: string,
  sideIndex: number,
  gameTeamId: string,
) {
  if (sideIndex !== 1 && sideIndex !== 2) {
    return;
  }
  const match = await database.query.matches.findFirst({
    where: eq(matches.gameId, gameId),
    columns: { id: true },
  });
  if (!match) {
    return;
  }
  if (sideIndex === 1) {
    await database
      .update(matches)
      .set({ slot1GameTeamId: gameTeamId, updatedAt: new Date() })
      .where(eq(matches.id, match.id));
    return;
  }
  await database
    .update(matches)
    .set({ slot2GameTeamId: gameTeamId, updatedAt: new Date() })
    .where(eq(matches.id, match.id));
}

async function occupantAt(
  database: DbClient,
  gameTeamId: string,
  position: SeatPosition,
) {
  const link = await database.query.gameTeamPlayers.findFirst({
    where: and(
      eq(gameTeamPlayers.gameTeamId, gameTeamId),
      eq(gameTeamPlayers.position, position),
    ),
    columns: { id: true },
  });
  return Boolean(link);
}

async function gameTeamPlayerCount(database: DbClient, gameTeamId: string) {
  const links = await database.query.gameTeamPlayers.findMany({
    where: eq(gameTeamPlayers.gameTeamId, gameTeamId),
    columns: { id: true },
  });
  return links.length;
}

export async function occupySeat(
  database: Tx,
  game: GameRow,
  userId: string,
  sideIndex: number,
  position: SeatPosition,
  existingPlayerId?: string,
) {
  const n = sideCount(game);
  if (sideIndex < 1 || sideIndex > n) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "That side is not on this Game",
    });
  }

  let team = await database.query.gameTeams.findFirst({
    where: and(
      eq(gameTeams.gameId, game.id),
      eq(gameTeams.sideIndex, sideIndex),
    ),
  });

  if (team) {
    const count = await gameTeamPlayerCount(database, team.id);
    if (count >= 2) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "That side already has two Users",
      });
    }
    if (await occupantAt(database, team.id, position)) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "That Position is occupied",
      });
    }
  } else {
    const [created] = await database
      .insert(gameTeams)
      .values({
        gameId: game.id,
        sideIndex,
      })
      .returning();
    if (!created) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to register on this Game",
      });
    }
    team = created;
    if (game.format === "friendly_game") {
      await setFriendlyMatchSlotForSide(database, game.id, sideIndex, team.id);
    }
  }

  let playerId = existingPlayerId;
  if (!playerId) {
    const [player] = await database
      .insert(gamePlayers)
      .values({ gameId: game.id, userId })
      .returning();
    if (!player) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to register on this Game",
      });
    }
    playerId = player.id;
  }

  await database.insert(gameTeamPlayers).values({
    gameTeamId: team.id,
    gamePlayerId: playerId,
    position,
  });

  return team;
}

export async function insertIndividualPairOnVacantSide(
  database: Tx,
  game: GameRow,
  userIds: [string, string],
  sideIndex: number,
  callerPosition: SeatPosition,
) {
  await assertFullyVacantSide(database, game, sideIndex);
  const partnerPosition = otherPosition(callerPosition);
  await occupySeat(database, game, userIds[0], sideIndex, callerPosition);
  await occupySeat(database, game, userIds[1], sideIndex, partnerPosition);
}

export type VacatedSeat = {
  sideIndex: number;
  position: SeatPosition;
};

export async function vacateSeat(
  database: Tx,
  game: GameRow,
  userId: string,
  notRegisteredMessage = "You are not registered on this Game",
): Promise<VacatedSeat | null> {
  const player = await database.query.gamePlayers.findFirst({
    where: and(eq(gamePlayers.gameId, game.id), eq(gamePlayers.userId, userId)),
  });
  if (!player) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: notRegisteredMessage,
    });
  }

  const link = await database.query.gameTeamPlayers.findFirst({
    where: eq(gameTeamPlayers.gamePlayerId, player.id),
  });
  if (!link) {
    await database.delete(gamePlayers).where(eq(gamePlayers.id, player.id));
    return null;
  }

  const team = await database.query.gameTeams.findFirst({
    where: eq(gameTeams.id, link.gameTeamId),
    columns: { id: true, sideIndex: true },
  });
  const position = link.position;
  const sideIndex = team?.sideIndex ?? null;

  await database.delete(gameTeamPlayers).where(eq(gameTeamPlayers.id, link.id));
  await database.delete(gamePlayers).where(eq(gamePlayers.id, player.id));

  const remaining = await gameTeamPlayerCount(database, link.gameTeamId);
  if (remaining === 0) {
    await clearMatchSlotsForGameTeam(database, link.gameTeamId);
    await database.delete(gameTeams).where(eq(gameTeams.id, link.gameTeamId));
  }

  if (sideIndex == null || (position !== "left" && position !== "right")) {
    return null;
  }
  return { sideIndex, position };
}

export async function remainingCapacity(database: DbClient, game: GameRow) {
  const userCount = await registeredUserCount(database, game.id);
  const cap = game.playersAllowed ?? FRIENDLY_PLAYERS_ALLOWED;
  return cap - userCount;
}

export async function sitsOnCompletedMatch(
  database: DbClient,
  gameId: string,
  gameTeamId: string,
) {
  const completed = await database.query.matches.findFirst({
    where: and(
      eq(matches.gameId, gameId),
      eq(matches.status, MatchStatusEnum.COMPLETED),
      or(
        eq(matches.slot1GameTeamId, gameTeamId),
        eq(matches.slot2GameTeamId, gameTeamId),
      ),
    ),
    columns: { id: true },
  });
  return Boolean(completed);
}

export async function moveToSeat(
  database: Tx,
  game: GameRow,
  userId: string,
  sideIndex: number,
  position: SeatPosition,
) {
  const n = sideCount(game);
  if (sideIndex < 1 || sideIndex > n) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "That side is not on this Game",
    });
  }

  const player = await database.query.gamePlayers.findFirst({
    where: and(eq(gamePlayers.gameId, game.id), eq(gamePlayers.userId, userId)),
  });
  if (!player) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "You are not seated on this Game",
    });
  }
  const link = await database.query.gameTeamPlayers.findFirst({
    where: eq(gameTeamPlayers.gamePlayerId, player.id),
  });
  if (!link) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "You are not seated on this Game",
    });
  }

  const team = await database.query.gameTeams.findFirst({
    where: eq(gameTeams.id, link.gameTeamId),
    columns: { id: true, sideIndex: true },
  });
  if (team?.sideIndex === sideIndex && link.position === position) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "You are already in that Position",
    });
  }

  if (await sitsOnCompletedMatch(database, game.id, link.gameTeamId)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You cannot move after sitting on a completed Match",
    });
  }

  const destTeam = await database.query.gameTeams.findFirst({
    where: and(
      eq(gameTeams.gameId, game.id),
      eq(gameTeams.sideIndex, sideIndex),
    ),
    columns: { id: true },
  });
  if (destTeam && (await occupantAt(database, destTeam.id, position))) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "That Position is occupied",
    });
  }

  await database.delete(gameTeamPlayers).where(eq(gameTeamPlayers.id, link.id));
  const remaining = await gameTeamPlayerCount(database, link.gameTeamId);
  if (remaining === 0) {
    await clearMatchSlotsForGameTeam(database, link.gameTeamId);
    await database.delete(gameTeams).where(eq(gameTeams.id, link.gameTeamId));
  }

  await occupySeat(database, game, userId, sideIndex, position, player.id);
}
