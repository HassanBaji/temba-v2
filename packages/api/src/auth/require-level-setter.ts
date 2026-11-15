import { TRPCError } from "@trpc/server";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

export function isLevelSetterPublicMetadata(
  publicMetadata: Record<string, unknown> | undefined,
): boolean {
  return publicMetadata?.levelSetter === true;
}

/**
 * Clerk `publicMetadata.levelSetter` is the Level setter check. No User role
 * column and no in-app grant or revoke.
 */
export async function requireLevelSetter(
  ctx: {
    getPublicMetadata: () => Promise<Record<string, unknown> | undefined>;
  },
  locale: Locale = DEFAULT_LOCALE,
) {
  if (!isLevelSetterPublicMetadata(await ctx.getPublicMetadata())) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: messagesFor(locale).auth.errors.levelSetterOnly,
    });
  }
}
