import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { games, groupMembers, groupSeasons } from "@repo/db";

import {
  seasonStandingTable,
  standingDiffUnit,
} from "@repo/domain/season-standing";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { requireGroup } from "#src/groups/helpers/require-group";
import {
  countCompletedMatches,
  matchesInLens,
  standingMatchesFromGames,
  toSeasonRow,
} from "#src/standing/load-group-standing";
import { isUnclaimed } from "#src/unclaimed-players/is-unclaimed";

type DbClient = typeof db;

/**
 * The Standing for one lens (design "Seasons" 1a–1c): a Season by id, or
 * all-time with `seasonId: null`. Group home opens on the default lens from
 * `groups.byId`; this is the read behind the other chips. Members only.
 */
export async function seasonStanding(
  database: DbClient,
  args: {
    groupId: string;
    seasonId: string | null;
    userId: string;
    now?: Date;
  },
) {
  const group = await requireGroup(database, args.groupId);
  const now = args.now ?? new Date();

  const membership = await database.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.groupId, group.id),
      eq(groupMembers.userId, args.userId),
    ),
    columns: { id: true },
  });
  if (!membership) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Join the Group to see its Standing",
    });
  }

  const season = args.seasonId
    ? await database.query.groupSeasons.findFirst({
        where: and(
          eq(groupSeasons.id, args.seasonId),
          eq(groupSeasons.groupId, group.id),
        ),
      })
    : null;
  if (args.seasonId && !season) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Season not found" });
  }

  const [memberRows, gameRows] = await Promise.all([
    database.query.groupMembers.findMany({
      where: eq(groupMembers.groupId, group.id),
      columns: { userId: true },
      with: {
        user: {
          columns: { name: true, image: true, clerkId: true, addedAt: true },
        },
      },
    }),
    database.query.games.findMany({
      where: eq(games.groupId, group.id),
      columns: {
        id: true,
        groupId: true,
        cancelledAt: true,
        windowStart: true,
        createdAt: true,
      },
      with: {
        matches: {
          columns: { status: true, startTime: true, createdAt: true },
          with: {
            sets: {
              columns: { slot1GamesWon: true, slot2GamesWon: true },
            },
            slot1GameTeam: {
              columns: { id: true },
              with: {
                players: {
                  columns: { id: true },
                  with: { gamePlayer: { columns: { userId: true } } },
                },
              },
            },
            slot2GameTeam: {
              columns: { id: true },
              with: {
                players: {
                  columns: { id: true },
                  with: { gamePlayer: { columns: { userId: true } } },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  const matches = matchesInLens(
    standingMatchesFromGames(gameRows),
    season ? toSeasonRow(season, now) : null,
  );
  const rows = seasonStandingTable(
    matches,
    memberRows.map((row) => ({
      userId: row.userId,
      name: row.user.name,
      image: row.user.image,
      isViewer: row.userId === args.userId,
      unclaimed: isUnclaimed(row.user),
    })),
    { diffUnit: standingDiffUnit(group.sport) },
  );

  return {
    seasonId: season?.id ?? null,
    season: season ? toSeasonRow(season, now) : null,
    rows,
    gamesCounted: countCompletedMatches(matches),
  };
}

export const seasonStandingProcedure = protectedProcedure
  .input(
    z.object({
      groupId: z.string().uuid(),
      seasonId: z.string().uuid().nullable(),
    }),
  )
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return seasonStanding(ctx.db, {
      groupId: input.groupId,
      seasonId: input.seasonId,
      userId: appUser.id,
    });
  });
