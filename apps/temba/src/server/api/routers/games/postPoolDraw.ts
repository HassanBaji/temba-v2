import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { gameCourts, gameTeams, gameWaitlist, games, matches } from "@repo/db";

import { isPoolTournament } from "~/lib/tournament-rounds";
import { schedulePoolMatches } from "~/lib/tournament-schedule";
import { TOURNAMENT_TEAM_MIN } from "~/lib/tournament-sizing";
import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import { assertPoolDrawNotPosted } from "~/server/games/assert-pool-draw-not-posted";
import { assertGameOrganizer, requireGame } from "~/server/games/access";
import { matchTimes } from "~/server/games/helpers/match-times";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

function occupantName(team: {
  sideIndex: number | null;
  players: readonly {
    gamePlayer: { user: { name: string } | null } | null;
  }[];
}) {
  const name = team.players[0]?.gamePlayer?.user?.name;
  if (name) {
    return name;
  }
  if (team.sideIndex != null) {
    return `Team ${team.sideIndex}`;
  }
  return "Game team";
}

export async function postPoolDraw(
  database: DbClient,
  args: { gameId: string; organizerUserId: string },
) {
  const game = await requireGame(database, args.gameId);
  await assertGameOrganizer(database, game, args.organizerUserId);

  if (game.cancelledAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Cannot post the Pool draw on a cancelled Game",
    });
  }
  if (
    !isPoolTournament(game.format, game.poolCount) ||
    game.poolCount == null
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Post the Pool draw on a Friendly tournament",
    });
  }
  assertPoolDrawNotPosted(game);
  if (!game.windowStart || !game.windowEnd) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Set the tournament window before posting the Pool draw",
    });
  }

  const teamRows = await database.query.gameTeams.findMany({
    where: eq(gameTeams.gameId, game.id),
    with: {
      players: {
        with: {
          gamePlayer: {
            with: {
              user: { columns: { name: true } },
            },
          },
        },
      },
    },
  });

  const complete: typeof teamRows = [];
  const halfTeams: typeof teamRows = [];
  for (const team of teamRows) {
    if (team.players.length === 1) {
      halfTeams.push(team);
      continue;
    }
    if (team.players.length === 2) {
      complete.push(team);
    }
  }
  if (halfTeams.length > 0) {
    halfTeams.sort((left, right) => {
      const leftSide = left.sideIndex ?? Number.MAX_SAFE_INTEGER;
      const rightSide = right.sideIndex ?? Number.MAX_SAFE_INTEGER;
      if (leftSide !== rightSide) {
        return leftSide - rightSide;
      }
      return left.id.localeCompare(right.id);
    });
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Cannot post the Pool draw while Half teams remain: ${halfTeams
        .map(occupantName)
        .join(", ")}`,
    });
  }
  if (complete.length < TOURNAMENT_TEAM_MIN) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Need at least 4 complete Game teams to post the Pool draw",
    });
  }
  if (complete.some((team) => team.poolIndex == null)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Draw the Pools before posting",
    });
  }

  const recordedCourts = await database.query.gameCourts.findMany({
    where: eq(gameCourts.gameId, game.id),
    with: { court: { columns: { id: true, name: true } } },
  });
  const courtIds = recordedCourts
    .flatMap((row) =>
      row.court ? [{ id: row.court.id, name: row.court.name }] : [],
    )
    .sort((left, right) => {
      const byName = left.name.localeCompare(right.name);
      if (byName !== 0) {
        return byName;
      }
      return left.id.localeCompare(right.id);
    })
    .map((court) => court.id);
  if (courtIds.length < 1) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Record Courts before posting the Pool draw",
    });
  }

  const byPool = new Map<number, typeof complete>();
  for (const team of complete) {
    const poolIndex = team.poolIndex;
    if (poolIndex == null) {
      continue;
    }
    const list = byPool.get(poolIndex) ?? [];
    list.push(team);
    byPool.set(poolIndex, list);
  }
  const pools = [...byPool.entries()]
    .sort(([left], [right]) => left - right)
    .map(([poolIndex, teams]) => ({
      poolIndex,
      gameTeamIds: [...teams]
        .sort((left, right) => {
          const leftSide = left.sideIndex ?? Number.MAX_SAFE_INTEGER;
          const rightSide = right.sideIndex ?? Number.MAX_SAFE_INTEGER;
          if (leftSide !== rightSide) {
            return leftSide - rightSide;
          }
          return left.id.localeCompare(right.id);
        })
        .map((team) => team.id),
    }));

  const scheduled = schedulePoolMatches({
    pools,
    courtIds,
    windowStart: game.windowStart,
    windowEnd: game.windowEnd,
    matchMinutes: game.matchMinutes,
  });
  if (scheduled.length < 1) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "The Pool draw did not produce any Matches",
    });
  }

  const now = new Date();
  await database.transaction(async (tx) => {
    const locked = await requireGame(tx, game.id);
    assertPoolDrawNotPosted(locked);
    for (const match of scheduled) {
      const values = matchTimes({
        startTime: match.startTime,
        endTime: match.endTime,
        durationInMinutes: null,
        courtId: match.courtId,
        slot1GameTeamId: match.slot1GameTeamId,
        slot2GameTeamId: match.slot2GameTeamId,
      });
      await tx.insert(matches).values({
        gameId: game.id,
        roundNumber: match.roundNumber,
        ...values,
      });
    }
    await tx
      .update(games)
      .set({
        drawPostedAt: now,
        registrationClosedAt: locked.registrationClosedAt ?? now,
        updatedAt: now,
      })
      .where(eq(games.id, game.id));
    await tx.delete(gameWaitlist).where(eq(gameWaitlist.gameId, game.id));
  });

  return { ok: true as const, matchCount: scheduled.length };
}

export const postPoolDrawInputSchema = z.object({
  gameId: z.string().uuid(),
});

export const postPoolDrawProcedure = protectedProcedure
  .input(postPoolDrawInputSchema)
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return postPoolDraw(ctx.db, {
      gameId: input.gameId,
      organizerUserId: appUser.id,
    });
  });
