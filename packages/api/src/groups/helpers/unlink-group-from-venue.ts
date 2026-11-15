import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { groups } from "@repo/db";
import type { DbClient } from "@repo/db";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

/** Clears the Group's Venue link; the Group becomes Loose again. */
export async function unlinkGroupFromVenue(
  database: DbClient,
  args: { groupId: string; venueId?: string; locale?: Locale },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  return database.transaction(async (tx) => {
    const [group] = await tx
      .select()
      .from(groups)
      .where(eq(groups.id, args.groupId))
      .for("update");
    if (!group) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: messagesFor(locale).group.errors.notFound,
      });
    }

    if (!group.venueId || (args.venueId && args.venueId !== group.venueId)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: messagesFor(locale).group.errors.notLinkedToVenue,
      });
    }

    await tx
      .update(groups)
      .set({ venueId: null, updatedAt: new Date() })
      .where(eq(groups.id, group.id));

    return { ok: true as const, groupId: group.id, venueId: group.venueId };
  });
}
