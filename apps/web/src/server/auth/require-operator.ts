import { TRPCError } from "@trpc/server";

export function isOperatorPublicMetadata(
  publicMetadata: Record<string, unknown> | undefined,
): boolean {
  return publicMetadata?.operator === true;
}

/**
 * Clerk `publicMetadata.operator` is the Operator check. No User role column
 * and no in-app grant or revoke.
 */
export async function requireOperator(ctx: {
  getPublicMetadata: () => Promise<Record<string, unknown> | undefined>;
}) {
  if (!isOperatorPublicMetadata(await ctx.getPublicMetadata())) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only Operators can manage Venues",
    });
  }
}
