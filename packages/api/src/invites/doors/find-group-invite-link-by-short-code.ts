import { eq } from "drizzle-orm";

import { groupInviteLinks } from "@repo/db";

import { parseGameInviteShortCode } from "#src/invites/tokens";
import type { InviteDb } from "#src/invites/doors/utils";

/** Codes are minted upper-case, so the parsed code meets the unique index as is. */
export async function findGroupInviteLinkByShortCode(
  database: InviteDb,
  rawCode: string,
) {
  const code = parseGameInviteShortCode(rawCode);
  if (!code) {
    return undefined;
  }
  return database.query.groupInviteLinks.findFirst({
    where: eq(groupInviteLinks.shortCode, code),
  });
}
