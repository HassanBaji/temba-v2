import { TRPCError } from "@trpc/server";

import {
  AMERICANO_PLAYER_MAX,
  AMERICANO_PLAYER_MIN,
  americanoPlayersOfTeamCount,
  americanoTeamCountOfPlayers,
  isAmericano,
  isAmericanoPlayerCount,
} from "@repo/domain/tournament-americano";
import { desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { type Locale, DEFAULT_LOCALE } from "@repo/i18n/locale";

import { gamePlayers, gameTeams, gameWaitlist, games } from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import {
  FRIENDLY_PLAYERS_ALLOWED,
  FRIENDLY_TEAMS_ALLOWED,
  assertGameOrganizer,
  lockGameForAdmit,
  registeredGameTeamCount,
  registeredUserCount,
  requireGame,
  requireNotChallengeGame,
  type GameRow,
} from "#src/games/access";
import { footballSides } from "#src/games/football-lineup";
import { notify } from "#src/notifications/notify";
import { promoteWaitlist } from "#src/games/promote-waitlist";
import { removeGameTeamAndPlayers } from "#src/games/remove-game-team-and-players";
import { firstVacantPosition, isIndividualSeatGame } from "#src/games/seats";
import {
  footballPlayersAllowedBounds,
  isFootballGame,
  isFootballSideSize,
} from "@repo/domain/game-shape";
import { tournamentTeamCountFits } from "@repo/domain/tournament-resize";
import { isPartnerRequiredGame } from "@repo/domain/tournament-rounds";
import { messagesFor } from "@repo/i18n/messages";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DbClient = typeof db | Tx;

/**
 * Dropping players allowed under the joined count moves the latest joiners
 * to the Waitlist, latest first. Each keeps the moment they joined as their
 * place in the queue, so they are ahead of anyone who waitlisted after them
 * and get a spot back as soon as one opens.
 */
async function moveLatestJoinersToWaitlist(
  database: DbClient,
  gameId: string,
  count: number,
) {
  if (count <= 0) {
    return [];
  }
  const latest = await database.query.gamePlayers.findMany({
    where: eq(gamePlayers.gameId, gameId),
    columns: { id: true, userId: true, createdAt: true },
    orderBy: [desc(gamePlayers.createdAt), desc(gamePlayers.id)],
    limit: count,
  });
  for (const player of latest) {
    await database.delete(gamePlayers).where(eq(gamePlayers.id, player.id));
    if (player.userId) {
      await database.insert(gameWaitlist).values({
        gameId,
        userId: player.userId,
        createdAt: player.createdAt,
      });
    }
  }
  return latest.flatMap((player) => (player.userId ? [player.userId] : []));
}

async function updateFootballShape(
  database: DbClient,
  game: GameRow,
  input: { playersAllowed?: number; sideSize?: number; locale?: Locale },
) {
  const locale = input.locale ?? DEFAULT_LOCALE;
  const sideSize = input.sideSize ?? game.sideSize;
  const playersAllowed = input.playersAllowed ?? game.playersAllowed;
  if (sideSize == null || playersAllowed == null) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).game.errors.setPlayersAllowed,
    });
  }
  if (!isFootballSideSize(sideSize)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).game.errors.sideSize,
    });
  }
  const bounds = footballPlayersAllowedBounds(sideSize);
  if (playersAllowed < bounds.min || playersAllowed > bounds.max) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).game.errors.playersBetween(
        bounds.min,
        bounds.max,
      ),
    });
  }
  const userCount = await registeredUserCount(database, game.id);
  const sidesSet = await footballSides(database, game.id);
  if (
    (sidesSet.slot1 || sidesSet.slot2) &&
    (sideSize !== game.sideSize || playersAllowed < userCount)
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).game.errors.sidesSet,
    });
  }
  const movedToWaitlist = await moveLatestJoinersToWaitlist(
    database,
    game.id,
    userCount - playersAllowed,
  );
  await database
    .update(games)
    .set({ playersAllowed, sideSize, updatedAt: new Date() })
    .where(eq(games.id, game.id));
  return movedToWaitlist;
}

/**
 * A Friendly tournament's team count, until the draw is posted. Its Game
 * teams keep their place by when their first player joined; the latest teams
 * past the new count move to the Waitlist, each player keeping the moment
 * they joined. The teams that stay fill sides 1 to the new count, so a team
 * on a side that no longer exists moves to the lowest free one.
 */
