import { and, eq, inArray } from "drizzle-orm";

import {
  gameTeamPlayers,
  groupMembers,
  groupTierEvents,
  groupTierPoints,
} from "@repo/db";

import { type db } from "#src/db";
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

type TierPointsRow = typeof groupTierPoints.$inferSelect;

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

/**
 * Tier points for a completed football Match on a Game that moves them
 * (ADR-0067): one `game` event per seated account holder and Unclaimed player,
 * the result part only until Performance ratings land, then a `band_change`
 * event for every member whose fish moved. Idempotent per User and Match.
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

  const player = (userId: string) => {
    const row = rowByUser.get(userId);
    return {
      userId,
      points: row?.points ?? TIER_POINTS_START,
      provisional: row
        ? tierIsProvisional({
            gamesCounted: row.gamesCounted,
            adjusted: adjusted(row),
          })
        : true,
    };
  };
  const deltas = tierMatchDeltas({
    slot1: slot1.map(player),
    slot2: slot2.map(player),
    result: args.result,
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
        expectedScore: delta.expectedScore,
        bandBefore: row.band,
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

async function sideUserIds(database: DbClient, gameTeamId: string) {
  const links = await database.query.gameTeamPlayers.findMany({
    where: eq(gameTeamPlayers.gameTeamId, gameTeamId),
    columns: {},
    with: {
      gamePlayer: {
        columns: { userId: true },
        with: { user: { columns: { id: true, deletedAt: true } } },
      },
    },
  });
  const ids = new Set<string>();
  for (const link of links) {
    const seat = link.gamePlayer.user;
    if (seat?.deletedAt === null) {
      ids.add(seat.id);
    }
  }
  return [...ids];
}

/**
 * Re-cuts the Group's places over its current members and writes a
 * `band_change` event wherever the stored fish differs. `rowByUser` holds the
 * Group's Tier points rows, locked by the caller.
 */
export async function rewriteTierBands(
  database: DbClient,
  args: {
    groupId: string;
    matchId: string | null;
    rowByUser: Map<string, TierPointsRow>;
    now: Date;
  },
): Promise<TierTable & { bandChanges: TierBandChange[] }> {
  const members = await database
    .select({ userId: groupMembers.userId, joinedAt: groupMembers.createdAt })
    .from(groupMembers)
    .where(eq(groupMembers.groupId, args.groupId));
  const standings = members.flatMap((member) => {
    const row = args.rowByUser.get(member.userId);
    return row
      ? [
          {
            userId: row.userId,
            points: row.points,
            gamesCounted: row.gamesCounted,
            adjusted: adjusted(row),
            joinedAt: member.joinedAt,
          },
        ]
      : [];
  });
  const table = tierTable(standings);

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
  return { ...table, bandChanges };
}
