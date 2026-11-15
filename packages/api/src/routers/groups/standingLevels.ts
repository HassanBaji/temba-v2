import { TRPCError } from "@trpc/server";
import { and, eq, gt, inArray } from "drizzle-orm";
import { z } from "zod";

import {
  groupMembers,
  groupSeasons,
  groupTierEvents,
  groupTierPoints,
  kingPlaceAwards,
  levelOverrides,
  ratingEvents,
  ratings,
} from "@repo/db";
import { wholeOvrFromMu } from "@repo/domain/football-ovr";
import { groupHasTier } from "@repo/domain/game-rating-scope";
import { groupSeasonWindow } from "@repo/domain/group-season";
import { bandFromLevel, levelFromMu } from "@repo/domain/level";
import type { LevelBand } from "@repo/domain/level-bands";
import {
  standingLadder,
  type StandingLevelData,
  type StandingLevelsData,
} from "@repo/domain/standing-views";
import { TIER_PROVISIONAL_GAMES } from "@repo/domain/tier-points";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { groupIsVerified } from "#src/groups/group-is-verified";
import { mayOrganizeGroupGames } from "#src/groups/helpers/may-organize-group-games";
import { requireGroup } from "#src/groups/helpers/require-group";

type DbClient = typeof db;

type LevelState = { mu: number; band: LevelBand };

type LevelChange = {
  userId: string;
  createdAt: Date;
  muBefore: number;
  levelBandBefore: LevelBand | null;
};

/** Padel in hundredths on the 1.0 to 7.0 face; football as whole OVR. */
function faceValue(mu: number, sport: string | null) {
  if (sport === "football") {
    return wholeOvrFromMu(mu);
  }
  return Math.round(Math.max(1, levelFromMu(mu)) * 100);
}

/**
 * What a member held at `at`: the state just before their first change after
 * it, else what they hold now. Every change records the state it replaced.
 */
function stateAt<T>(
  changes: readonly { createdAt: Date; before: T }[],
  now: T,
  at: Date,
): T {
  const next = changes.find((change) => change.createdAt > at);
  return next ? next.before : now;
}

/** Each member's Level moves after `since`, oldest first, from all three writers. */
async function levelChangesSince(
  database: DbClient,
  args: { userIds: string[]; sport: "padel" | "football"; since: Date },
): Promise<Map<string, LevelChange[]>> {
  const where = <
    T extends
      | typeof ratingEvents
      | typeof levelOverrides
      | typeof kingPlaceAwards,
  >(
    table: T,
  ) =>
    and(
      inArray(table.userId, args.userIds),
      eq(table.sport, args.sport),
      gt(table.createdAt, args.since),
    );
  const columns = {
    userId: true,
    createdAt: true,
    muBefore: true,
    levelBandBefore: true,
  } as const;
  const [events, overrides, awards] = await Promise.all([
    database.query.ratingEvents.findMany({
      where: where(ratingEvents),
      columns,
    }),
    database.query.levelOverrides.findMany({
      where: where(levelOverrides),
      columns,
    }),
    database.query.kingPlaceAwards.findMany({
      where: where(kingPlaceAwards),
      columns,
    }),
  ]);
  const byUser = new Map<string, LevelChange[]>();
  for (const change of [...events, ...overrides, ...awards].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  )) {
    const list = byUser.get(change.userId) ?? [];
    list.push(change);
    byUser.set(change.userId, list);
  }
  return byUser;
}

async function temba(
  database: DbClient,
  args: {
    userIds: string[];
    sport: "padel" | "football";
    window: { start: Date; end: Date } | null;
    placeAt: Date | null;
  },
): Promise<StandingLevelData[]> {
  const ratingRows = await database.query.ratings.findMany({
    where: and(
      eq(ratings.sport, args.sport),
      inArray(ratings.userId, args.userIds),
    ),
    columns: { userId: true, mu: true, levelBand: true },
  });
  const earliest = [args.window?.start, args.placeAt]
    .filter((at): at is Date => at != null)
    .sort((a, b) => a.getTime() - b.getTime())[0];
  const changes = earliest
    ? await levelChangesSince(database, {
        userIds: args.userIds,
        sport: args.sport,
        since: earliest,
      })
    : new Map<string, LevelChange[]>();

  return ratingRows.map((row) => {
    const now: LevelState = { mu: row.mu, band: row.levelBand };
    const history = (changes.get(row.userId) ?? []).map((change) => ({
      createdAt: change.createdAt,
      before: {
        mu: change.muBefore,
        band:
          change.levelBandBefore ?? bandFromLevel(levelFromMu(change.muBefore)),
      },
    }));
    const at = (instant: Date | null) =>
      instant ? stateAt(history, now, instant) : now;
    const placed = at(args.placeAt);
    const start = args.window ? at(args.window.start) : null;
    const end = args.window ? at(args.window.end) : null;
    return {
      userId: row.userId,
      band: args.sport === "football" ? null : placed.band,
      ovr: args.sport === "football" ? wholeOvrFromMu(placed.mu) : null,
      start: start ? faceValue(start.mu, args.sport) : null,
      end: end ? faceValue(end.mu, args.sport) : null,
      startBand: args.sport === "football" ? null : (start?.band ?? null),
      endBand: args.sport === "football" ? null : (end?.band ?? null),
    };
  });
}

