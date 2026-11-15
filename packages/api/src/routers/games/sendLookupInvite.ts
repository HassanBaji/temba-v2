import { TRPCError } from "@trpc/server";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";

import { type Locale, DEFAULT_LOCALE } from "@repo/i18n/locale";

import { gameMemberInvites, user } from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import {
  enforceUserRateLimit,
  userRateLimits,
} from "#src/rate-limit/user-rate-limits";
import { type db } from "#src/db";
import {
  assertGameOrganizer,
  requireGame,
  requireNotChallengeGame,
} from "#src/games/access";
import { userAlreadyOnGame } from "#src/games/helpers/user-already-on-game";
import { userAlreadyWaitlisted } from "#src/games/helpers/user-already-waitlisted";
import {
  assertGameInviteDoorsOpen,
  assertInviteeAllowedOnGame,
} from "#src/games/invites";
import { upsertApprovedLevelRangeWaiver } from "#src/games/level-range-requests";
import { mintLookup } from "#src/invites/doors";
import { isPartnerRequiredGame } from "@repo/domain/tournament-rounds";
import { messagesFor } from "@repo/i18n/messages";

type DbClient = typeof db;

export async function sendLookupInvite(
  database: DbClient,
  args: {
    gameId: string;
    userId: string;
    userIds: string[];
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const game = await requireGame(database, args.gameId, locale);
  requireNotChallengeGame(game, args.locale);
  await assertGameOrganizer(database, game, args.userId, locale);
  await assertGameInviteDoorsOpen(database, game, undefined, locale);
  if (game.registrationMode === "team_only") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).invite.errors.teamOnlyNoLookup,
    });
  }
  if (isPartnerRequiredGame(game)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).tournament.errors.partnerRequired,
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
      refused.push({
        name: messagesFor(locale).invite.errors.unknownUser,
        message: messagesFor(locale).profile.errors.userNotFound,
      });
      continue;
    }

    if (target.id === args.userId) {
      refused.push({
        name: target.name,
        message: messagesFor(locale).invite.errors.lookupSelf,
      });
      continue;
    }

    try {
      await assertInviteeAllowedOnGame(database, game, target.id, locale);
    } catch (error) {
      refused.push({
        name: target.name,
        message:
          error instanceof TRPCError
            ? error.message
            : messagesFor(locale).game.errors.groupMembersInvites,
      });
      continue;
    }

    if (await userAlreadyOnGame(database, game.id, target.id)) {
      refused.push({
        name: target.name,
        message: messagesFor(locale).game.errors.userAlreadyRegistered,
      });
      continue;
    }

    if (await userAlreadyWaitlisted(database, game.id, target.id)) {
      refused.push({
        name: target.name,
        message: messagesFor(locale).game.errors.userWaitlisted,
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
        message: messagesFor(locale).invite.errors.lookupExists,
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
              ? messagesFor(locale).invite.errors.lookupExists
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
        message: messagesFor(locale).invite.errors.lookupExists,
      });
    }
  }

  return { sent, refused };
}

export const sendLookupInviteProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      userIds: z.array(z.string().uuid()).min(1).max(20),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    enforceUserRateLimit(userRateLimits.invite, ctx.userId, ctx.locale);
    const appUser = await resolveAppUser(ctx.userId);
    return sendLookupInvite(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      userIds: input.userIds,
      locale: ctx.locale,
    });
  });
