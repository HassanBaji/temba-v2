import { TRPCError } from "@trpc/server";
import { and, eq, or } from "drizzle-orm";

import {
  MatchStatusEnum,
  gamePlayers,
  gameTeamPlayers,
  gameTeams,
  matches,
} from "@repo/db";

import { isRosterRegistrationGame } from "@repo/domain/game-shape";
import { type Locale, DEFAULT_LOCALE } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { type db } from "#src/db";
import {
  FRIENDLY_PLAYERS_ALLOWED,
  type GameRow,
  registeredUserCount,
} from "#src/games/access";
import { isPoolDrawPosted } from "#src/games/assert-pool-draw-not-posted";
import type {
  GameSide,
  SeatChoice,
  SeatOccupant,
  SeatPosition,
  VacatedSeat,
} from "#src/games/utils";

export type {
  GameSide,
  SeatChoice,
  SeatOccupant,
  SeatPosition,
  VacatedSeat,
} from "#src/games/utils";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DbClient = typeof db | Tx;

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

export async function firstVacantPosition(database: DbClient, game: GameRow) {
  const vacant = vacantPositionsFromSides(await listGameSides(database, game));
  return vacant[0] ?? null;
}

export function isIndividualSeatGame(game: GameRow) {
  return (
    game.registrationMode === "individual" &&
    (game.format === "friendly_game" ||
      game.format === "friendly_tournament") &&
    !isRosterRegistrationGame(game)
  );
}

export function assertGameHasSeats(game: GameRow, locale: Locale) {
  if (isRosterRegistrationGame(game)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).createGame.rosterNoSeats,
    });
  }
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
  locale: Locale = DEFAULT_LOCALE,
) {
  const n = sideCount(game);
  if (sideIndex < 1 || sideIndex > n) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).game.errors.sideNotOnGame,
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
      message: messagesFor(locale).game.errors.sideHasUser,
    });
  }
}

