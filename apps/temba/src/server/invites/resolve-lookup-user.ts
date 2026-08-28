import { TRPCError } from "@trpc/server";
import { eq, or, sql } from "drizzle-orm";

import { user } from "@repo/db";

import { type db } from "~/server/db";

type DbClient = typeof db;

/**
 * Resolve exactly one existing User from a single Lookup invite search string.
 * Email and username match case-insensitively and exactly; phone matches the
 * stored Clerk primary exactly. Zero or more than one User is a refuse.
 */
export async function resolveLookupUser(database: DbClient, rawQuery: string) {
  const query = rawQuery.trim();
  if (query.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Lookup did not match exactly one User",
    });
  }

  const matches = await database.query.user.findMany({
    where: or(
      sql`lower(${user.email}) = lower(${query})`,
      sql`lower(${user.username}) = lower(${query})`,
      eq(user.phoneNumber, query),
    ),
  });

  const uniqueById = [...new Map(matches.map((row) => [row.id, row])).values()];

  if (uniqueById.length !== 1) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Lookup did not match exactly one User",
    });
  }

  const matched = uniqueById[0];
  if (!matched) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Lookup did not match exactly one User",
    });
  }

  return matched;
}
