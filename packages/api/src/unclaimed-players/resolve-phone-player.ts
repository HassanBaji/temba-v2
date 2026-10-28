import type { DbClient, DbTx } from "@repo/db";
import { eq } from "drizzle-orm";

import { user } from "@repo/db";

import { isUnclaimed } from "#src/unclaimed-players/is-unclaimed";

type PhonePlayerUser = typeof user.$inferSelect;

export type ResolvedPhonePlayer =
  | { kind: "account"; user: PhonePlayerUser }
  | { kind: "unclaimed"; user: PhonePlayerUser }
  | { kind: "new" };

export async function resolvePhonePlayer(
  database: DbClient | DbTx,
  phoneNumber: string,
): Promise<ResolvedPhonePlayer> {
  const row = await database.query.user.findFirst({
    where: eq(user.phoneNumber, phoneNumber),
  });
  if (!row) {
    return { kind: "new" };
  }
  // A legacy row without a clerkId predates Clerk and was a real sign-up, so
  // it is treated as an account holder rather than offered as a new player.
  return isUnclaimed(row)
    ? { kind: "unclaimed", user: row }
    : { kind: "account", user: row };
}