function seatOccupant(link: {
  eitherSide: boolean;
  sideSetBy: string | null;
  gamePlayer: {
    user: { id: string; name: string; image: string | null } | null;
  } | null;
}): SeatOccupant | null {
  const occupant = link.gamePlayer?.user;
  if (!occupant) {
    return null;
  }
  return {
    userId: occupant.id,
    name: occupant.name,
    image: occupant.image,
    eitherSide: link.eitherSide,
    sideSetByUserId: link.sideSetBy,
  };
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
        columns: {
          gamePlayerId: true,
          position: true,
          eitherSide: true,
          sideSetBy: true,
        },
        with: {
          gamePlayer: {
            columns: { id: true },
            with: {
              user: { columns: { id: true, name: true, image: true } },
            },
          },
        },
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
        const occupant = seatOccupant(link);
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

async function gameTeamPlayerCount(database: DbClient, gameTeamId: string) {
  const links = await database.query.gameTeamPlayers.findMany({
    where: eq(gameTeamPlayers.gameTeamId, gameTeamId),
    columns: { id: true },
  });
  return links.length;
}

type TeamSeatLink = {
  id: string;
  position: SeatPosition | null;
  eitherSide: boolean;
};

async function teamSeatLinks(
  database: DbClient,
  gameTeamId: string,
): Promise<TeamSeatLink[]> {
  return database.query.gameTeamPlayers.findMany({
    where: eq(gameTeamPlayers.gameTeamId, gameTeamId),
    columns: { id: true, position: true, eitherSide: true },
  });
}

function throwPositionOccupied(locale: Locale = DEFAULT_LOCALE): never {
  throw new TRPCError({
    code: "CONFLICT",
    message: messagesFor(locale).game.errors.positionOccupied,
  });
}

/**
 * Where a joiner sits on a Game team that has at most one User. Either side is
 * the joiner's own answer and stays theirs: next to a User who picked a
 * Position they take the other one ("auto"), next to another Either-side
 * User nobody has a side yet. A joiner who picks the Position an Either-side
 * User holds moves that User to the other one; a picked Position is never
 * taken.
 */
export function resolveTeamSeat(
  partner: { position: SeatPosition | null; eitherSide: boolean } | null,
  choice: SeatChoice,
):
  | {
      ok: true;
      position: SeatPosition;
      eitherSide: boolean;
      movePartnerTo: SeatPosition | null;
    }
  | { ok: false } {
  const eitherSide = choice === "either";
  if (!partner) {
    return {
      ok: true,
      position: eitherSide ? "left" : choice,
      eitherSide,
      movePartnerTo: null,
    };
  }
  const partnerPosition = partner.position ?? "left";
  if (choice === "either" || choice !== partnerPosition) {
    return {
      ok: true,
      position: otherPosition(partnerPosition),
      eitherSide,
      movePartnerTo: null,
    };
  }
  if (!partner.eitherSide) {
    return { ok: false };
  }
  return {
    ok: true,
    position: choice,
    eitherSide: false,
    movePartnerTo: otherPosition(choice),
  };
}

async function claimTeamSeat(
  database: Tx,
  gameTeamId: string,
  choice: SeatChoice,
  locale: Locale = DEFAULT_LOCALE,
) {
  const links = await teamSeatLinks(database, gameTeamId);
  if (links.length >= 2) {
    throw new TRPCError({
      code: "CONFLICT",
      message: messagesFor(locale).game.errors.sideHasTwoUsers,
    });
  }
  const partner = links[0] ?? null;
  const seat = resolveTeamSeat(partner, choice);
  if (!seat.ok) {
    throwPositionOccupied(locale);
  }
  if (partner && seat.movePartnerTo) {
    await database
      .update(gameTeamPlayers)
      .set({ position: seat.movePartnerTo, updatedAt: new Date() })
      .where(eq(gameTeamPlayers.id, partner.id));
  }
  return { position: seat.position, eitherSide: seat.eitherSide };
}

export async function occupySeat(
  database: Tx,
  game: GameRow,
  userId: string,
  sideIndex: number,
  choice: SeatChoice,
  existingPlayerId?: string,
  locale: Locale = DEFAULT_LOCALE,
) {
  const n = sideCount(game);
  if (sideIndex < 1 || sideIndex > n) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).game.errors.sideNotOnGame,
    });
  }
  if (choice === "either" && game.format !== "friendly_game") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).game.errors.tournamentPosition,
    });
  }

  let team = await database.query.gameTeams.findFirst({
    where: and(
      eq(gameTeams.gameId, game.id),
      eq(gameTeams.sideIndex, sideIndex),
    ),
  });

  if (!team) {
    // DO NOTHING rather than catching the unique violation: a failed statement
    // aborts the transaction, so nothing could read the winner's row after it.
    const [created] = await database
      .insert(gameTeams)
      .values({
        gameId: game.id,
        sideIndex,
      })
      .onConflictDoNothing()
      .returning();
    const existing =
      created ??
      (await database.query.gameTeams.findFirst({
        where: and(
          eq(gameTeams.gameId, game.id),
          eq(gameTeams.sideIndex, sideIndex),
        ),
      }));
    if (!existing) {
      throwPositionOccupied(locale);
    }
    team = existing;
    if (game.format === "friendly_game") {
      await setFriendlyMatchSlotForSide(database, game.id, sideIndex, team.id);
    }
  }

  const seat = await claimTeamSeat(database, team.id, choice, locale);

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

  const [seated] = await database
    .insert(gameTeamPlayers)
    .values({
      gameTeamId: team.id,
      gamePlayerId: playerId,
      position: seat.position,
      eitherSide: seat.eitherSide,
    })
    .onConflictDoNothing()
    .returning({ id: gameTeamPlayers.id });
  if (!seated) {
    throwPositionOccupied(locale);
  }

  return Object.assign(team, { position: seat.position });
}

