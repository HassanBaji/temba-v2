import { asc, eq } from "drizzle-orm";

import { levelDisputes } from "@repo/db";

import { operatorProcedure } from "#src/trpc";
import { type db } from "#src/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export const OPERATOR_LEVEL_DISPUTES_LIMIT = 100;

/**
 * Every open Level dispute, oldest first, for an Operator to decide: the
 * player, their note, and the override they dispute with who set it, by
 * which door, and why, which the player never sees (ADR-0097).
 */
export async function listLevelDisputesForOperator(database: DbClient) {
  const rows = await database.query.levelDisputes.findMany({
    where: eq(levelDisputes.status, "open"),
    orderBy: [asc(levelDisputes.createdAt), asc(levelDisputes.id)],
    limit: OPERATOR_LEVEL_DISPUTES_LIMIT,
    columns: { id: true, note: true, createdAt: true },
    with: {
      raisedBy: { columns: { id: true, name: true, image: true } },
      levelOverride: {
        columns: {
          id: true,
          sport: true,
          setByRole: true,
          reason: true,
          note: true,
          muBefore: true,
          muAfter: true,
          createdAt: true,
        },
        with: {
          setBy: { columns: { id: true, name: true } },
          venue: { columns: { id: true, name: true } },
        },
      },
    },
  });

  return {
    items: rows.map((row) => ({
      id: row.id,
      note: row.note,
      createdAt: row.createdAt,
      raisedBy: row.raisedBy,
      override: {
        id: row.levelOverride.id,
        sport: row.levelOverride.sport,
        setByRole: row.levelOverride.setByRole,
        setBy: row.levelOverride.setBy ?? null,
        venue: row.levelOverride.venue ?? null,
        reason: row.levelOverride.reason,
        note: row.levelOverride.note,
        muBefore: row.levelOverride.muBefore,
        muAfter: row.levelOverride.muAfter,
        createdAt: row.levelOverride.createdAt,
      },
    })),
  };
}

export const listLevelDisputesForOperatorProcedure = operatorProcedure.query(
  async ({ ctx }) => listLevelDisputesForOperator(ctx.db),
);
