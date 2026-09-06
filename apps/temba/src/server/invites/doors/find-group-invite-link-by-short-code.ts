import { sql } from "drizzle-orm";

import { groupInviteLinks } from "@repo/db";

import { parseGameInviteShortCode } from "~/server/invites/tokens";
import type { InviteDb } from "~/server/invites/doors/utils";

export async function findGroupInviteLinkByShortCode(
  database: InviteDb,
  rawCode: string,
) {
  const code = parseGameInviteShortCode(rawCode);
  if (!code) {
    return undefined;
  }
  return database.query.groupInviteLinks.findFirst({
    where: sql`upper(${groupInviteLinks.shortCode}) = ${code}`,
  });
}
