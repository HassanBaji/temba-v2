import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { groupMembers } from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { requireGroupPhoneAdder } from "#src/groups/helpers/require-group-phone-adder";
import { maskPhone } from "#src/unclaimed-players/mask-phone";
import { requireE164 } from "#src/unclaimed-players/require-e164";
import { resolvePhonePlayer } from "#src/unclaimed-players/resolve-phone-player";

type DbClient = typeof db;

export type GroupPhonePlayerPreview = {
  kind: "account" | "unclaimed" | "new";
  name: string | null;
  alreadyInGroup: boolean;
  phoneMasked?: string;
};

export async function previewPlayerByPhone(
  database: DbClient,
  args: {
    groupId: string;
    approverUserId: string;
    countryIso: string;
    nationalNumber: string;
  },
): Promise<GroupPhonePlayerPreview> {
  const { group } = await requireGroupPhoneAdder(
    database,
    args.groupId,
    args.approverUserId,
  );
  const phoneNumber = requireE164(args.countryIso, args.nationalNumber);

  const resolved = await resolvePhonePlayer(database, phoneNumber);
  if (resolved.kind === "new") {
    return { kind: "new", name: null, alreadyInGroup: false };
  }
  const membership = await database.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.groupId, group.id),
      eq(groupMembers.userId, resolved.user.id),
    ),
    columns: { id: true },
  });
  const alreadyInGroup = membership !== undefined;
  if (resolved.kind === "account") {
    return { kind: "account", name: resolved.user.name, alreadyInGroup };
  }
  return {
    kind: "unclaimed",
    name: resolved.user.name,
    alreadyInGroup,
    phoneMasked: maskPhone(phoneNumber),
  };
}

export const previewPlayerByPhoneProcedure = protectedProcedure
  .input(
    z.object({
      groupId: z.string().uuid(),
      countryIso: z.string().trim().min(1).max(8),
      nationalNumber: z.string().trim().min(1).max(32),
    }),
  )
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return previewPlayerByPhone(ctx.db, {
      groupId: input.groupId,
      approverUserId: appUser.id,
      countryIso: input.countryIso,
      nationalNumber: input.nationalNumber,
    });
  });
