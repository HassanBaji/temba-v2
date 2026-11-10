import { and, eq, isNull } from "drizzle-orm";

import { groups } from "@repo/db";

import { genericTembaOpenGraph } from "@repo/domain/game-invite-open-graph";
import { groupInviteOpenGraphMetadata } from "@repo/domain/group-invite-open-graph";
import { type Locale } from "@repo/i18n/locale";
import {
  findGroupInviteLinkByShortCode,
  previewLink,
  type InviteDb,
} from "#src/invites/doors";
import { isInviteLinkLive } from "#src/invites/invite-link-expiry";

function genericOpenGraph(locale: Locale) {
  return { ...genericTembaOpenGraph(locale), image: null };
}

export async function loadGroupInviteOpenGraph(
  database: InviteDb,
  rawCode: string,
  locale: Locale,
) {
  return groupInviteLinkOpenGraph(
    database,
    await findGroupInviteLinkByShortCode(database, rawCode),
    locale,
  );
}

export async function groupInviteLinkOpenGraph(
  database: InviteDb,
  link: { token: string; groupId: string; expiresAt: Date } | undefined,
  locale: Locale,
) {
  if (!link || !isInviteLinkLive(link.expiresAt)) {
    return genericOpenGraph(locale);
  }
  const previewed = await previewLink(database, "group", link.token);
  if (previewed.status !== "ready") {
    return genericOpenGraph(locale);
  }
  const group = await database.query.groups.findFirst({
    where: and(eq(groups.id, link.groupId), isNull(groups.deletedAt)),
    columns: { name: true, sport: true, imageUrl: true },
  });
  if (!group) {
    return genericOpenGraph(locale);
  }
  return {
    ...groupInviteOpenGraphMetadata({
      groupName: group.name,
      sport: group.sport,
      locale,
    }),
    image: group.imageUrl,
  };
}
