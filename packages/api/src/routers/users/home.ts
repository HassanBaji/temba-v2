import type { DbClient } from "@repo/db";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { eq } from "drizzle-orm";

import { communityMembers, groupMembers, type GroupSportEnum } from "@repo/db";

import { pendingLookupInvites as pendingCommunityInvites } from "#src/routers/communities/pendingLookupInvites";
import { pendingLookupInvites as pendingGroupInvites } from "#src/routers/groups/pendingLookupInvites";
import { pendingInvites as pendingTeamInvites } from "#src/routers/teams/pendingInvites";
import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { listHomeCarouselGames } from "#src/home/carousel-games";
import { summarizeCompletedMatchStats } from "@repo/domain/completed-matches";
import { loadCompletedMatchesForUser } from "#src/stats/completed-matches";
import { seasonStandingPosition } from "@repo/domain/season-standing";
import { loadGroupStandings } from "#src/standing/load-group-standing";

/**
 * Home metrics, carousel Games, and per-Group standing for the signed-in User.
 * Stats (Played / Won / Lost) are completed Matches the User sat on, including
 * zeros when they have not played. Drawn Matches count as played only. The
 * Home carousel is a dedicated live-Game list (Game admit or Organizer), not
 * the My Games hub filter. Soft-archived Club Group Games still appear when
 * live if the viewer qualifies. Standing position is among that Group's
 * members only — not a global rank, and not a heading on the Level surface.
 */
export async function loadHome(
  database: DbClient,
  args: { userId: string; locale?: Locale },
) {
  const now = new Date();

  const [communityMemberships, communityInvites, groupInvites, teamInvites] =
    await Promise.all([
      database.query.communityMembers.findMany({
        where: eq(communityMembers.userId, args.userId),
        columns: { id: true },
      }),
      pendingCommunityInvites(database, { userId: args.userId }),
      pendingGroupInvites(database, { userId: args.userId }),
      pendingTeamInvites(database, { userId: args.userId }),
    ]);

  const pendingInviteCount =
    communityInvites.length + groupInvites.length + teamInvites.length;

  const myGroupMemberships = (
    await database.query.groupMembers.findMany({
      where: eq(groupMembers.userId, args.userId),
      with: {
        group: true,
      },
    })
  ).filter((membership) => membership.group.deletedAt === null);

  const groupIds = myGroupMemberships.map((row) => row.groupId);

  const standingByGroup = await loadGroupStandings(database, groupIds, now);

  const standing = myGroupMemberships
    .map((membership) => {
      const groupStanding = standingByGroup.get(membership.groupId);
      const rows = groupStanding?.rows ?? [];

      return {
        groupId: membership.group.id,
        groupName: membership.group.name,
        sport: membership.group.sport as GroupSportEnum | null,
        position: seasonStandingPosition(rows, args.userId),
        memberCount: rows.length,
      };
    })
    .sort((a, b) =>
      (a.groupName ?? "").localeCompare(b.groupName ?? "", undefined, {
        sensitivity: "base",
      }),
    );

  const carouselGames = await listHomeCarouselGames(
    database,
    args.userId,
    now,
    args.locale ?? DEFAULT_LOCALE,
  );
  const stats = summarizeCompletedMatchStats(
    await loadCompletedMatchesForUser(database, args.userId),
  );

  return {
    gamesPlayed: stats.gamesPlayed,
    gamesWon: stats.gamesWon,
    gamesLost: stats.gamesLost,
    setsWon: stats.setsWon,
    pendingInviteCount,
    communitiesCount: communityMemberships.length,
    groupsCount: myGroupMemberships.length,
    carouselGames,
    standing,
  };
}

export const home = protectedProcedure.query(async ({ ctx }) => {
  const appUser = await resolveAppUser(ctx.userId);
  return loadHome(ctx.db, { userId: appUser.id, locale: ctx.locale });
});
