import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";
import { z, ZodError } from "zod";

import { groups, groupSeries } from "@repo/db";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import {
  SERIES_COLOURS,
  SERIES_EMBLEMS,
  SERIES_RUNNING_MAX,
  seriesNameError,
} from "@repo/domain/series";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { groupIsVerified } from "#src/groups/group-is-verified";
import { assertGroupApprover } from "#src/groups/helpers/is-group-approver";
import { requireGroup } from "#src/groups/helpers/require-group";

type DbClient = typeof db;

export const createSeriesInput = z.object({
  groupId: z.string().uuid(),
  name: z.string(),
  emblem: z.enum(SERIES_EMBLEMS),
  colour: z.enum(SERIES_COLOURS),
});

/**
 * A Group approver of a Verified Group starts a Series (design 1b). The name
 * is free among the Group's running Series and the Group runs at most
 * `SERIES_RUNNING_MAX`; both are checked under the Group row lock so two
 * approvers creating at once cannot both pass.
 */
export async function createSeries(
  database: DbClient,
  args: z.infer<typeof createSeriesInput> & {
    userId: string;
    now?: Date;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const errors = messagesFor(locale).series.errors;
  const group = await requireGroup(database, args.groupId, locale);
  await assertGroupApprover(database, group, args.userId, locale);
  if (!groupIsVerified(group)) {
    throw new TRPCError({ code: "FORBIDDEN", message: errors.verifiedOnly });
  }
  const now = args.now ?? new Date();
  const name = args.name.trim();

  return database.transaction(async (tx) => {
    await tx
      .select({ id: groups.id })
      .from(groups)
      .where(eq(groups.id, group.id))
      .for("update");
    const running = await tx.query.groupSeries.findMany({
      where: and(
        eq(groupSeries.groupId, group.id),
        isNull(groupSeries.endedAt),
      ),
      columns: { name: true },
    });
    const nameError = seriesNameError(
      name,
      running.map((series) => series.name),
      locale,
    );
    if (nameError) {
      // A ZodError cause reaches the client as `zodError.fieldErrors`, which is
      // how a form learns the refusal belongs under its name field.
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: nameError,
        cause: new ZodError([
          { code: "custom", path: ["name"], message: nameError },
        ]),
      });
    }
    if (running.length >= SERIES_RUNNING_MAX) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: errors.tooMany(SERIES_RUNNING_MAX),
      });
    }

    const [created] = await tx
      .insert(groupSeries)
      .values({
        groupId: group.id,
        name,
        emblem: args.emblem,
        colour: args.colour,
        createdBy: args.userId,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: groupSeries.id });
    if (!created) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: errors.createFailed,
      });
    }
    return { id: created.id };
  });
}

export const createProcedure = protectedProcedure
  .input(createSeriesInput)
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return createSeries(ctx.db, {
      ...input,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
