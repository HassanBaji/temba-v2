import { sql } from "drizzle-orm";

import { groupInviteLinks } from "@repo/db";

import { parseGameInviteShortCode } from "#src/invites/tokens";
import type { InviteDb } from "#src/invites/doors/utils";

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
