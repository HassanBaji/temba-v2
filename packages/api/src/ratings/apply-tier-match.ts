import { and, eq, inArray } from "drizzle-orm";

import {
  gameTeamPlayers,
  groupMembers,
  groupTierEvents,
  groupTierPoints,
} from "@repo/db";

import { type db } from "#src/db";
import { notify } from "#src/notifications/notify";
import {
  tierStanding,
  type TierPointsRow,
} from "#src/ratings/group-tier-table";
import { tierStartHints } from "#src/ratings/tier-start-hints";
import {
  tierIsProvisional,
  tierTable,
  type TierBand,
  type TierTable,
} from "@repo/domain/tier-bands";
import {
  TIER_POINTS_START,
  tierMatchDeltas,
  type TierMatchResult,
} from "@repo/domain/tier-points";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export type TierBandChange = {
  userId: string;
  /** The `band_change` event written for it. */
  eventId: string;
  from: TierBand | null;
  to: TierBand | null;
};

function adjusted(row: TierPointsRow) {
  return row.confirmedAt !== null;
}

/** A rated player's settled Performance rating, ready for the tier step. */
export type TierPerformance = {
  /** Against their usual, centred on the Match, in −1 to 1. */
  score: number;
  ratingHundredths: number;
  usualHundredths: number;
};

/**
 * Tier points for a completed football Match on a Game that moves them
 * (ADR-0067): one `game` event per seated account holder and Unclaimed player,
 * then a `band_change` event for every member whose fish moved. A Match with
 * a Rating window passes the window's `weight` and each rated player's
 * `performance` (ADR-0068); everyone else moves on the result alone.
 * Idempotent per User and Match.
 */
