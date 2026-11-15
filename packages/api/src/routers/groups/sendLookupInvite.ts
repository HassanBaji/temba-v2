import { and, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";

import { groupMemberInvites, groupMembers, user } from "@repo/db";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import {
  enforceUserRateLimit,
  userRateLimits,
} from "#src/rate-limit/user-rate-limits";
import { type db } from "#src/db";
import { requireGroupLookupSender } from "#src/groups/helpers/require-group-lookup-sender";
import { mintLookup } from "#src/invites/doors";

type DbClient = typeof db;

export async function sendLookupInvite(
  database: DbClient,
  args: { groupId: string; userId: string; userIds: string[]; locale?: Locale },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const group = await requireGroupLookupSender(
    database,
    args.groupId,
    args.userId,
    locale,
  );

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
    groupId: string;
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

    const existingMember = await database.query.groupMembers.findFirst({
      where: and(
        eq(groupMembers.groupId, group.id),
        eq(groupMembers.userId, target.id),
      ),
    });

    if (existingMember) {
      refused.push({
        name: target.name,
        message: messagesFor(locale).group.errors.userAlreadyMember,
      });
      continue;
    }

    const existingInvite = await database.query.groupMemberInvites.findFirst({
      where: and(
        eq(groupMemberInvites.groupId, group.id),
        eq(groupMemberInvites.userId, target.id),
        isNull(groupMemberInvites.acceptedAt),
        isNull(groupMemberInvites.revokedAt),
      ),
    });

    if (existingInvite) {
      refused.push({
        name: target.name,
        message: messagesFor(locale).invite.errors.lookupExists,
      });
      continue;
    }

    try {
      const minted = await mintLookup(
        database,
        { kind: "group", id: group.id },
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

      sent.push({
        id: minted.invite.id,
        groupId: minted.invite.hostId,
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
      groupId: z.string().uuid(),
      userIds: z.array(z.string().uuid()).min(1).max(20),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    enforceUserRateLimit(userRateLimits.invite, ctx.userId, ctx.locale);
    const appUser = await resolveAppUser(ctx.userId);
    return sendLookupInvite(ctx.db, {
      groupId: input.groupId,
      userId: appUser.id,
      userIds: input.userIds,
      locale: ctx.locale,
    });
  });
