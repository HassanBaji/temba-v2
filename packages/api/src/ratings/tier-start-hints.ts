import { and, eq, inArray } from "drizzle-orm";

import { groupMembers, groupRatings, ratings } from "@repo/db";

import { displayedLevelFromMu } from "@repo/domain/level";
import { tierHintReference } from "@repo/domain/tier-bands";
import { tierHintFor, tierHintOvr } from "@repo/domain/tier-points";

import { type db } from "#src/db";
import {
  groupTierTable,
  type TierPointsRow,
} from "#src/ratings/group-tier-table";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Each User's start hint in a tier Group: where their
 * football Level, or a football Group Level an Organizer set earlier, puts
 * them against the Group's members. Null without a Level to read. Make teams
 * places a Provisional member by it and a Match counts a player with no
 * Tier points as it; nothing writes it without an Organizer.
 */
export async function tierStartHints(
  database: DbClient,
  args: {
    groupId: string;
    rowByUser: ReadonlyMap<string, TierPointsRow>;
    userIds: readonly string[];
  },
): Promise<(userId: string) => number | null> {
  const members = await database
    .select({ userId: groupMembers.userId, joinedAt: groupMembers.createdAt })
    .from(groupMembers)
    .where(eq(groupMembers.groupId, args.groupId));
  const table = groupTierTable(members, (userId) => args.rowByUser.get(userId));

  const userIds = [
    ...new Set([...args.userIds, ...members.map((member) => member.userId)]),
  ];
  const levelByUser = new Map<string, number>();
  const groupLevelByUser = new Map<string, number>();
  if (userIds.length > 0) {
    const levelRows = await database.query.ratings.findMany({
      where: and(
        inArray(ratings.userId, userIds),
        eq(ratings.sport, "football"),
      ),
      columns: { userId: true, mu: true },
    });
    for (const row of levelRows) {
      levelByUser.set(row.userId, Number(displayedLevelFromMu(row.mu)));
    }
    const groupLevelRows = await database.query.groupRatings.findMany({
      where: and(
        eq(groupRatings.groupId, args.groupId),
        inArray(groupRatings.userId, userIds),
      ),
      columns: { userId: true, mu: true },
    });
    for (const row of groupLevelRows) {
      groupLevelByUser.set(row.userId, Number(displayedLevelFromMu(row.mu)));
    }
  }
  const ovrOf = (userId: string) =>
    tierHintOvr({
      level: levelByUser.get(userId) ?? null,
      groupLevel: groupLevelByUser.get(userId) ?? null,
    });
  const reference = tierHintReference(
    table.rows.map((row) => ({
      points: row.points,
      provisional: row.provisional,
      ovr: ovrOf(row.userId),
    })),
  );
  return (userId) => tierHintFor(ovrOf(userId), reference);
}
