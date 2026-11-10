import { TRPCError } from "@trpc/server";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { gameMemberInvites } from "@repo/db";
import { messagesFor } from "@repo/i18n/messages";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { requireGame } from "#src/games/access";
import { assertPoolDrawNotPosted } from "#src/games/assert-pool-draw-not-posted";
import {
  assertGameInviteDoorsOpen,
  assertInviteeAllowedOnGame,
} from "#src/games/invites";
import { acceptLookup, throwInviteFrozen } from "#src/invites/doors";

type DbClient = typeof db;

export async function acceptLookupInvite(
  database: DbClient,
  args: {
    inviteId: string;
    userId: string;
    sideIndex?: number;
    position?: "left" | "right";
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const invite = await database.query.gameMemberInvites.findFirst({
    where: eq(gameMemberInvites.id, args.inviteId),
  });
  if (!invite || invite.acceptedAt || invite.revokedAt) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: messagesFor(locale).invite.errors.lookupUnavailable,
    });
  }
  if (invite.userId !== args.userId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: messagesFor(locale).invite.errors.differentUser,
    });
  }
  const game = await requireGame(database, invite.gameId, locale);
  assertPoolDrawNotPosted(game, locale);
  await assertGameInviteDoorsOpen(database, game, undefined, locale);
  await assertInviteeAllowedOnGame(database, game, args.userId, locale);

  const accepted = await acceptLookup(
    database,
    { kind: "game", id: game.id },
    {
      inviteId: invite.id,
      userId: args.userId,
      locale: args.locale ?? DEFAULT_LOCALE,
      seat:
        args.sideIndex != null && args.position
          ? { sideIndex: args.sideIndex, position: args.position }
          : undefined,
    },
  );
  if (!accepted.ok) {
    if (accepted.reason === "seat_required") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: messagesFor(locale).game.errors.pickVacantPosition,
      });
    }
    if (accepted.reason === "frozen") {
      throwInviteFrozen(
        { kind: "game", id: game.id },
        "accept",
        "frozen",
        locale,
      );
    }
    throw new TRPCError({
      code: "NOT_FOUND",
      message: messagesFor(locale).invite.errors.lookupUnavailable,
    });
  }

  return {
    ok: true as const,
    gameId: game.id,
    waitlisted: accepted.waitlisted ?? false,
  };
}

export const acceptLookupInviteProcedure = protectedProcedure
  .input(
    z.object({
      inviteId: z.string().uuid(),
      sideIndex: z.number().int().min(1).optional(),
      position: z.enum(["left", "right"]).optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return acceptLookupInvite(ctx.db, {
      inviteId: input.inviteId,
      userId: appUser.id,
      sideIndex: input.sideIndex,
      position: input.position,
      locale: ctx.locale,
    });
  });