async function resizeTournament(
  database: Tx,
  game: GameRow,
  teamCount: number | null,
  locale: Locale,
): Promise<string[]> {
  const m = messagesFor(locale).game.errors;
  if (game.drawPostedAt != null) {
    throw new TRPCError({ code: "BAD_REQUEST", message: m.teamsAfterDraw });
  }
  if (
    teamCount == null ||
    !Number.isInteger(teamCount) ||
    !tournamentTeamCountFits(game, teamCount)
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: m.teamsNotForShape(teamCount ?? 0),
    });
  }

  const teams = await database.query.gameTeams.findMany({
    where: eq(gameTeams.gameId, game.id),
    columns: { id: true, sideIndex: true },
    with: {
      players: {
        columns: { id: true },
        with: {
          gamePlayer: { columns: { id: true, userId: true, createdAt: true } },
        },
      },
    },
  });
  const occupied = teams
    .map((team) => {
      const players = team.players.flatMap((link) =>
        link.gamePlayer ? [link.gamePlayer] : [],
      );
      return {
        id: team.id,
        sideIndex: team.sideIndex,
        players,
        joinedAt: Math.min(
          ...players.map((player) => player.createdAt.getTime()),
        ),
      };
    })
    .filter((team) => team.players.length > 0)
    .sort(
      (left, right) =>
        left.joinedAt - right.joinedAt ||
        (left.sideIndex ?? Infinity) - (right.sideIndex ?? Infinity),
    );
  const staying = occupied.slice(0, teamCount);
  const leaving = occupied.slice(teamCount);
  if (leaving.length > 0 && isPartnerRequiredGame(game)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: m.teamsBelowJoinedPairsOnly(occupied.length),
    });
  }

  const movedToWaitlist: string[] = [];
  for (const team of leaving) {
    await removeGameTeamAndPlayers(database, team.id);
    for (const player of team.players) {
      if (!player.userId) {
        continue;
      }
      await database.insert(gameWaitlist).values({
        gameId: game.id,
        userId: player.userId,
        createdAt: player.createdAt,
      });
      movedToWaitlist.push(player.userId);
    }
  }
  const emptyTeamIds = teams
    .filter((team) => team.players.length === 0)
    .map((team) => team.id);
  if (emptyTeamIds.length > 0) {
    await database.delete(gameTeams).where(inArray(gameTeams.id, emptyTeamIds));
  }

  const takenSides = new Set(
    staying
      .map((team) => team.sideIndex)
      .filter((side): side is number => side != null && side <= teamCount),
  );
  const movingTeams = staying
    .filter((team) => team.sideIndex == null || team.sideIndex > teamCount)
    .sort((left, right) => (left.sideIndex ?? 0) - (right.sideIndex ?? 0));
  let nextSide = 1;
  for (const team of movingTeams) {
    while (takenSides.has(nextSide)) {
      nextSide += 1;
    }
    takenSides.add(nextSide);
    await database
      .update(gameTeams)
      .set({ sideIndex: nextSide, updatedAt: new Date() })
      .where(eq(gameTeams.id, team.id));
  }

  await database
    .update(games)
    .set({
      playersAllowed: teamCount * 2,
      teamsAllowed: teamCount,
      updatedAt: new Date(),
    })
    .where(eq(games.id, game.id));
  return movedToWaitlist;
}

/**
 * An Americano's seats change in fours until its Rounds are made, never
 * under the players already in (ADR-0094).
 */
async function resizeAmericano(
  database: Tx,
  game: GameRow,
  players: number | null,
  locale: Locale,
) {
  const m = messagesFor(locale);
  if (game.drawPostedAt) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: m.tournamentAmericano.errors.roundsMade,
    });
  }
  if (players == null || !isAmericanoPlayerCount(players)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: m.tournamentAmericano.errors.players(
        AMERICANO_PLAYER_MIN,
        AMERICANO_PLAYER_MAX,
      ),
    });
  }
  if (players < (await registeredUserCount(database, game.id))) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: m.game.errors.capBelowRegistered,
    });
  }
  await database
    .update(games)
    .set({
      playersAllowed: players,
      teamsAllowed: americanoTeamCountOfPlayers(players),
      updatedAt: new Date(),
    })
    .where(eq(games.id, game.id));
}

/** A raised cap fills its new places from the Waitlist, in queue order. */
async function promoteIntoRaisedCap(
  database: Tx,
  before: GameRow,
  locale: Locale = DEFAULT_LOCALE,
) {
  const game = await requireGame(database, before.id, locale);
  const raised =
    (game.playersAllowed ?? 0) > (before.playersAllowed ?? 0) ||
    (game.teamsAllowed ?? 0) > (before.teamsAllowed ?? 0);
  if (!raised) {
    return;
  }
  if (!isIndividualSeatGame(game)) {
    await promoteWaitlist(database, game, undefined, locale);
    return;
  }
  for (;;) {
    const vacant = await firstVacantPosition(database, game);
    if (!vacant) {
      return;
    }
    const seated = await registeredUserCount(database, game.id);
    await promoteWaitlist(database, game, vacant, locale);
    if ((await registeredUserCount(database, game.id)) === seated) {
      return;
    }
  }
}

