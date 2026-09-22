import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { gameTeams } from "@repo/db";

import { isPoolTournament } from "~/lib/tournament-rounds";
import {
  balancedPoolSizes,
  poolCountForDrawnField,
  TOURNAMENT_TEAM_MIN,
} from "~/lib/tournament-sizing";
import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import { assertGameOrganizer, requireGame } from "~/server/games/access";
import { assertPoolDrawNotPosted } from "~/server/games/assert-pool-draw-not-posted";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export type Shuffle = <T>(items: readonly T[]) => T[];

const HALF_TEAMS_PREFIX = "Cannot draw the groups while Half teams remain: ";
const BELOW_MINIMUM_MESSAGE =
  "Need at least 4 complete Game teams to draw the groups";

function randomIndex(exclusiveMax: number) {
  if (exclusiveMax <= 1) {
    return 0;
  }
  const limit = 0x100000000 - (0x100000000 % exclusiveMax);
  const bytes = new Uint32Array(1);
  let value = 0;
  do {
    crypto.getRandomValues(bytes);
    value = bytes[0] ?? 0;
  } while (value >= limit);
  return value % exclusiveMax;
}

function cryptoShuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1);
    const current = result[index];
    const swap = result[swapIndex];
    if (current === undefined || swap === undefined) {
      continue;
    }
    result[index] = swap;
    result[swapIndex] = current;
  }
  return result;
}

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

export async function drawPools(
  database: DbClient,
  args: {
    gameId: string;
    organizerUserId: string;
    shuffle?: Shuffle;
  },
) {
  const game = await requireGame(database, args.gameId);
  await assertGameOrganizer(database, game, args.organizerUserId);

  if (game.cancelledAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Cannot draw the groups on a cancelled Game",
    });
  }
  if (
    !isPoolTournament(game.format, game.poolCount) ||
    game.poolCount == null
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Draw the groups on a Friendly tournament",
    });
  }
  assertPoolDrawNotPosted(game);

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
      message: `${HALF_TEAMS_PREFIX}${halfTeams.map(occupantName).join(", ")}`,
    });
  }
  if (complete.length < TOURNAMENT_TEAM_MIN) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: BELOW_MINIMUM_MESSAGE,
    });
  }

  complete.sort((left, right) => {
    const leftSide = left.sideIndex ?? Number.MAX_SAFE_INTEGER;
    const rightSide = right.sideIndex ?? Number.MAX_SAFE_INTEGER;
    if (leftSide !== rightSide) {
      return leftSide - rightSide;
    }
    return left.id.localeCompare(right.id);
  });

  const shuffle = args.shuffle ?? cryptoShuffle;
  const shuffled = shuffle(complete);
  const poolCount = poolCountForDrawnField(shuffled.length, game.poolCount);
  const sizes = balancedPoolSizes(shuffled.length, poolCount);

  const pools: { poolIndex: number; gameTeamIds: string[] }[] = [];
  let offset = 0;
  const now = new Date();
  await database.transaction(async (tx) => {
    for (let index = 0; index < sizes.length; index += 1) {
      const size = sizes[index] ?? 0;
      const slice = shuffled.slice(offset, offset + size);
      const poolIndex = index + 1;
      pools.push({
        poolIndex,
        gameTeamIds: slice.map((team) => team.id),
      });
      for (const team of slice) {
        await tx
          .update(gameTeams)
          .set({ poolIndex, updatedAt: now })
          .where(eq(gameTeams.id, team.id));
      }
      offset += size;
    }
  });

  return { ok: true as const, poolCount, pools };
}

export const drawPoolsInputSchema = z.object({
  gameId: z.string().uuid(),
});

export const drawPoolsProcedure = protectedProcedure
  .input(drawPoolsInputSchema)
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return drawPools(ctx.db, {
      gameId: input.gameId,
      organizerUserId: appUser.id,
    });
  });
