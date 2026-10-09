import { TRPCError } from "@trpc/server";

export function isLevelSetterPublicMetadata(
  publicMetadata: Record<string, unknown> | undefined,
): boolean {
  return publicMetadata?.levelSetter === true;
}

/**
 * Clerk `publicMetadata.levelSetter` is the Level setter check. No User role
 * column and no in-app grant or revoke.
 */
export async function requireLevelSetter(ctx: {
  getPublicMetadata: () => Promise<Record<string, unknown> | undefined>;
}) {
  if (!isLevelSetterPublicMetadata(await ctx.getPublicMetadata())) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only Level setters can set a Level",
    });
  }
}
