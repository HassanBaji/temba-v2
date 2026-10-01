import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { gameCourts, gameTeams, gameWaitlist, games, matches } from "@repo/db";

import { buildKnockoutTree } from "~/lib/tournament-knockout";
import { isDrawnTournament, isKnockoutOnly } from "~/lib/tournament-rounds";
import {
  schedulePoolMatches,
  scheduleRoundSlots,
} from "~/lib/tournament-schedule";
import {
  resolveRoundCount,
  TOURNAMENT_TEAM_MIN,
} from "~/lib/tournament-sizing";
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

type DrawnMatch = {
  roundNumber: number;
  knockoutRound: number | null;
  knockoutPosition: number | null;
  startTime: Date;
  endTime: Date;
  courtId: string;
  slot1GameTeamId: string | null;
  slot2GameTeamId: string | null;
};

function sortBySide<T extends { id: string; sideIndex: number | null }>(
  teams: readonly T[],
): T[] {
  return [...teams].sort((left, right) => {
    const leftSide = left.sideIndex ?? Number.MAX_SAFE_INTEGER;
    const rightSide = right.sideIndex ?? Number.MAX_SAFE_INTEGER;
    if (leftSide !== rightSide) {
      return leftSide - rightSide;
    }
    return left.id.localeCompare(right.id);
  });
}

function poolDrawMatches(args: {
  teams: readonly {
    id: string;
    sideIndex: number | null;
    poolIndex: number | null;
  }[];
  storedRoundCount: number | null;
  courtIds: readonly string[];
  windowStart: Date;
  windowEnd: Date;
  matchMinutes: number | null;
}): DrawnMatch[] {
  const byPool = new Map<number, (typeof args.teams)[number][]>();
  for (const team of args.teams) {
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
      gameTeamIds: sortBySide(teams).map((team) => team.id),
    }));

  const roundCount = resolveRoundCount(
    pools.map((pool) => pool.gameTeamIds.length),
    args.storedRoundCount,
  );
  if (roundCount == null) {
    return [];
  }
  return schedulePoolMatches({
    pools,
    roundCount,
    courtIds: args.courtIds,
    windowStart: args.windowStart,
    windowEnd: args.windowEnd,
    matchMinutes: args.matchMinutes,
  }).map((match) => ({
    ...match,
    knockoutRound: null,
    knockoutPosition: null,
  }));
}

function knockoutDrawMatches(args: {
  teams: readonly { id: string; knockoutSeed: number | null }[];
  courtIds: readonly string[];
  windowStart: Date;
  windowEnd: Date;
  matchMinutes: number | null;
}): DrawnMatch[] {
  const drawnOrder = [...args.teams].sort(
    (left, right) =>
      (left.knockoutSeed ?? Number.MAX_SAFE_INTEGER) -
        (right.knockoutSeed ?? Number.MAX_SAFE_INTEGER) ||
      left.id.localeCompare(right.id),
  );
  const tree = buildKnockoutTree({ entrantCount: drawnOrder.length });
  if (!tree) {
    return [];
  }

  const slots = new Map<string, string>();
  for (const entry of tree.entries) {
    const team = drawnOrder[entry.entrant - 1];
    if (team) {
      slots.set(`${entry.round}:${entry.position}:${entry.slot}`, team.id);
    }
  }
  const rounds = Array.from({ length: tree.roundCount }, (_, index) => ({
    roundNumber: index + 1,
    items: tree.matches.filter((match) => match.round === index + 1),
  }));

  return scheduleRoundSlots({
    rounds,
    courtIds: args.courtIds,
    windowStart: args.windowStart,
    windowEnd: args.windowEnd,
    matchMinutes: args.matchMinutes,
  }).map((scheduled) => {
    const { round, position } = scheduled.item;
    return {
      roundNumber: scheduled.roundNumber,
      knockoutRound: round,
      knockoutPosition: position,
      startTime: scheduled.startTime,
      endTime: scheduled.endTime,
      courtId: scheduled.courtId,
      slot1GameTeamId: slots.get(`${round}:${position}:1`) ?? null,
      slot2GameTeamId: slots.get(`${round}:${position}:2`) ?? null,
    };
  });
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
      message: "Cannot post the group draw on a cancelled Game",
    });
  }
  if (!isDrawnTournament(game.format, game.poolCount, game.tournamentShape)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Post the group draw on a Friendly tournament",
    });
  }
  const knockoutOnly = isKnockoutOnly(game.format, game.tournamentShape);
  assertPoolDrawNotPosted(game);
  if (!game.windowStart || !game.windowEnd) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Set the tournament window before posting the group draw",
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
      message: `Cannot post the group draw while Half teams remain: ${halfTeams
        .map(occupantName)
        .join(", ")}`,
    });
  }
  if (complete.length < TOURNAMENT_TEAM_MIN) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Need at least 4 complete Game teams to post the group draw",
    });
  }
  if (
    complete.some((team) =>
      knockoutOnly ? team.knockoutSeed == null : team.poolIndex == null,
    )
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: knockoutOnly
        ? "Draw the knockout before posting"
        : "Draw the groups before posting",
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
      message: "Record Courts before posting the group draw",
    });
  }

  const scheduled = knockoutOnly
    ? knockoutDrawMatches({
        teams: complete,
        courtIds,
        windowStart: game.windowStart,
        windowEnd: game.windowEnd,
        matchMinutes: game.matchMinutes,
      })
    : poolDrawMatches({
        teams: complete,
        storedRoundCount: game.roundCount,
        courtIds,
        windowStart: game.windowStart,
        windowEnd: game.windowEnd,
        matchMinutes: game.matchMinutes,
      });
  if (scheduled.length < 1) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "The group draw did not produce any Matches",
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
        knockoutRound: match.knockoutRound,
        knockoutPosition: match.knockoutPosition,
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
