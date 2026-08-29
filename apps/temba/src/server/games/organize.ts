import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";

import { MatchStatusEnum, gameWaitlist, games, matches } from "@repo/db";

import { type db } from "~/server/db";
import {
  type GameRow,
  FRIENDLY_PLAYERS_ALLOWED,
  FRIENDLY_TEAMS_ALLOWED,
  isClubGroupGameJoinFrozen,
  registeredGameTeamCount,
  registeredUserCount,
} from "~/server/games/access";
import { leaveRegisteredSeat } from "~/server/games/waitlist";
import { highestOccupiedSideIndex } from "~/server/games/seats";
import {
  assertCourtAssignable,
  assertGameTeamOnGame,
} from "~/server/games/courts";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function cancelGame(database: Tx, game: GameRow) {
  if (game.cancelledAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This Game is already cancelled",
    });
  }

  const now = new Date();
  await database
    .update(games)
    .set({ cancelledAt: now, updatedAt: now })
    .where(eq(games.id, game.id));
  await database.delete(gameWaitlist).where(eq(gameWaitlist.gameId, game.id));
  await database
    .update(matches)
    .set({ status: MatchStatusEnum.CANCELLED, updatedAt: now })
    .where(eq(matches.gameId, game.id));
}

export async function cancelMatch(
  database: Tx,
  game: GameRow,
  matchId: string,
) {
  if (game.cancelledAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This Game is already cancelled",
    });
  }
  if (game.format === "americano") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Americano has no Matches; cancel the Game",
    });
  }

  const match = await database.query.matches.findFirst({
    where: eq(matches.id, matchId),
  });
  if (!match || match.gameId !== game.id) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Match not found",
    });
  }
  if (match.status === MatchStatusEnum.CANCELLED) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This Match is already cancelled",
    });
  }

  if (game.format === "friendly_game") {
    await cancelGame(database, game);
    return { cancelledGame: true as const };
  }

  const now = new Date();
  await database
    .update(matches)
    .set({ status: MatchStatusEnum.CANCELLED, updatedAt: now })
    .where(eq(matches.id, match.id));
  return { cancelledGame: false as const };
}

export async function kickWaitlistEntry(
  database: Tx | typeof db,
  gameId: string,
  waitlistId: string,
) {
  const deleted = await database
    .delete(gameWaitlist)
    .where(
      and(eq(gameWaitlist.id, waitlistId), eq(gameWaitlist.gameId, gameId)),
    )
    .returning({ id: gameWaitlist.id });
  if (deleted.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Waitlist entry not found",
    });
  }
}

export async function kickRegisteredUser(
  database: Tx,
  game: GameRow,
  userId: string,
) {
  await leaveRegisteredSeat(
    database,
    game,
    userId,
    "That User is not registered on this Game",
  );
}

export async function closeRegistration(
  database: typeof db | Tx,
  game: GameRow,
) {
  if (game.cancelledAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Cannot close a cancelled Game",
    });
  }
  if (game.registrationClosedAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Registration is already closed",
    });
  }
  const now = new Date();
  await database
    .update(games)
    .set({ registrationClosedAt: now, updatedAt: now })
    .where(eq(games.id, game.id));
}

export async function reopenRegistration(
  database: typeof db | Tx,
  game: GameRow,
) {
  if (game.cancelledAt) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Cannot reopen a cancelled Game",
    });
  }
  if (await isClubGroupGameJoinFrozen(database, game)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Cannot reopen a Club Group Game while the Community is archived",
    });
  }
  if (!game.registrationClosedAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Registration is not organizer-closed",
    });
  }
  const now = new Date();
  await database
    .update(games)
    .set({ registrationClosedAt: null, updatedAt: now })
    .where(eq(games.id, game.id));
}

export async function updateGameWindow(
  database: Tx,
  game: GameRow,
  windowStart: Date | null,
  windowEnd: Date | null,
) {
  if (game.cancelledAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Cannot edit a cancelled Game",
    });
  }
  if (Boolean(windowStart) !== Boolean(windowEnd)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Window start and end must be set together",
    });
  }
  if (windowStart && windowEnd && windowEnd.getTime() < windowStart.getTime()) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Window end must be at or after window start",
    });
  }

  const now = new Date();
  await database
    .update(games)
    .set({ windowStart, windowEnd, updatedAt: now })
    .where(eq(games.id, game.id));

  if (game.format === "friendly_game") {
    const durationInMinutes =
      windowStart && windowEnd
        ? Math.max(
            0,
            Math.round((windowEnd.getTime() - windowStart.getTime()) / 60000),
          )
        : null;
    await database
      .update(matches)
      .set({
        startTime: windowStart,
        endTime: windowEnd,
        durationInMinutes,
        updatedAt: now,
      })
      .where(eq(matches.gameId, game.id));
  }
}

