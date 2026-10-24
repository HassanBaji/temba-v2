import type { DbClient, DbTx, groups } from "@repo/db";

export async function groupIsVerified(
  _database: DbClient | DbTx,
  group: Pick<typeof groups.$inferSelect, "verifiedAt">,
): Promise<boolean> {
  return group.verifiedAt !== null;
}
