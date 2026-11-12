import type { DbClient } from "@repo/db";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { groupMembers, groups } from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { loadGroupStandings } from "#src/standing/load-group-standing";
import type { Sport } from "@repo/domain/sport";
import { sportSchema } from "@repo/validators/sport";

export type MyGroupStandingRow = {
  groupId: string;
  name: string;
  imageUrl: string | null;
  /** The Season the record reads; `null` for all-time, a Group with no Season. */
  seasonId: string | null;
  seasonName: string | null;
  /** 1-based among ranked members; `null` while the caller is unranked. */
  position: number | null;
  memberCount: number;
  won: number;
  drawn: number;
  lost: number;
};

/**
 * "In your groups" on the Ratings area (design 1b): where the caller stands in
 * each of their Groups of one sport, read from the same Standing as Group home
 * (its default lens, the current Season) so the two cannot disagree. A padel
 * Group keeps only this Standing (ADR-0066).
 */
export async function myStandings(
  database: DbClient,
  args: { userId: string; sport: Sport; now?: Date },
): Promise<MyGroupStandingRow[]> {
  const now = args.now ?? new Date();
  const rows = await database
    .select({
      groupId: groups.id,
      name: groups.name,
      imageUrl: groups.imageUrl,
    })
    .from(groupMembers)
    .innerJoin(groups, eq(groups.id, groupMembers.groupId))
    .where(
      and(
        eq(groupMembers.userId, args.userId),
        eq(groups.sport, args.sport),
        isNull(groups.deletedAt),
      ),
    );

  const standingByGroup = await loadGroupStandings(
    database,
    rows.map((row) => row.groupId),
    now,
  );

  return rows
    .map((row) => {
      const standing = standingByGroup.get(row.groupId);
      const members = standing?.rows ?? [];
      const mine = members.find((member) => member.userId === args.userId);
      const season =
        standing?.seasons.find((item) => item.id === standing.seasonId) ?? null;
      return {
        groupId: row.groupId,
        name: row.name ?? "",
        imageUrl: row.imageUrl ?? null,
        seasonId: standing?.seasonId ?? null,
        seasonName: season?.name ?? null,
        position: mine?.ranked ? mine.position : null,
        memberCount: members.length,
        won: mine?.wins ?? 0,
        drawn: mine?.draws ?? 0,
        lost: mine?.losses ?? 0,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

export const myStandingsProcedure = protectedProcedure
  .input(z.object({ sport: sportSchema }))
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return myStandings(ctx.db, { userId: appUser.id, sport: input.sport });
  });
