import { eq } from "drizzle-orm";

import { americanoSeats, gameTeamPlayers } from "@repo/db";

import { bothSlotsFilled } from "#src/games/both-slots-filled";
import { type MatchRow } from "#src/games/utils";
import { type db } from "#src/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

async function gameTeamHasTwoPlayers(database: DbClient, gameTeamId: string) {
  const links = await database.query.gameTeamPlayers.findMany({
    where: eq(gameTeamPlayers.gameTeamId, gameTeamId),
    columns: { id: true },
  });
  return links.length === 2;
}

/** An Americano Match is complete with two players on each side. */
async function americanoSidesComplete(database: DbClient, matchId: string) {
  const seats = await database.query.americanoSeats.findMany({
    where: eq(americanoSeats.matchId, matchId),
    columns: { slot: true },
  });
  return (
    seats.filter((seat) => seat.slot === 1).length === 2 &&
    seats.filter((seat) => seat.slot === 2).length === 2
  );
}

export async function bothSlottedTeamsComplete(
  database: DbClient,
  match: MatchRow,
) {
  if (!match.slot1GameTeamId && !match.slot2GameTeamId) {
    return americanoSidesComplete(database, match.id);
  }
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