export async function applyTierMatch(
  database: DbClient,
  args: {
    groupId: string;
    matchId: string;
    slot1GameTeamId: string;
    slot2GameTeamId: string;
    result: TierMatchResult;
    now: Date;
    weight?: number;
    performance?: ReadonlyMap<string, TierPerformance>;
  },
): Promise<void> {
  const slot1 = await sideUserIds(database, args.slot1GameTeamId);
  const slot2 = await sideUserIds(database, args.slot2GameTeamId);
  if (slot1.length === 0 || slot2.length === 0) {
    return;
  }
  const seated = [...slot1, ...slot2];

  const existing = await database.query.groupTierEvents.findMany({
    where: and(
      eq(groupTierEvents.matchId, args.matchId),
      eq(groupTierEvents.kind, "game"),
      inArray(groupTierEvents.userId, seated),
    ),
    columns: { userId: true },
  });
  const alreadyMoved = new Set(existing.map((row) => row.userId));
  if (seated.every((userId) => alreadyMoved.has(userId))) {
    return;
  }

  await database
    .insert(groupTierPoints)
    .values(
      [...seated].sort().map((userId) => ({
        groupId: args.groupId,
        userId,
        points: TIER_POINTS_START,
        createdAt: args.now,
        updatedAt: args.now,
      })),
    )
    .onConflictDoNothing({
      target: [groupTierPoints.groupId, groupTierPoints.userId],
    });

  // Every row of the Group, locked in user-id order: a Match's band change
  // can move anyone's fish, and an adjustment or a second Match on the same
  // Group must wait for this write.
  const rows = await database
    .select()
    .from(groupTierPoints)
    .where(eq(groupTierPoints.groupId, args.groupId))
    .orderBy(groupTierPoints.userId)
    .for("update");
  const rowByUser = new Map(rows.map((row) => [row.userId, row]));

  // A player whose Tier points have not started counts as their start hint
  // when the sides are weighed. The hint is never written: their row still
  // moves from 1,200.
  const notStarted = (userId: string) => {
    const row = rowByUser.get(userId);
    return !row || (row.gamesCounted === 0 && !adjusted(row));
  };
  const startHint = seated.some(notStarted)
    ? await tierStartHints(database, {
        groupId: args.groupId,
        rowByUser,
        userIds: seated,
      })
    : null;

  const player = (userId: string) => {
    const row = rowByUser.get(userId);
    return {
      userId,
      points:
        (notStarted(userId) ? startHint?.(userId) : null) ??
        row?.points ??
        TIER_POINTS_START,
      performance: args.performance?.get(userId)?.score ?? null,
      provisional: row
        ? tierIsProvisional({
            gamesCounted: row.gamesCounted,
            adjusted: adjusted(row),
          })
        : true,
    };
  };
  const placeBefore = new Map(
    (await groupTierTable(database, args.groupId, rowByUser)).table.rows.map(
      (entry) => [entry.userId, entry.place],
    ),
  );
  const deltas = tierMatchDeltas({
    slot1: slot1.map(player),
    slot2: slot2.map(player),
    result: args.result,
    weight: args.weight ?? 0,
  });

  const moved: string[] = [];
  for (const delta of deltas) {
    const row = rowByUser.get(delta.userId);
    if (!row || alreadyMoved.has(delta.userId)) {
      continue;
    }
    const pointsAfter = row.points + delta.delta;
    const [inserted] = await database
      .insert(groupTierEvents)
      .values({
        groupId: args.groupId,
        userId: delta.userId,
        kind: "game",
        matchId: args.matchId,
        resultDelta: delta.resultDelta,
        performanceDelta: delta.performanceDelta,
        delta: delta.delta,
        pointsBefore: row.points,
        pointsAfter,
        ratingHundredths:
          args.performance?.get(delta.userId)?.ratingHundredths ?? null,
        usualHundredths:
          args.performance?.get(delta.userId)?.usualHundredths ?? null,
        expectedScore: delta.expectedScore,
        bandBefore: row.band,
        placeBefore: placeBefore.get(delta.userId) ?? null,
        createdAt: args.now,
      })
      .onConflictDoNothing()
      .returning({ id: groupTierEvents.id });
    if (!inserted) {
      continue;
    }
    const [updated] = await database
      .update(groupTierPoints)
      .set({
        points: pointsAfter,
        gamesCounted: row.gamesCounted + 1,
        updatedAt: args.now,
      })
      .where(eq(groupTierPoints.id, row.id))
      .returning();
    if (updated) {
      rowByUser.set(updated.userId, updated);
    }
    moved.push(delta.userId);
  }

  if (moved.length === 0) {
    return;
  }
  const table = await rewriteTierBands(database, {
    groupId: args.groupId,
    matchId: args.matchId,
    rowByUser,
    now: args.now,
  });
  const placeByUser = new Map(table.rows.map((entry) => [entry.userId, entry]));
  for (const userId of moved) {
    const entry = placeByUser.get(userId);
    await database
      .update(groupTierEvents)
      .set({
        bandAfter: entry?.band ?? null,
        placeAfter: entry?.place ?? null,
        rankedCount: table.rankedCount,
        memberCount: table.memberCount,
      })
      .where(
        and(
          eq(groupTierEvents.userId, userId),
          eq(groupTierEvents.matchId, args.matchId),
          eq(groupTierEvents.kind, "game"),
        ),
      );
  }
}

/**
 * The players a side rates: never a Guest player, who has no Rating and no
 * Tier points and so plays at the average of the side (ADR-0079).
 */
export async function sideUserIds(database: DbClient, gameTeamId: string) {
  const links = await database.query.gameTeamPlayers.findMany({
    where: eq(gameTeamPlayers.gameTeamId, gameTeamId),
    columns: {},
    with: {
      gamePlayer: {
        columns: { userId: true },
        with: {
          user: { columns: { id: true, deletedAt: true, guestAt: true } },
        },
      },
    },
  });
  const ids = new Set<string>();
  for (const link of links) {
    const seat = link.gamePlayer.user;
    if (seat?.deletedAt === null && seat.guestAt === null) {
      ids.add(seat.id);
    }
  }
  return [...ids];
}

