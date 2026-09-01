import { eq } from "drizzle-orm";

import { matches } from "@repo/db";

import { type db } from "~/server/db";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function clearMatchSlotsForGameTeam(
  database: Tx | typeof db,
  gameTeamId: string,
) {
  await database
    .update(matches)
    .set({ slot1GameTeamId: null, updatedAt: new Date() })
    .where(eq(matches.slot1GameTeamId, gameTeamId));
  await database
    .update(matches)
    .set({ slot2GameTeamId: null, updatedAt: new Date() })
    .where(eq(matches.slot2GameTeamId, gameTeamId));
}
