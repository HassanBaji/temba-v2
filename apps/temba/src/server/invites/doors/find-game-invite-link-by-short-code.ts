import { sql } from "drizzle-orm";

import { gameInviteLinks } from "@repo/db";

import { parseGameInviteShortCode } from "~/server/invites/tokens";
import type { InviteDb } from "~/server/invites/doors/utils";

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
