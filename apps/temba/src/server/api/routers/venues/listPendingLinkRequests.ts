import { eq } from "drizzle-orm";

import { venueLinkRequests, VenueLinkRequestStatusEnum } from "@repo/db";

import { operatorProcedure } from "~/server/api/trpc";
import { type db } from "~/server/db";

type DbClient = typeof db;

export async function listPendingLinkRequests(database: DbClient) {
  const rows = await database.query.venueLinkRequests.findMany({
    where: eq(venueLinkRequests.status, VenueLinkRequestStatusEnum.PENDING),
    with: {
      community: {
        columns: {
          id: true,
          name: true,
          archivedAt: true,
        },
      },
      venue: {
        columns: {
          id: true,
          name: true,
          city: true,
          country: true,
          archivedAt: true,
        },
      },
      requestedBy: {
        columns: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: (table, { asc }) => [asc(table.createdAt)],
  });

  return rows.map((row) => ({
    id: row.id,
    createdAt: row.createdAt,
    community: row.community,
    venue: row.venue,
    requestedBy: row.requestedBy,
  }));
}

export const listPendingLinkRequestsProcedure = operatorProcedure.query(
  async ({ ctx }) => {
    return listPendingLinkRequests(ctx.db);
  },
);
