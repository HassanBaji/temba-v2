import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { user } from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { setNameSchema, writeUserName } from "#src/routers/users/setName";
import { productDayKey } from "@repo/domain/product-timezone";
import {
  GENDERS,
  HOME_AREAS,
  NATIONALITIES,
  birthDateProblem,
} from "@repo/domain/profile-details";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export const setProfileDetailsSchema = setNameSchema.extend({
  gender: z.enum(GENDERS).nullable(),
  birthDate: z.string().nullable(),
  homeArea: z.enum(HOME_AREAS).nullable(),
  nationality: z.enum(NATIONALITIES).nullable(),
});

/** Your details: name, gender, birth date, home area and nationality. */
export async function writeProfileDetails(
  database: DbClient,
  args: z.infer<typeof setProfileDetailsSchema> & {
    userId: string;
    now?: Date;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  if (args.birthDate !== null) {
    const problem = birthDateProblem(
      args.birthDate,
      productDayKey(args.now ?? new Date()),
    );
    if (problem) {
      const m = messagesFor(locale).you.details;
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: problem === "tooYoung" ? m.tooYoung : m.birthDateInvalid,
      });
    }
  }

  return database.transaction(async (tx) => {
    const name = await writeUserName(tx, {
      userId: args.userId,
      firstName: args.firstName,
      lastName: args.lastName,
      locale,
    });
    await tx
      .update(user)
      .set({
        gender: args.gender,
        birthDate: args.birthDate,
        homeArea: args.homeArea,
        nationality: args.nationality,
        updatedAt: new Date(),
      })
      .where(eq(user.id, args.userId));
    return name;
  });
}

export const setProfileDetails = protectedProcedure
  .input(setProfileDetailsSchema)
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return writeProfileDetails(ctx.db, {
      ...input,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
