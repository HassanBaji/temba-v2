import type { DbClient } from "@repo/db";
import { and, eq, inArray, isNull } from "drizzle-orm";

import {
  GroupSportEnum,
  groupMembers,
  groupTierPoints,
  groups,
} from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { groupIsVerified } from "#src/groups/group-is-verified";
import { groupHasTier } from "@repo/domain/game-rating-scope";
import { tierTable, type TierBand } from "@repo/domain/tier-bands";
import { TIER_POINTS_START } from "@repo/domain/tier-points";

export type MyGroupTierRow = {
  groupId: string;
  name: string;
  imageUrl: string | null;
  /** The Group's current members, Provisional ones included. */
  memberCount: number;
  rankedCount: number;
  /** Null while Provisional or while too few members are ranked for fish. */
  band: TierBand | null;
  /** 1-based among ranked members; null while Provisional. */
  place: number | null;
  points: number;
  provisional: boolean;
  /** Tier Games counted towards leaving Provisional, at most five. */
  gamesOfFive: number;
};

/**
 * "Group tier" on the Ratings screen (design 1a): the caller's Group Tier in
 * each of their tier Groups, cut as Members cuts it (ADR-0067). A member with
 * no Tier points yet is Provisional at the start. The caller always sees
 * their own points.
 */
export async function myGroupTiers(
  database: DbClient,
  args: { userId: string },
): Promise<MyGroupTierRow[]> {
  const candidates = await database
    .select({
      groupId: groups.id,
      name: groups.name,
      imageUrl: groups.imageUrl,
      sport: groups.sport,
      verifiedAt: groups.verifiedAt,
      venueId: groups.venueId,
    })
    .from(groupMembers)
    .innerJoin(groups, eq(groups.id, groupMembers.groupId))
    .where(
      and(
        eq(groupMembers.userId, args.userId),
        eq(groups.sport, GroupSportEnum.FOOTBALL),
        isNull(groups.deletedAt),
      ),
    );
  const tierGroups = candidates.filter((group) =>
    groupHasTier({ sport: group.sport, verified: groupIsVerified(group) }),
  );
  if (tierGroups.length === 0) {
    return [];
  }

  const groupIds = tierGroups.map((group) => group.groupId);
  const [members, points] = await Promise.all([
    database
      .select({
        groupId: groupMembers.groupId,
        userId: groupMembers.userId,
        joinedAt: groupMembers.createdAt,
      })
      .from(groupMembers)
      .where(inArray(groupMembers.groupId, groupIds)),
    database
      .select()
      .from(groupTierPoints)
      .where(inArray(groupTierPoints.groupId, groupIds)),
  ]);
  const pointsByKey = new Map(
    points.map((row) => [`${row.groupId}:${row.userId}`, row]),
  );

  return tierGroups
    .flatMap((group): MyGroupTierRow[] => {
      const groupMembersHere = members.filter(
        (member) => member.groupId === group.groupId,
      );
      const table = tierTable(
        groupMembersHere.map((member) => {
          const row = pointsByKey.get(`${group.groupId}:${member.userId}`);
          return {
            userId: member.userId,
            points: row?.points ?? TIER_POINTS_START,
            gamesCounted: row?.gamesCounted ?? 0,
            adjusted: row?.confirmedAt != null,
            joinedAt: member.joinedAt,
          };
        }),
      );
      const self = table.rows.find((row) => row.userId === args.userId);
      if (!self) {
        return [];
      }
      return [
        {
          groupId: group.groupId,
          name: group.name ?? "",
          imageUrl: group.imageUrl ?? null,
          memberCount: groupMembersHere.length,
          rankedCount: table.rankedCount,
          band: self.band,
          place: self.place,
          points: self.points,
          provisional: self.provisional,
          gamesOfFive: self.gamesOfFive,
        },
      ];
    })
    .sort(
      (left, right) =>
        Number(left.provisional) - Number(right.provisional) ||
        left.name.localeCompare(right.name),
    );
}

export const myGroupTiersProcedure = protectedProcedure.query(
  async ({ ctx }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return myGroupTiers(ctx.db, { userId: appUser.id });
  },
);
