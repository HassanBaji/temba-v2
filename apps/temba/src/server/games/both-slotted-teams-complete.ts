import { eq } from "drizzle-orm";

import { gameTeamPlayers } from "@repo/db";

import { bothSlotsFilled } from "~/server/games/both-slots-filled";
import { type MatchRow } from "~/server/games/utils";
import { type db } from "~/server/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

async function gameTeamHasTwoPlayers(database: DbClient, gameTeamId: string) {
  const links = await database.query.gameTeamPlayers.findMany({
    where: eq(gameTeamPlayers.gameTeamId, gameTeamId),
    columns: { id: true },
  });
  return links.length === 2;
}

export async function bothSlottedTeamsComplete(
  database: DbClient,
  match: MatchRow,
) {
  if (
    !bothSlotsFilled(match) ||
    !match.slot1GameTeamId ||
    !match.slot2GameTeamId
  ) {
    return false;
  }
  return (
    (await gameTeamHasTwoPlayers(database, match.slot1GameTeamId)) &&
    (await gameTeamHasTwoPlayers(database, match.slot2GameTeamId))
  );
}
