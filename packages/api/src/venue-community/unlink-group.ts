import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";

import {
  communities,
  groupLinkRequests,
  GroupLinkRequestStatusEnum,
  groups,
} from "@repo/db";
import type { DbClient, DbTx } from "@repo/db";

import { consult, refuseIfFrozen } from "#src/soft-archive";

type DbOrTx = DbClient | DbTx;

// Only a Group that arrived through an approved Group link request may leave;
// a Group made with Create Club Group inside the Venue Community stays (rule 24).
async function venueCommunityLink(
  database: DbOrTx,
  group: Pick<typeof groups.$inferSelect, "id" | "communityId">,
) {
  if (!group.communityId) {
    return null;
  }
  const community = await database.query.communities.findFirst({
    where: eq(communities.id, group.communityId),
    columns: { venueId: true, isVenueCommunity: true, archivedAt: true },
  });
  if (!community?.isVenueCommunity || !community.venueId) {
    return null;
  }
  const approved = await database.query.groupLinkRequests.findFirst({
    where: and(
      eq(groupLinkRequests.groupId, group.id),
      eq(groupLinkRequests.venueId, community.venueId),
      eq(groupLinkRequests.status, GroupLinkRequestStatusEnum.APPROVED),
    ),
    columns: { id: true },
  });
  return approved
    ? { venueId: community.venueId, communityArchivedAt: community.archivedAt }
    : null;
}

export async function mayUnlinkFromVenueCommunity(
  database: DbOrTx,
  group: Pick<typeof groups.$inferSelect, "id" | "communityId">,
) {
  const link = await venueCommunityLink(database, group);
  return link !== null && link.communityArchivedAt === null;
}

export async function unlinkGroupFromVenueCommunity(
  database: DbClient,
  args: { groupId: string; venueId?: string },
) {
  return database.transaction(async (tx) => {
    const [group] = await tx
      .select()
      .from(groups)
      .where(eq(groups.id, args.groupId))
      .for("update");
    if (!group) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Group not found" });
    }

    const link = await venueCommunityLink(tx, group);
    if (!link || (args.venueId && args.venueId !== link.venueId)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "This Group was not added to the Venue Community by request",
      });
    }
    refuseIfFrozen(consult({ archivedAt: link.communityArchivedAt }), "host", {
      frozenMessage: "Cannot unlink a Group while the Community is archived",
    });

    await tx
      .update(groups)
      .set({ communityId: null, updatedAt: new Date() })
      .where(eq(groups.id, group.id));

    return { ok: true as const, groupId: group.id, venueId: link.venueId };
  });
}
