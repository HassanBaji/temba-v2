import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { gameTeams } from "@repo/db";

import {
  isDrawnTournament,
  isKnockoutOnly,
} from "@repo/domain/tournament-rounds";
import {
  balancedPoolSizes,
  poolCountForDrawnField,
  TOURNAMENT_TEAM_MIN,
} from "@repo/domain/tournament-sizing";
import { isKingOfTheCourt } from "@repo/domain/tournament-king";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { assertGameOrganizer, requireGame } from "#src/games/access";
import { assertPoolDrawNotPosted } from "#src/games/assert-pool-draw-not-posted";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export type Shuffle = <T>(items: readonly T[]) => T[];

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

function occupantName(
  team: {
    sideIndex: number | null;
    players: readonly {
      gamePlayer: { user: { name: string } | null } | null;
    }[];
  },
  locale: Locale = DEFAULT_LOCALE,
) {
  const name = team.players[0]?.gamePlayer?.user?.name;
  if (name) {
    return name;
  }
  if (team.sideIndex != null) {
    return messagesFor(locale).tournament.errors.teamNumber(team.sideIndex);
  }
  return messagesFor(locale).tournament.gameTeam;
}

export async function drawPools(
  database: DbClient,
  args: {
    gameId: string;
    organizerUserId: string;
    shuffle?: Shuffle;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const game = await requireGame(database, args.gameId, locale);
  await assertGameOrganizer(database, game, args.organizerUserId, locale);

  if (game.cancelledAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).tournament.errors.drawCancelled,
    });
  }
  if (!isDrawnTournament(game.format, game.poolCount, game.tournamentShape)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).tournament.errors.drawFriendly,
    });
  }
  if (isKingOfTheCourt(game.format, game.tournamentShape)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).tournamentKing.errors.useStartingCourts,
    });
  }
  assertPoolDrawNotPosted(game, locale);

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
      message: messagesFor(locale).tournament.errors.drawHalfTeams(
        halfTeams.map((team) => occupantName(team, locale)).join(", "),
      ),
    });
  }
  if (complete.length < TOURNAMENT_TEAM_MIN) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).tournament.errors.drawBelowMinimum,
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
  const now = new Date();

  if (isKnockoutOnly(game.format, game.tournamentShape)) {
    await database.transaction(async (tx) => {
      for (let index = 0; index < shuffled.length; index += 1) {
        const team = shuffled[index];
        if (!team) {
          continue;
        }
        await tx
          .update(gameTeams)
          .set({ knockoutSeed: index + 1, poolIndex: null, updatedAt: now })
          .where(eq(gameTeams.id, team.id));
      }
    });
    return {
      ok: true as const,
      poolCount: null,
      pools: [],
      knockoutOrder: shuffled.map((team) => team.id),
    };
  }
  if (game.poolCount == null) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).tournament.errors.drawFriendly,
    });
  }

  const poolCount = poolCountForDrawnField(shuffled.length, game.poolCount);
  const sizes = balancedPoolSizes(shuffled.length, poolCount);

  const pools: { poolIndex: number; gameTeamIds: string[] }[] = [];
  let offset = 0;
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

  return { ok: true as const, poolCount, pools, knockoutOrder: [] };
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
      locale: ctx.locale,
    });
  });
