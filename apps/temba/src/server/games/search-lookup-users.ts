import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";

import { gameMemberInvites } from "@repo/db";

import { assertGameOrganizer, requireGame } from "~/server/games/access";
import { gameHideRegisteredWaitlistedSelf } from "~/server/games/helpers/game-hide-registered-waitlisted-self";
import { searchUsersForGamePicker } from "~/server/games/helpers/search-users-for-game-picker";
import { assertGameInviteDoorsOpen } from "~/server/games/invites";
import { type db } from "~/server/db";

type DbClient = typeof db;

async function gameLookupHideUserIds(
  database: DbClient,
  gameId: string,
  selfId: string,
) {
  const unusedInvites = await database.query.gameMemberInvites.findMany({
    where: and(
      eq(gameMemberInvites.gameId, gameId),
      isNull(gameMemberInvites.acceptedAt),
      isNull(gameMemberInvites.revokedAt),
    ),
    columns: { userId: true },
  });

  return [
    ...(await gameHideRegisteredWaitlistedSelf(database, gameId, selfId)),
    ...unusedInvites.map((row) => row.userId),
  ];
}

export async function searchLookupUsers(
  database: DbClient,
  args: { gameId: string; userId: string; query: string },
) {
  const game = await requireGame(database, args.gameId);
  await assertGameOrganizer(database, game, args.userId);
  await assertGameInviteDoorsOpen(database, game);
  if (game.registrationMode === "team_only") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Team-only Games do not use Lookup invites",
    });
  }

  const excludeUserIds = await gameLookupHideUserIds(
    database,
    game.id,
    args.userId,
  );

  return searchUsersForGamePicker(database, game, {
    query: args.query,
    excludeUserIds,
  });
}
