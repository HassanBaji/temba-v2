import { eq } from "drizzle-orm";

import { gameInviteLinks } from "@repo/db";

import { getRegistrationStatus, requireGame } from "~/server/games/access";
import {
  isIndividualSeatGame,
  listGameSides,
  vacantPositionsFromSides,
} from "~/server/games/seats";
import { previewLink } from "~/server/invites/doors";
import { type db } from "~/server/db";

type DbClient = typeof db;

export async function previewInviteLink(
  database: DbClient,
  args: { token: string },
) {
  const previewed = await previewLink(database, "game", args.token);
  if (previewed.status !== "ready") {
    return { status: previewed.status };
  }
  const link = await database.query.gameInviteLinks.findFirst({
    where: eq(gameInviteLinks.token, args.token),
  });
  if (!link) {
    return { status: "invalid" as const };
  }
  const gameRow = await requireGame(database, link.gameId);
  const needsSeatPick = isIndividualSeatGame(gameRow);
  const sides = needsSeatPick ? await listGameSides(database, gameRow) : [];
  return {
    status: "ready" as const,
    gameName: previewed.name,
    format: gameRow.format,
    registrationStatus: await getRegistrationStatus(
      database,
      gameRow,
      new Date(),
    ),
    needsSeatPick,
    sides,
    vacantSeats: vacantPositionsFromSides(sides),
  };
}
