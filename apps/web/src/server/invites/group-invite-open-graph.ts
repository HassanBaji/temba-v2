import { eq } from "drizzle-orm";

import { groups } from "@repo/db";

import { GENERIC_TEMBA_OPEN_GRAPH } from "~/lib/game-invite-open-graph";
import { groupInviteOpenGraphMetadata } from "~/lib/group-invite-open-graph";
import {
  findGroupInviteLinkByShortCode,
  previewLink,
  type InviteDb,
} from "~/server/invites/doors";
import { isInviteLinkLive } from "~/server/invites/invite-link-expiry";

export async function loadGroupInviteOpenGraph(
  database: InviteDb,
  rawCode: string,
) {
  const link = await findGroupInviteLinkByShortCode(database, rawCode);
  if (!link || !isInviteLinkLive(link.expiresAt)) {
    return GENERIC_TEMBA_OPEN_GRAPH;
  }
  const previewed = await previewLink(database, "group", link.token);
  if (previewed.status !== "ready") {
    return GENERIC_TEMBA_OPEN_GRAPH;
  }
  const group = await database.query.groups.findFirst({
    where: eq(groups.id, link.groupId),
    columns: { name: true, sport: true },
  });
  if (!group) {
    return GENERIC_TEMBA_OPEN_GRAPH;
  }
  return groupInviteOpenGraphMetadata({
    groupName: group.name,
    sport: group.sport,
  });
}