export async function insertIndividualPairOnVacantSide(
  database: Tx,
  game: GameRow,
  userIds: [string, string],
  sideIndex: number,
  callerPosition: SeatPosition,
  locale: Locale = DEFAULT_LOCALE,
) {
  await assertFullyVacantSide(database, game, sideIndex, locale);
  const partnerPosition = otherPosition(callerPosition);
  await occupySeat(
    database,
    game,
    userIds[0],
    sideIndex,
    callerPosition,
    undefined,
    locale,
  );
  await occupySeat(
    database,
    game,
    userIds[1],
    sideIndex,
    partnerPosition,
    undefined,
    locale,
  );
}

export async function vacateSeat(
  database: Tx,
  game: GameRow,
  userId: string,
  notRegisteredMessage: string,
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
  if (remaining === 0 && !isPoolDrawPosted(game)) {
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
  locale: Locale = DEFAULT_LOCALE,
) {
  const n = sideCount(game);
  if (sideIndex < 1 || sideIndex > n) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).game.errors.sideNotOnGame,
    });
  }

  const player = await database.query.gamePlayers.findFirst({
    where: and(eq(gamePlayers.gameId, game.id), eq(gamePlayers.userId, userId)),
  });
  if (!player) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).game.errors.notSeated,
    });
  }
  const link = await database.query.gameTeamPlayers.findFirst({
    where: eq(gameTeamPlayers.gamePlayerId, player.id),
  });
  if (!link) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).game.errors.notSeated,
    });
  }

  const team = await database.query.gameTeams.findFirst({
    where: eq(gameTeams.id, link.gameTeamId),
    columns: { id: true, sideIndex: true },
  });
  if (team?.sideIndex === sideIndex && link.position === position) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).game.errors.alreadyInPosition,
    });
  }

  if (await sitsOnCompletedMatch(database, game.id, link.gameTeamId)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: messagesFor(locale).game.errors.moveAfterCompleted,
    });
  }

  const destTeam = await database.query.gameTeams.findFirst({
    where: and(
      eq(gameTeams.gameId, game.id),
      eq(gameTeams.sideIndex, sideIndex),
    ),
    columns: { id: true },
  });
  if (destTeam) {
    const others = (await teamSeatLinks(database, destTeam.id)).filter(
      (other) => other.id !== link.id,
    );
    if (
      others.length >= 2 ||
      !resolveTeamSeat(others[0] ?? null, position).ok
    ) {
      throwPositionOccupied(locale);
    }
  }

  await database.delete(gameTeamPlayers).where(eq(gameTeamPlayers.id, link.id));
  const remaining = await gameTeamPlayerCount(database, link.gameTeamId);
  if (remaining === 0) {
    await clearMatchSlotsForGameTeam(database, link.gameTeamId);
    await database.delete(gameTeams).where(eq(gameTeams.id, link.gameTeamId));
  }

  await occupySeat(
    database,
    game,
    userId,
    sideIndex,
    position,
    player.id,
    locale,
  );
}

async function requireOwnSeatLink(
  database: Tx,
  game: GameRow,
  userId: string,
  locale: Locale = DEFAULT_LOCALE,
) {
  const player = await database.query.gamePlayers.findFirst({
    where: and(eq(gamePlayers.gameId, game.id), eq(gamePlayers.userId, userId)),
    columns: { id: true },
  });
  const link = player
    ? await database.query.gameTeamPlayers.findFirst({
        where: eq(gameTeamPlayers.gamePlayerId, player.id),
        columns: { id: true, gameTeamId: true },
      })
    : undefined;
  if (!link) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).game.errors.notSeated,
    });
  }
  return link;
}

async function teamPartnerLink(
  database: Tx,
  gameTeamId: string,
  ownLinkId: string,
) {
  const links = await database.query.gameTeamPlayers.findMany({
    where: eq(gameTeamPlayers.gameTeamId, gameTeamId),
    columns: { id: true, position: true, eitherSide: true },
    with: { gamePlayer: { columns: { userId: true } } },
  });
  return links.find((link) => link.id !== ownLinkId) ?? null;
}

