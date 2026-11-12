import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { groupMembers } from "@repo/db";
import {
  MEMBER_NICKNAME_MAX_LENGTH,
  normalizeMemberNickname,
  type MemberNicknameVisibility,
} from "@repo/domain/member-nickname";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { assertGroupApprover } from "#src/groups/helpers/is-group-approver";
import { requireGroup } from "#src/groups/helpers/require-group";

type DbClient = typeof db;

/**
 * Sets, changes or clears a member's Member nickname. Any Group approver may;
 * the last editor is recorded. A blank name clears it.
 */
export async function setMemberNickname(
  database: DbClient,
  args: {
    groupId: string;
    approverUserId: string;
    userId: string;
    nickname: string | null;
    visibility: MemberNicknameVisibility;
    now?: Date;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const m = messagesFor(locale).group.errors;
  const group = await requireGroup(database, args.groupId, locale);
  await assertGroupApprover(database, group, args.approverUserId, locale);

  const nickname =
    args.nickname == null ? null : normalizeMemberNickname(args.nickname);
  if (nickname != null && nickname.length > MEMBER_NICKNAME_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: m.nicknameTooLong(MEMBER_NICKNAME_MAX_LENGTH),
    });
  }

  const membership = await database.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.groupId, group.id),
      eq(groupMembers.userId, args.userId),
    ),
    columns: { id: true },
  });
  if (!membership) {
    throw new TRPCError({ code: "NOT_FOUND", message: m.playerNotInGroup });
  }

  const now = args.now ?? new Date();
  await database
    .update(groupMembers)
    .set({
      nickname,
      nicknameVisibility: args.visibility,
      nicknameUpdatedById: args.approverUserId,
      nicknameUpdatedAt: now,
      updatedAt: now,
    })
    .where(eq(groupMembers.id, membership.id));

  return {
    ok: true as const,
    groupId: group.id,
    userId: args.userId,
    nickname:
      nickname == null ? null : { name: nickname, visibility: args.visibility },
  };
}

export const setMemberNicknameProcedure = protectedProcedure
  .input(
    z.object({
      groupId: z.string().uuid(),
      userId: z.string().uuid(),
      nickname: z.string().max(200).nullable(),
      visibility: z.enum(["approvers", "group"]),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return setMemberNickname(ctx.db, {
      groupId: input.groupId,
      approverUserId: appUser.id,
      userId: input.userId,
      nickname: input.nickname,
      visibility: input.visibility,
      locale: ctx.locale,
    });
  });
