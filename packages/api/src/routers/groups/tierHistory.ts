import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { groupTierEvents, user } from "@repo/db";
import { groupHasTier } from "@repo/domain/game-rating-scope";
import type {
  TierHistoryData,
  TierHistoryStandingData,
} from "@repo/domain/rating-history";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { isGroupMember } from "#src/games/access";
import { groupIsVerified } from "#src/groups/group-is-verified";
import { mayOrganizeGroupGames } from "#src/groups/helpers/may-organize-group-games";
import { requireGroup } from "#src/groups/helpers/require-group";
import { loadGroupTierTable } from "#src/ratings/group-tier-table";
import { tierHistoryEntries } from "#src/ratings/rating-history-entries";
import { olderThanShown, shownAt, shownAtIso } from "#src/ratings/shown-at";

type DbClient = typeof db;

const DEFAULT_PAGE_SIZE = 20;

/**
 * Where a page ended: the last row's time, cut to the millisecond, and its
 * id. The shape a released client already sends.
 */
export type TierHistoryCursor = { createdAt: Date; id: string };

/**
 * Points and history (screen 2e): what moved one member's Tier points in a
 * Group, newest first, Tier adjustments with who and why included (ADR-0073).
 * Only that member and the Group's Organizers may read it. The events outlive
 * the points row, so a member who left and came back still sees them.
 */
export async function tierHistory(
  database: DbClient,
  args: {
    groupId: string;
    viewerUserId: string;
    /** Defaults to the viewer. */
    userId?: string;
    cursor?: TierHistoryCursor;
    limit?: number;
    locale?: Locale;
  },
): Promise<
  TierHistoryData & {
    group: { id: string; name: string | null };
    viewerUserId: string;
    nextCursor: TierHistoryCursor | null;
  }
> {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const m = messagesFor(locale);
  const group = await requireGroup(database, args.groupId, locale);
  const userId = args.userId ?? args.viewerUserId;
  const isViewer = userId === args.viewerUserId;
  const allowed = isViewer
    ? await isGroupMember(database, group.id, userId)
    : await mayOrganizeGroupGames(database, group, args.viewerUserId);
  if (!allowed) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: m.rating.history.errors.forbidden,
    });
  }

  const member = await database.query.user.findFirst({
    where: eq(user.id, userId),
    columns: { id: true, name: true, image: true },
  });
  if (!member) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: m.rating.adjust.errors.notMember,
    });
  }

  const limit = args.limit ?? DEFAULT_PAGE_SIZE;
  const { cursor } = args;
  const rows = await database
    .select({
      event: groupTierEvents,
      shownAt: shownAtIso(groupTierEvents.createdAt),
    })
    .from(groupTierEvents)
    .where(
      and(
        eq(groupTierEvents.groupId, group.id),
        eq(groupTierEvents.userId, userId),
        inArray(groupTierEvents.kind, ["game", "adjustment"]),
        olderThanShown(groupTierEvents, cursor),
      ),
    )
    .orderBy(desc(shownAt(groupTierEvents.createdAt)), desc(groupTierEvents.id))
    .limit(limit + 1);
  if (
    !isViewer &&
    !cursor &&
    rows.length === 0 &&
    !(await isGroupMember(database, group.id, userId))
  ) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: m.rating.adjust.errors.notMember,
    });
  }
  const page = rows.slice(0, limit);
  const last = page.at(-1);

  const hasTier = groupHasTier({
    sport: group.sport,
    verified: groupIsVerified(group),
  });

  return {
    group: { id: group.id, name: group.name },
    viewerUserId: args.viewerUserId,
    member: {
      userId: member.id,
      name: member.name,
      image: member.image,
      isViewer,
    },
    tier: hasTier ? await memberStanding(database, group.id, userId) : null,
    entries: await tierHistoryEntries(
      database,
      userId,
      page.map((row) => row.event),
    ),
    nextCursor:
      rows.length > limit && last
        ? { createdAt: new Date(last.shownAt), id: last.event.id }
        : null,
  };
}

/** The member's place among the Group's current members, as Members cuts it. */
async function memberStanding(
  database: DbClient,
  groupId: string,
  userId: string,
): Promise<TierHistoryStandingData | null> {
  const { table } = await loadGroupTierTable(database, groupId);
  const self = table.rows.find((row) => row.userId === userId);
  if (!self) {
    return null;
  }
  return {
    band: self.band,
    place: self.place,
    rankedCount: table.rankedCount,
    points: self.points,
    provisional: self.provisional,
    gamesOfFive: self.gamesOfFive,
    gamesCounted: self.gamesCounted,
    nextBand: self.nextBand,
    pointsToNextBand: self.pointsToNextBand,
  };
}

export const tierHistoryProcedure = protectedProcedure
  .input(
    z.object({
      groupId: z.string().uuid(),
      userId: z.string().uuid().optional(),
      cursor: z
        .object({ createdAt: z.date(), id: z.string().uuid() })
        .optional(),
      limit: z.number().int().min(1).max(50).optional(),
    }),
  )
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return tierHistory(ctx.db, {
      groupId: input.groupId,
      viewerUserId: appUser.id,
      userId: input.userId,
      cursor: input.cursor,
      limit: input.limit,
      locale: ctx.locale,
    });
  });