async function tier(
  database: DbClient,
  args: {
    groupId: string;
    userIds: string[];
    window: { start: Date; end: Date } | null;
    /** Provisional points stay hidden from other members (as on Members). */
    seesProvisional: (userId: string) => boolean;
  },
): Promise<StandingLevelData[]> {
  const pointRows = await database.query.groupTierPoints.findMany({
    where: and(
      eq(groupTierPoints.groupId, args.groupId),
      inArray(groupTierPoints.userId, args.userIds),
    ),
    columns: {
      userId: true,
      points: true,
      gamesCounted: true,
      confirmedAt: true,
      createdAt: true,
    },
  });
  const window = args.window;
  const events = window
    ? await database.query.groupTierEvents.findMany({
        where: and(
          eq(groupTierEvents.groupId, args.groupId),
          inArray(groupTierEvents.userId, args.userIds),
          gt(groupTierEvents.createdAt, window.start),
        ),
        columns: { userId: true, createdAt: true, pointsBefore: true },
      })
    : [];

  return pointRows.map((row) => {
    const provisional =
      row.confirmedAt === null && row.gamesCounted < TIER_PROVISIONAL_GAMES;
    const hidden = provisional && !args.seesProvisional(row.userId);
    const base = {
      userId: row.userId,
      band: null,
      ovr: null,
      startBand: null,
      endBand: null,
    };
    if (!window || hidden) {
      return { ...base, start: null, end: null };
    }
    // Points are cleared when a member leaves; a ledger line from before the
    // current points row belongs to an earlier membership.
    const history = events
      .filter(
        (event) =>
          event.userId === row.userId && event.createdAt >= row.createdAt,
      )
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((event) => ({
        createdAt: event.createdAt,
        before: event.pointsBefore,
      }));
    return {
      ...base,
      start: stateAt(history, row.points, window.start),
      end: stateAt(history, row.points, window.end),
    };
  });
}

/**
 * The levels behind the Standing's By level and Most improved views (design
 * "Group standings" 1b–1e) for one lens: a Season by id, or all-time with
 * `seasonId: null`. A Verified Group reads the Temba Level: the level each
 * member is placed by (now, or at close for a closed Season) and, on a
 * Season, the level when it opened and now or at close. A tier Group reads
 * Tier points for the Season. A padel Group that is not Verified has neither.
 * Members only.
 */
export async function standingLevels(
  database: DbClient,
  args: {
    groupId: string;
    seasonId: string | null;
    userId: string;
    now?: Date;
    locale?: Locale;
  },
): Promise<StandingLevelsData> {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const group = await requireGroup(database, args.groupId, locale);
  const now = args.now ?? new Date();

  const memberRows = await database.query.groupMembers.findMany({
    where: eq(groupMembers.groupId, group.id),
    columns: { userId: true },
  });
  const userIds = memberRows.map((row) => row.userId);
  if (!userIds.includes(args.userId)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: messagesFor(locale).group.errors.standingMembersOnly,
    });
  }

  const season = args.seasonId
    ? await database.query.groupSeasons.findFirst({
        where: and(
          eq(groupSeasons.id, args.seasonId),
          eq(groupSeasons.groupId, group.id),
        ),
      })
    : null;
  if (args.seasonId && !season) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: messagesFor(locale).group.errors.seasonNotFound,
    });
  }

  const verified = groupIsVerified(group);
  const ladder = standingLadder({
    verified,
    hasTier: groupHasTier({ sport: group.sport, verified }),
  });
  if (ladder === null || group.sport === null) {
    return { ladder: null, sport: group.sport, members: [] };
  }

  const bounds = season ? groupSeasonWindow(season) : null;
  const window = bounds
    ? {
        start: bounds.start,
        end: bounds.endExclusive < now ? bounds.endExclusive : now,
      }
    : null;
  const closed = bounds !== null && bounds.endExclusive <= now;

  if (ladder === "tier") {
    const organizes = await mayOrganizeGroupGames(database, group, args.userId);
    return {
      ladder,
      sport: group.sport,
      members: await tier(database, {
        groupId: group.id,
        userIds,
        window,
        seesProvisional: (userId) => organizes || userId === args.userId,
      }),
    };
  }

  return {
    ladder,
    sport: group.sport,
    members: await temba(database, {
      userIds,
      sport: group.sport,
      window,
      placeAt: closed ? (window?.end ?? null) : null,
    }),
  };
}

export const standingLevelsProcedure = protectedProcedure
  .input(
    z.object({
      groupId: z.string().uuid(),
      seasonId: z.string().uuid().nullable(),
    }),
  )
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return standingLevels(ctx.db, {
      groupId: input.groupId,
      seasonId: input.seasonId,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
