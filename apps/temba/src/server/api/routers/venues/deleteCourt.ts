import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { courts } from "@repo/db";

import { operatorProcedure } from "~/server/api/trpc";
import { type db } from "~/server/db";

type DbClient = typeof db;

export async function deleteCourt(
  database: DbClient,
  args: { courtId: string },
) {
  const existing = await database.query.courts.findFirst({
    where: eq(courts.id, args.courtId),
    columns: { id: true },
  });

  if (!existing) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Court not found" });
  }

  await database.delete(courts).where(eq(courts.id, args.courtId));
  return { id: existing.id };
}

export const deleteCourtProcedure = operatorProcedure
  .input(z.object({ id: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    return deleteCourt(ctx.db, { courtId: input.id });
  });
