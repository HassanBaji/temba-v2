import { and, eq, gt, isNull, ne } from "drizzle-orm";

import { teamInviteLinks, teamMemberInvites } from "@repo/db";

import { type db } from "~/server/db";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function killTeamOpenSeatDoors(
  tx: Tx,
  teamId: string,
  exceptLookupInviteId?: string,
) {
  const now = new Date();
  await tx
    .update(teamMemberInvites)
    .set({
      revokedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(teamMemberInvites.teamId, teamId),
        isNull(teamMemberInvites.acceptedAt),
        isNull(teamMemberInvites.revokedAt),
        exceptLookupInviteId
          ? ne(teamMemberInvites.id, exceptLookupInviteId)
          : undefined,
      ),
    );

  await tx
    .update(teamInviteLinks)
    .set({
      expiresAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(teamInviteLinks.teamId, teamId),
        gt(teamInviteLinks.expiresAt, now),
      ),
    );
}
