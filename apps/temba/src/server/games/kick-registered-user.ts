import { type GameRow } from "~/server/games/access";
import { leaveRegisteredSeat } from "~/server/games/waitlist";
import { type db } from "~/server/db";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function kickRegisteredUser(
  database: Tx,
  game: GameRow,
  userId: string,
) {
  await leaveRegisteredSeat(
    database,
    game,
    userId,
    "That User is not registered on this Game",
  );
}
