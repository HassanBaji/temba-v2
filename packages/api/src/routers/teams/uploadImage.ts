import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { teams } from "@repo/db";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import {
  assertGroupImageType,
  decodeGroupImageBase64,
  GROUP_IMAGE_CONTENT_TYPES,
  type GroupImageContentType,
} from "#src/storage/group-images";
import { uploadTeamImageObject } from "#src/storage/team-images";
import { requireTeam } from "#src/teams/helpers/require-team";

type DbClient = typeof db;

export async function uploadImage(
  database: DbClient,
  args: {
    teamId: string;
    contentType: GroupImageContentType;
    dataBase64: string;
    userId: string;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const team = await requireTeam(database, args.teamId, locale);

  if (team.createdBy !== args.userId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: messagesFor(locale).team.errors.captainImage,
    });
  }

  const bytes = decodeGroupImageBase64(args.dataBase64, locale);
  const contentType = assertGroupImageType(bytes, args.contentType, locale);
  const imageUrl = await uploadTeamImageObject({
    teamId: team.id,
    bytes,
    contentType,
  });

  const [updated] = await database
    .update(teams)
    .set({ imageUrl, updatedAt: new Date() })
    .where(eq(teams.id, team.id))
    .returning({ id: teams.id, imageUrl: teams.imageUrl });

  if (!updated) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to save Team image",
    });
  }

  return updated;
}

export const uploadImageProcedure = protectedProcedure
  .input(
    z.object({
      teamId: z.string().uuid(),
      contentType: z.enum(GROUP_IMAGE_CONTENT_TYPES),
      dataBase64: z.string().min(1),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return uploadImage(ctx.db, {
      teamId: input.teamId,
      contentType: input.contentType,
      dataBase64: input.dataBase64,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