export async function updateGameCaps(
  database: Tx | typeof db,
  game: GameRow,
  input: { playersAllowed?: number; teamsAllowed?: number },
) {
  if (game.cancelledAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Cannot edit a cancelled Game",
    });
  }
  if (game.format === "friendly_game") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Friendly game caps are fixed at 4 players / 2 Teams",
    });
  }

  const nextPlayers = input.playersAllowed ?? game.playersAllowed;
  const nextTeams = input.teamsAllowed ?? game.teamsAllowed;

  if (game.registrationMode === "team_only") {
    if (nextTeams == null || nextTeams < FRIENDLY_TEAMS_ALLOWED) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Teams allowed must be at least 2",
      });
    }
    const teamCount = await registeredGameTeamCount(database, game.id);
    if (nextTeams < teamCount) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Cannot lower cap below the current registered count",
      });
    }
    await database
      .update(games)
      .set({ teamsAllowed: nextTeams, updatedAt: new Date() })
      .where(eq(games.id, game.id));
    return;
  }

  if (nextPlayers == null || nextPlayers < FRIENDLY_PLAYERS_ALLOWED) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Players allowed must be at least 4",
    });
  }
  if (nextPlayers % 4 !== 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Players allowed must be a multiple of 4",
    });
  }
  const userCount = await registeredUserCount(database, game.id);
  if (nextPlayers < userCount) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Cannot lower cap below the current registered count",
    });
  }
  if (game.format === "friendly_tournament") {
    const nextN = Math.floor(nextPlayers / 2);
    const highest = await highestOccupiedSideIndex(database, game.id);
    if (highest != null && highest > nextN) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "Cannot lower cap below the highest occupied side. Empty high-index placeholders may disappear; occupied ones may not.",
      });
    }
  }
  await database
    .update(games)
    .set({ playersAllowed: nextPlayers, updatedAt: new Date() })
    .where(eq(games.id, game.id));
}

export type TournamentMatchInput = {
  startTime: Date | null;
  endTime: Date | null;
  durationInMinutes: number | null;
  courtId: string | null;
  slot1GameTeamId: string | null;
  slot2GameTeamId: string | null;
};

async function applyMatchSides(
  database: Tx,
  gameId: string,
  input: TournamentMatchInput,
) {
  if (
    input.slot1GameTeamId &&
    input.slot2GameTeamId &&
    input.slot1GameTeamId === input.slot2GameTeamId
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "A Match cannot use the same Game team in both slots",
    });
  }
  if (input.courtId) {
    const game = await database.query.games.findFirst({
      where: eq(games.id, gameId),
    });
    if (!game) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Game not found",
      });
    }
    await assertCourtAssignable(database, game, input.courtId);
  }
  if (input.slot1GameTeamId) {
    await assertGameTeamOnGame(database, gameId, input.slot1GameTeamId);
  }
  if (input.slot2GameTeamId) {
    await assertGameTeamOnGame(database, gameId, input.slot2GameTeamId);
  }
}

function matchTimes(input: TournamentMatchInput) {
  const durationInMinutes =
    input.durationInMinutes ??
    (input.startTime && input.endTime
      ? Math.max(
          0,
          Math.round(
            (input.endTime.getTime() - input.startTime.getTime()) / 60000,
          ),
        )
      : null);
  return {
    startTime: input.startTime,
    endTime: input.endTime,
    durationInMinutes,
    courtId: input.courtId,
    slot1GameTeamId: input.slot1GameTeamId,
    slot2GameTeamId: input.slot2GameTeamId,
  };
}

export async function addTournamentMatch(
  database: Tx,
  game: GameRow,
  input: TournamentMatchInput,
) {
  if (game.cancelledAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Cannot add a Match on a cancelled Game",
    });
  }
  if (game.format !== "friendly_tournament") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Add Matches on a Friendly tournament",
    });
  }
  await applyMatchSides(database, game.id, input);
  const values = matchTimes(input);
  const [match] = await database
    .insert(matches)
    .values({
      gameId: game.id,
      ...values,
    })
    .returning({ id: matches.id });
  if (!match) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create Match",
    });
  }
  return match;
}

export async function updateTournamentMatch(
  database: Tx,
  game: GameRow,
  matchId: string,
  input: TournamentMatchInput,
) {
  if (game.cancelledAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Cannot edit a Match on a cancelled Game",
    });
  }
  if (game.format !== "friendly_tournament") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Edit Matches on a Friendly tournament",
    });
  }
  const match = await database.query.matches.findFirst({
    where: eq(matches.id, matchId),
  });
  if (!match || match.gameId !== game.id) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Match not found",
    });
  }
  if (match.status === MatchStatusEnum.CANCELLED) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Cannot edit a cancelled Match",
    });
  }
  await applyMatchSides(database, game.id, input);
  const values = matchTimes(input);
  await database
    .update(matches)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(matches.id, match.id));
}