/** Writes two Positions on one Game team without tripping the unique index. */
async function placeLinks(
  database: Tx,
  rows: {
    id: string;
    position: SeatPosition;
    eitherSide: boolean;
    sideSetBy: string | null;
  }[],
) {
  const now = new Date();
  for (const row of rows) {
    await database
      .update(gameTeamPlayers)
      .set({ position: null, updatedAt: now })
      .where(eq(gameTeamPlayers.id, row.id));
  }
  for (const row of rows) {
    await database
      .update(gameTeamPlayers)
      .set({
        position: row.position,
        eitherSide: row.eitherSide,
        sideSetBy: row.sideSetBy,
        updatedAt: now,
      })
      .where(eq(gameTeamPlayers.id, row.id));
  }
}

/**
 * A seated User changes their own side. Picking the Position an Either-side
 * partner holds moves the partner over; a Position the partner picked is
 * refused. Returns the partner when their Position changed, so they can be told.
 */
export async function changeOwnSide(
  database: Tx,
  game: GameRow,
  userId: string,
  choice: SeatChoice,
  locale: Locale = DEFAULT_LOCALE,
): Promise<{ movedPartnerUserId: string | null }> {
  const own = await requireOwnSeatLink(database, game, userId, locale);
  const partner = await teamPartnerLink(database, own.gameTeamId, own.id);
  const seat = resolveTeamSeat(partner, choice);
  if (!seat.ok) {
    throw new TRPCError({
      code: "CONFLICT",
      message: messagesFor(locale).game.errors.partnerPickedSide,
    });
  }
  const rows: Parameters<typeof placeLinks>[1] = [
    {
      id: own.id,
      position: seat.position,
      eitherSide: seat.eitherSide,
      sideSetBy: null,
    },
  ];
  if (partner && seat.movePartnerTo) {
    rows.push({
      id: partner.id,
      position: seat.movePartnerTo,
      eitherSide: partner.eitherSide,
      sideSetBy: null,
    });
  }
  await placeLinks(database, rows);
  return {
    movedPartnerUserId: seat.movePartnerTo
      ? (partner?.gamePlayer.userId ?? null)
      : null,
  };
}

/**
 * An Organizer writes a full Game team's sides on the sheet: `leftUserId`
 * plays left, the other User right. Both are then settled, set by the Organizer.
 */
export async function setTeamSides(
  database: Tx,
  game: GameRow,
  args: {
    sideIndex: number;
    leftUserId: string;
    organizerUserId: string;
    locale?: Locale;
  },
): Promise<{ userIds: string[] }> {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const team = await database.query.gameTeams.findFirst({
    where: and(
      eq(gameTeams.gameId, game.id),
      eq(gameTeams.sideIndex, args.sideIndex),
    ),
    columns: { id: true },
    with: {
      players: {
        columns: { id: true },
        with: { gamePlayer: { columns: { userId: true } } },
      },
    },
  });
  if (team?.players.length !== 2) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).game.errors.sidesOnFullTeam,
    });
  }
  if (
    !team.players.some((link) => link.gamePlayer.userId === args.leftUserId)
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).game.errors.userNotOnGameTeam,
    });
  }
  if (await sitsOnCompletedMatch(database, game.id, team.id)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: messagesFor(locale).game.errors.theMatchCompleted,
    });
  }
  await placeLinks(
    database,
    team.players.map((link) => ({
      id: link.id,
      position: link.gamePlayer.userId === args.leftUserId ? "left" : "right",
      eitherSide: false,
      sideSetBy: args.organizerUserId,
    })),
  );
  return {
    userIds: team.players.flatMap((link) =>
      link.gamePlayer.userId ? [link.gamePlayer.userId] : [],
    ),
  };
}