/** The Group's places over its current members who hold Tier points. */
async function groupTierTable(
  database: DbClient,
  groupId: string,
  rowByUser: ReadonlyMap<string, TierPointsRow>,
) {
  const members = await database
    .select({ userId: groupMembers.userId, joinedAt: groupMembers.createdAt })
    .from(groupMembers)
    .where(eq(groupMembers.groupId, groupId));
  return {
    table: tierTable(
      members.flatMap((member) => {
        const row = rowByUser.get(member.userId);
        return row ? [tierStanding(member, row)] : [];
      }),
    ),
    memberCount: members.length,
  };
}

/**
 * Re-cuts the Group's places over its current members and writes a
 * `band_change` event wherever the stored fish differs, then tells each
 * member whose fish moved. The one writer of `band_change` events, so a Game
 * settling, a reversal and a Tier adjustment all tell them the same way.
 * `rowByUser` holds the Group's Tier points rows, locked by the caller.
 */
export async function rewriteTierBands(
  database: DbClient,
  args: {
    groupId: string;
    matchId: string | null;
    rowByUser: Map<string, TierPointsRow>;
    now: Date;
    /** Who made the write, when a person did. */
    actorUserId?: string | null;
    /** Members this write already tells another way. */
    toldAnotherWay?: readonly string[];
  },
): Promise<TierTable & { memberCount: number; bandChanges: TierBandChange[] }> {
  const { table, memberCount } = await groupTierTable(
    database,
    args.groupId,
    args.rowByUser,
  );

  const bandChanges: TierBandChange[] = [];
  for (const entry of table.rows) {
    const row = args.rowByUser.get(entry.userId);
    if (!row || row.band === entry.band) {
      continue;
    }
    const [event] = await database
      .insert(groupTierEvents)
      .values({
        groupId: args.groupId,
        userId: entry.userId,
        kind: "band_change",
        matchId: args.matchId,
        pointsBefore: row.points,
        pointsAfter: row.points,
        bandBefore: row.band,
        bandAfter: entry.band,
        placeAfter: entry.place,
        rankedCount: table.rankedCount,
        memberCount,
        createdAt: args.now,
      })
      .returning({ id: groupTierEvents.id });
    if (event) {
      bandChanges.push({
        userId: entry.userId,
        eventId: event.id,
        from: row.band,
        to: entry.band,
      });
    }
    const [updated] = await database
      .update(groupTierPoints)
      .set({ band: entry.band, updatedAt: args.now })
      .where(eq(groupTierPoints.id, row.id))
      .returning();
    if (updated) {
      args.rowByUser.set(updated.userId, updated);
    }
  }
  await notifyTierBandChanges(database, {
    groupId: args.groupId,
    bandChanges,
    actorUserId: args.actorUserId ?? null,
    toldAnotherWay: args.toldAnotherWay ?? [],
  });
  return { ...table, memberCount, bandChanges };
}

/**
 * `tier_band_changed`, once per player per write: each member
 * whose fish moved hears where they are now. A member left with no fish has
 * nothing to read, and the row goes with its event if the write is reversed.
 */
async function notifyTierBandChanges(
  database: DbClient,
  args: {
    groupId: string;
    bandChanges: readonly TierBandChange[];
    actorUserId: string | null;
    toldAnotherWay: readonly string[];
  },
) {
  const latestByUser = new Map(
    args.bandChanges.map((change) => [change.userId, change]),
  );
  for (const change of latestByUser.values()) {
    if (change.to === null || args.toldAnotherWay.includes(change.userId)) {
      continue;
    }
    await notify(database, {
      type: "tier_band_changed",
      recipients: [{ userId: change.userId, audience: "player" }],
      excludeUserIds: [],
      actorUserId: args.actorUserId,
      groupId: args.groupId,
      groupTierEventId: change.eventId,
      dedupeKey: `tier_band_changed:${change.eventId}`,
    });
  }
}
