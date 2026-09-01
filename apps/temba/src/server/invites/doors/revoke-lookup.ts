import { eq } from "drizzle-orm";

import {
  communityMemberInvites,
  gameMemberInvites,
  groupMemberInvites,
  teamMemberInvites,
} from "@repo/db";

import { loadLookupInvite } from "~/server/invites/doors/helpers/load-lookup-invite";
import { writeDb } from "~/server/invites/doors/helpers/write-db";
import { assertInviteOpen } from "~/server/invites/doors/consult";
import type {
  InviteDb,
  InviteHost,
  RevokeLookupResult,
} from "~/server/invites/doors/types";

export async function revokeLookup(
  database: InviteDb,
  host: InviteHost,
  inviteId: string,
): Promise<RevokeLookupResult> {
  const open = await assertInviteOpen(database, host, "mint");
  if (!open.ok) {
    return { ok: false, reason: "not_found" };
  }

  const invite = await loadLookupInvite(database, host, inviteId);
  if (!invite) {
    return { ok: false, reason: "not_found" };
  }
  if (invite.acceptedAt) {
    return { ok: false, reason: "already_accepted" };
  }
  if (invite.revokedAt) {
    return { ok: true };
  }

  if (host.kind === "community") {
    await writeDb(database)
      .update(communityMemberInvites)
      .set({ revokedAt: new Date(), updatedAt: new Date() })
      .where(eq(communityMemberInvites.id, inviteId));
  } else if (host.kind === "group") {
    await writeDb(database)
      .update(groupMemberInvites)
      .set({ revokedAt: new Date(), updatedAt: new Date() })
      .where(eq(groupMemberInvites.id, inviteId));
  } else if (host.kind === "team") {
    await writeDb(database)
      .update(teamMemberInvites)
      .set({ revokedAt: new Date(), updatedAt: new Date() })
      .where(eq(teamMemberInvites.id, inviteId));
  } else {
    await writeDb(database)
      .update(gameMemberInvites)
      .set({ revokedAt: new Date(), updatedAt: new Date() })
      .where(eq(gameMemberInvites.id, inviteId));
  }
  return { ok: true };
}
