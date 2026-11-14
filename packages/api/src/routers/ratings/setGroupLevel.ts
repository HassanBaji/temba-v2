import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { protectedProcedure } from "#src/trpc";
import { LEVEL_TENTHS_MAX, LEVEL_TENTHS_MIN } from "@repo/domain/level-range";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

/**
 * The Group Level is retired (ADR-0066): a padel Group keeps only a Standing
 * and a football Group's Organizers adjust Tier points instead. The path
 * stays so an older client gets a clear refusal; nothing is written, and the
 * old `group_ratings` and `group_level_overrides` rows stay for history.
 */
export function setGroupLevelForMember(args: { locale?: Locale } = {}): never {
  throw new TRPCError({
    code: "PRECONDITION_FAILED",
    message: messagesFor(args.locale ?? DEFAULT_LOCALE).level.errors
      .groupLevelRetired,
  });
}

export const setGroupLevel = protectedProcedure
  .input(
    z.object({
      groupId: z.string().uuid(),
      userId: z.string().uuid(),
      levelTenths: z.number().int().min(LEVEL_TENTHS_MIN).max(LEVEL_TENTHS_MAX),
    }),
  )
  .mutation(({ ctx }) => setGroupLevelForMember({ locale: ctx.locale }));
