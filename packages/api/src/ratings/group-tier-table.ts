import { eq } from "drizzle-orm";

import { groupMembers, groupTierPoints } from "@repo/db";

import { type db } from "#src/db";
import { tierTable, type TierStanding } from "@repo/domain/tier-bands";
import { TIER_POINTS_START } from "@repo/domain/tier-points";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export type TierPointsRow = typeof groupTierPoints.$inferSelect;

type TierMember = { userId: string; joinedAt: Date };

/**
 * A member as `tierTable` weighs them. One with no Tier points yet stands at
 * the start, Provisional.
 */
export function tierStanding(
  member: TierMember,
  row: TierPointsRow | undefined,
): TierStanding {
  return {
    userId: member.userId,
    points: row?.points ?? TIER_POINTS_START,
    gamesCounted: row?.gamesCounted ?? 0,
    adjusted: row?.confirmedAt != null,
    joinedAt: member.joinedAt,
  };
}

/** A tier Group's places and fish over `members` (ADR-0067). */
export function groupTierTable(
  members: readonly TierMember[],
  pointsOf: (userId: string) => TierPointsRow | undefined,
) {
  return tierTable(
    members.map((member) => tierStanding(member, pointsOf(member.userId))),
  );
}

/** A tier Group's table over its current members, as Members cuts it. */
export async function loadGroupTierTable(database: DbClient, groupId: string) {
  const members = await database
    .select({ userId: groupMembers.userId, joinedAt: groupMembers.createdAt })
    .from(groupMembers)
    .where(eq(groupMembers.groupId, groupId));
  const rows = await database
    .select()
    .from(groupTierPoints)
    .where(eq(groupTierPoints.groupId, groupId));
  const rowByUser = new Map(rows.map((row) => [row.userId, row]));
  return {
    members,
    rowByUser,
    table: groupTierTable(members, (userId) => rowByUser.get(userId)),
  };
}

/**
 * The Tier points a viewer is shown. A Provisional member's are shown only
 * to that member and the Group's Organizers (CONTEXT.md, Provisional).
 */
export function tierPointsShownTo(
  member: { userId: string; points: number; provisional: boolean },
  viewer: { userId: string; organizes: boolean },
): number | null {
  return !member.provisional ||
    viewer.organizes ||
    member.userId === viewer.userId
    ? member.points
    : null;
}
