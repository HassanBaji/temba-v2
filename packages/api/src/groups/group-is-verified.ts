import { eq } from "drizzle-orm";

import { communities, type DbClient, type DbTx, type groups } from "@repo/db";

export async function groupIsVerified(
  database: DbClient | DbTx,
  group: Pick<typeof groups.$inferSelect, "verifiedAt" | "communityId">,
): Promise<boolean> {
  if (group.verifiedAt !== null) {
    return true;
  }
  if (!group.communityId) {
    return false;
  }
  const community = await database.query.communities.findFirst({
    where: eq(communities.id, group.communityId),
    columns: { isVenueCommunity: true },
  });
  return community?.isVenueCommunity === true;
}
