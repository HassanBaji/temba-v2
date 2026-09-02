import { TRPCError } from "@trpc/server";
import { and, eq, inArray, isNull } from "drizzle-orm";

import { gameMemberInvites, user } from "@repo/db";

import { assertGameOrganizer, requireGame } from "~/server/games/access";
import { userAlreadyOnGame } from "~/server/games/helpers/user-already-on-game";
import { userAlreadyWaitlisted } from "~/server/games/helpers/user-already-waitlisted";
import {
  assertGameInviteDoorsOpen,
  assertInviteeAllowedOnGame,
} from "~/server/games/invites";
import { upsertApprovedLevelRangeWaiver } from "~/server/games/level-range-requests";
import { mintLookup } from "~/server/invites/doors";
import { type db } from "~/server/db";

type DbClient = typeof db;

export async function sendLookupInvite(
  database: DbClient,
  args: { gameId: string; userId: string; userIds: string[] },
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

  const uniqueIds = [...new Set(args.userIds)];
  const targets = await database.query.user.findMany({
    where: inArray(user.id, uniqueIds),
    columns: {
      id: true,
      name: true,
    },
  });
  const targetsById = new Map(targets.map((row) => [row.id, row]));

  const sent: {
    id: string;
    gameId: string;
    userId: string;
    createdAt: Date;
  }[] = [];
  const refused: { name: string; message: string }[] = [];

  for (const userId of uniqueIds) {
    const target = targetsById.get(userId);
    if (!target) {
      refused.push({ name: "Unknown User", message: "User not found" });
      continue;
    }

    if (target.id === args.userId) {
      refused.push({
        name: target.name,
        message: "You cannot Lookup-invite yourself",
      });
      continue;
    }

    try {
      await assertInviteeAllowedOnGame(database, game, target.id);
    } catch (error) {
      refused.push({
        name: target.name,
        message:
          error instanceof TRPCError
            ? error.message
            : "Only Group members can use invites on this Game",
      });
      continue;
    }

    if (await userAlreadyOnGame(database, game.id, target.id)) {
      refused.push({
        name: target.name,
        message: "That User is already registered on this Game",
      });
      continue;
    }

    if (await userAlreadyWaitlisted(database, game.id, target.id)) {
      refused.push({
        name: target.name,
        message: "That User is already on the waitlist",
      });
      continue;
    }

    const existing = await database.query.gameMemberInvites.findFirst({
      where: and(
        eq(gameMemberInvites.gameId, game.id),
        eq(gameMemberInvites.userId, target.id),
        isNull(gameMemberInvites.acceptedAt),
        isNull(gameMemberInvites.revokedAt),
      ),
    });
    if (existing) {
      refused.push({
        name: target.name,
        message: "An unused Lookup invite already exists for this User",
      });
      continue;
    }

    try {
      const minted = await mintLookup(
        database,
        { kind: "game", id: game.id },
        { userId: target.id, invitedBy: args.userId },
      );
      if (!minted.ok) {
        refused.push({
          name: target.name,
          message:
            minted.reason === "unused_exists"
              ? "An unused Lookup invite already exists for this User"
              : "Failed to create Lookup invite",
        });
        continue;
      }
      await upsertApprovedLevelRangeWaiver(database, {
        gameId: game.id,
        userId: target.id,
        decidedBy: args.userId,
      });
      sent.push({
        id: minted.invite.id,
        gameId: minted.invite.hostId,
        userId: minted.invite.userId,
        createdAt: minted.invite.createdAt,
      });
    } catch {
      refused.push({
        name: target.name,
        message: "An unused Lookup invite already exists for this User",
      });
    }
  }

  return { sent, refused };
}
