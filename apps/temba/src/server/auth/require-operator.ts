import { currentUser } from "@clerk/nextjs/server";
import { TRPCError } from "@trpc/server";

export function isOperatorPublicMetadata(
  publicMetadata: UserPublicMetadata | undefined,
): boolean {
  return publicMetadata?.operator === true;
}

/**
 * Clerk `publicMetadata.operator` is the Operator check. No User role column
 * and no in-app grant or revoke.
 */
export async function requireOperator() {
  const clerkUser = await currentUser();
  if (!clerkUser || !isOperatorPublicMetadata(clerkUser.publicMetadata)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only Operators can manage Venues",
    });
  }

  return clerkUser;
}
