import { z } from "zod";

import type { DbClient } from "@repo/db";

import { searchLookupUsers } from "#src/invites/search-lookup-users";
import { operatorProcedure } from "#src/trpc";

export async function searchManagerUsers(
  database: DbClient,
  args: { query: string },
) {
  const rows = await searchLookupUsers(database, {
    query: args.query,
    excludeUserIds: [],
  });
  const images = await database.query.user.findMany({
    where: (table, { inArray }) =>
      inArray(
        table.id,
        rows.map((row) => row.id),
      ),
    columns: { id: true, image: true },
  });
  const imageById = new Map(images.map((row) => [row.id, row.image]));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    username: row.username,
    image: imageById.get(row.id) ?? null,
  }));
}

export const searchManagerUsersProcedure = operatorProcedure
  .input(z.object({ query: z.string().trim().min(1).max(100) }))
  .query(async ({ ctx, input }) => {
    return searchManagerUsers(ctx.db, { query: input.query });
  });
