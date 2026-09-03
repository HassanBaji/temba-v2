import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { venues } from "@repo/db";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import { assertMayCreateGameOnGroup } from "~/server/games/access";
import { loadGameCreateVenueContext } from "~/server/games/helpers/load-game-create-venue-context";
import { requireGroup } from "~/server/games/helpers/require-group";
import type {
  GameCreateGroupKind,
  GameCreateVenueOption,
} from "~/server/games/utils";
import { consult } from "~/server/soft-archive";
import { liveVenuesWhere } from "~/server/soft-archive/adapter";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

async function listVenuesForGameCreate(
  database: DbClient,
  groupId: string | undefined,
): Promise<{
  locked: boolean;
  groupKind: GameCreateGroupKind;
  venues: GameCreateVenueOption[];
}> {
  const context = await loadGameCreateVenueContext(database, groupId);

  if (context.locked && context.linkedVenueId) {
    const venue = await database.query.venues.findFirst({
      where: eq(venues.id, context.linkedVenueId),
      columns: {
        id: true,
        name: true,
        city: true,
        country: true,
        archivedAt: true,
      },
      with: {
        courts: {
          columns: { id: true, name: true },
          orderBy: (table, { asc }) => [asc(table.name), asc(table.id)],
        },
      },
    });
    if (!venue) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Venue not found",
      });
    }

    const archived = consult({ archivedAt: venue.archivedAt }).freeze(
      "catalog",
    );
    return {
      locked: true,
      groupKind: context.groupKind,
      venues: [
        {
          id: venue.id,
          name: venue.name,
          city: venue.city,
          country: venue.country,
          archivedAt: venue.archivedAt,
          courts: archived
            ? []
            : venue.courts.map((court) => ({ id: court.id, name: court.name })),
        },
      ],
    };
  }

  const rows = await database.query.venues.findMany({
    where: liveVenuesWhere(),
    columns: {
      id: true,
      name: true,
      city: true,
      country: true,
      archivedAt: true,
    },
    with: {
      courts: {
        columns: { id: true, name: true },
        orderBy: (table, { asc }) => [asc(table.name), asc(table.id)],
      },
    },
    orderBy: (table, { asc }) => [
      asc(table.name),
      asc(table.city),
      asc(table.country),
      asc(table.id),
    ],
  });

  return {
    locked: false,
    groupKind: context.groupKind,
    venues: rows.map((venue) => ({
      id: venue.id,
      name: venue.name,
      city: venue.city,
      country: venue.country,
      archivedAt: venue.archivedAt,
      courts: venue.courts.map((court) => ({ id: court.id, name: court.name })),
    })),
  };
}

async function listCreateVenuesForUser(
  database: DbClient,
  args: { userId: string; groupId?: string },
) {
  if (args.groupId) {
    const group = await requireGroup(database, args.groupId);
    await assertMayCreateGameOnGroup(database, group, args.userId);
  }
  return listVenuesForGameCreate(database, args.groupId);
}

export const listCreateVenues = protectedProcedure
  .input(z.object({ groupId: z.string().uuid().optional() }))
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return listCreateVenuesForUser(ctx.db, {
      userId: appUser.id,
      groupId: input.groupId,
    });
  });