async function updateGameCapsOnGame(
  database: Tx,
  game: GameRow,
  input: {
    playersAllowed?: number;
    teamsAllowed?: number;
    sideSize?: number;
    locale?: Locale;
  },
): Promise<string[]> {
  const locale = input.locale ?? DEFAULT_LOCALE;
  if (game.cancelledAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).game.errors.editCancelled,
    });
  }
  if (isFootballGame(game) && game.format === "friendly_game") {
    return updateFootballShape(database, game, input);
  }
  if (input.sideSize != null) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).game.errors.sideSizeFootballOnly,
    });
  }
  if (game.format === "friendly_game") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).game.errors.friendlyCapsFixed,
    });
  }
  if (isAmericano(game.format, game.tournamentShape)) {
    const players =
      input.playersAllowed ??
      (input.teamsAllowed != null
        ? americanoPlayersOfTeamCount(input.teamsAllowed)
        : null);
    await resizeAmericano(database, game, players, locale);
    return [];
  }
  if (game.format === "friendly_tournament") {
    const teamCount =
      input.teamsAllowed ??
      (input.playersAllowed != null ? input.playersAllowed / 2 : null);
    return resizeTournament(database, game, teamCount, locale);
  }

  const nextPlayers = input.playersAllowed ?? game.playersAllowed;
  const nextTeams = input.teamsAllowed ?? game.teamsAllowed;

  if (game.registrationMode === "team_only") {
    if (nextTeams == null || nextTeams < FRIENDLY_TEAMS_ALLOWED) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: messagesFor(locale).game.errors.teamsAtLeastTwo,
      });
    }
    const teamCount = await registeredGameTeamCount(database, game.id);
    if (nextTeams < teamCount) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: messagesFor(locale).game.errors.capBelowRegistered,
      });
    }
    await database
      .update(games)
      .set({ teamsAllowed: nextTeams, updatedAt: new Date() })
      .where(eq(games.id, game.id));
    return [];
  }

  if (nextPlayers == null || nextPlayers < FRIENDLY_PLAYERS_ALLOWED) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).game.errors.playersAtLeastFour,
    });
  }
  if (nextPlayers % 4 !== 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).game.errors.playersMultipleOfFour,
    });
  }
  const userCount = await registeredUserCount(database, game.id);
  if (nextPlayers < userCount) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).game.errors.capBelowRegistered,
    });
  }
  await database
    .update(games)
    .set({ playersAllowed: nextPlayers, updatedAt: new Date() })
    .where(eq(games.id, game.id));
  return [];
}

export async function updateGameCaps(
  database: typeof db,
  args: {
    gameId: string;
    userId: string;
    playersAllowed?: number;
    teamsAllowed?: number;
    sideSize?: number;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const game = await requireGame(database, args.gameId, locale);
  requireNotChallengeGame(game, args.locale);
  await assertGameOrganizer(database, game, args.userId, locale);
  const movedToWaitlist = await database.transaction(async (tx) => {
    const locked = await lockGameForAdmit(tx, game.id, locale);
    const moved = await updateGameCapsOnGame(tx, locked, {
      playersAllowed: args.playersAllowed,
      teamsAllowed: args.teamsAllowed,
      sideSize: args.sideSize,
      locale,
    });
    await promoteIntoRaisedCap(tx, locked, locale);
    await notify(tx, {
      type: "game_moved_to_waitlist",
      recipients: moved.map((userId) => ({ userId, audience: "player" })),
      excludeUserIds: [args.userId],
      actorUserId: args.userId,
      groupId: locked.groupId,
      gameId: locked.id,
    });
    return moved;
  });
  return { ok: true as const, movedToWaitlist };
}

export const updateCaps = protectedProcedure
  .input(
    z
      .object({
        gameId: z.string().uuid(),
        playersAllowed: z.number().int().optional(),
        teamsAllowed: z.number().int().optional(),
        sideSize: z.number().int().optional(),
      })
      .refine(
        (value) =>
          value.playersAllowed !== undefined ||
          value.teamsAllowed !== undefined ||
          value.sideSize !== undefined,
        { message: "Set players allowed, teams allowed or side size" },
      ),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return updateGameCaps(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      playersAllowed: input.playersAllowed,
      teamsAllowed: input.teamsAllowed,
      sideSize: input.sideSize,
      locale: ctx.locale,
    });
  });
