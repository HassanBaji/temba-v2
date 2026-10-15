import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";

import { venueManagers } from "@repo/db";
import type { DbClient, DbTx } from "@repo/db";

import { isOperatorPublicMetadata } from "#src/auth/require-operator";

type DbOrTx = DbClient | DbTx;

export async function requireVenueManager(
  database: DbOrTx,
  args: {
    venueId: string;
    userId: string;
    publicMetadata: Record<string, unknown> | undefined;
  },
) {
  if (isOperatorPublicMetadata(args.publicMetadata)) {
    return;
  }

  const row = await database.query.venueManagers.findFirst({
    where: and(
      eq(venueManagers.venueId, args.venueId),
      eq(venueManagers.userId, args.userId),
    ),
    columns: { id: true },
  });

  if (!row) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only Venue managers can manage this Venue",
    });
  }
}

export async function listManagedVenueIds(
  database: DbOrTx,
  userId: string,
): Promise<string[]> {
  const rows = await database
    .select({ venueId: venueManagers.venueId })
    .from(venueManagers)
    .where(eq(venueManagers.userId, userId));
  return rows.map((row) => row.venueId);
}
