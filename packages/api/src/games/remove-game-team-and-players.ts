import { eq } from "drizzle-orm";

import { gamePlayers, gameTeamPlayers, gameTeams } from "@repo/db";

import { clearMatchSlotsForGameTeam } from "#src/games/clear-match-slots-for-game-team";
import { type db } from "#src/db";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function removeGameTeamAndPlayers(
  database: Tx,
  gameTeamId: string,
) {
  const links = await database.query.gameTeamPlayers.findMany({
    where: eq(gameTeamPlayers.gameTeamId, gameTeamId),
    columns: { gamePlayerId: true },
  });
  await clearMatchSlotsForGameTeam(database, gameTeamId);
  await database.delete(gameTeams).where(eq(gameTeams.id, gameTeamId));
  for (const link of links) {
    await database
      .delete(gamePlayers)
      .where(eq(gamePlayers.id, link.gamePlayerId));
  }
}
