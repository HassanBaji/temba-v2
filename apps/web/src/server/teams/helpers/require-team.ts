import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { teams } from "@repo/db";

import { type db } from "~/server/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function requireTeam(database: DbClient, id: string) {
  const team = await database.query.teams.findFirst({
    where: eq(teams.id, id),
  });

  if (!team) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
  }

  return team;
}
