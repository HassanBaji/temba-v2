import { TRPCError } from "@trpc/server";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

export function isOperatorPublicMetadata(
  publicMetadata: Record<string, unknown> | undefined,
): boolean {
  return publicMetadata?.operator === true;
}

/**
 * Clerk `publicMetadata.operator` is the Operator check, with no in-app grant
 * or revoke. `user.is_operator` is only a copy for finding Operators
 * (ADR-0081), never this check.
 */
export async function requireOperator(
  ctx: {
    getPublicMetadata: () => Promise<Record<string, unknown> | undefined>;
  },
  locale: Locale = DEFAULT_LOCALE,
) {
  if (!isOperatorPublicMetadata(await ctx.getPublicMetadata())) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: messagesFor(locale).auth.errors.operatorOnly,
    });
  }
}
