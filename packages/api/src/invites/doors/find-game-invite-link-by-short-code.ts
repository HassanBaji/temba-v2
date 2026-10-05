import { sql } from "drizzle-orm";

import { gameInviteLinks } from "@repo/db";

import { parseGameInviteShortCode } from "#src/invites/tokens";
import type { InviteDb } from "#src/invites/doors/utils";

export async function findGameInviteLinkByShortCode(
  database: InviteDb,
  rawCode: string,
) {
  const code = parseGameInviteShortCode(rawCode);
  if (!code) {
    return undefined;
  }
  return database.query.gameInviteLinks.findFirst({
    where: sql`upper(${gameInviteLinks.shortCode}) = ${code}`,
  });
}
