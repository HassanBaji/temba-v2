import { and, desc, eq, inArray, or } from "drizzle-orm";

import { levelDisputes, levelOverrides } from "@repo/db";

import {
  LEVEL_DISPUTE_DAYS,
  type LevelDisputeState,
} from "@repo/domain/level-dispute";

import { type db } from "#src/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type LevelDisputeRefusal =
  | "not_yours"
  | "own_change"
  | "restored"
  | "superseded"
  | "too_late"
  | "already_disputed";

type OverrideRow = Pick<
  typeof levelOverrides.$inferSelect,
  "id" | "userId" | "sport" | "setByUserId" | "createdAt"
>;

function disputeWindowOpen(override: OverrideRow, now: Date) {
  return (
    now.getTime() - override.createdAt.getTime() <=
    LEVEL_DISPUTE_DAYS * MS_PER_DAY
  );
}

/** The User's newest Level override in a sport, or null without one. */
export async function latestOverrideId(
  database: DbClient,
  userId: string,
  sport: OverrideRow["sport"],
) {
  const [row] = await database
    .select({ id: levelOverrides.id })
    .from(levelOverrides)
    .where(
      and(eq(levelOverrides.userId, userId), eq(levelOverrides.sport, sport)),
    )
    .orderBy(desc(levelOverrides.createdAt), desc(levelOverrides.id))
    .limit(1);
  return row?.id ?? null;
}

async function latestOverrideIds(
  database: DbClient,
  userId: string,
  sports: readonly OverrideRow["sport"][],
) {
  const latest = new Map<OverrideRow["sport"], string | null>();
  for (const sport of new Set(sports)) {
    latest.set(sport, await latestOverrideId(database, userId, sport));
  }
  return latest;
}

/**
 * Why a User may not dispute a Level override, or null when they may: it
 * must be their own, set by someone else, their newest in its sport, at most
 * `LEVEL_DISPUTE_DAYS` old, not the override an upheld dispute wrote, and not
 * disputed before.
 */
export async function levelDisputeRefusal(
  database: DbClient,
  args: { override: OverrideRow; userId: string; now: Date },
): Promise<LevelDisputeRefusal | null> {
  const { override, userId, now } = args;
  if (override.userId !== userId) {
    return "not_yours";
  }
  if (override.setByUserId === userId) {
    return "own_change";
  }
  const related = await database
    .select({
      levelOverrideId: levelDisputes.levelOverrideId,
      restoredOverrideId: levelDisputes.restoredOverrideId,
    })
    .from(levelDisputes)
    .where(
      or(
        eq(levelDisputes.levelOverrideId, override.id),
        eq(levelDisputes.restoredOverrideId, override.id),
      ),
    );
  if (related.some((row) => row.restoredOverrideId === override.id)) {
    return "restored";
  }
  if (
    (await latestOverrideId(database, userId, override.sport)) !== override.id
  ) {
    return "superseded";
  }
  if (!disputeWindowOpen(override, now)) {
    return "too_late";
  }
  if (related.some((row) => row.levelOverrideId === override.id)) {
    return "already_disputed";
  }
  return null;
}

/**
 * Where each of the User's own Level overrides stands for them, for Rating
 * history: the status of the dispute raised on it, `available` while they
 * may still raise one, or null. Also which of them an upheld dispute wrote.
 */
export async function levelDisputeStates(
  database: DbClient,
  args: { userId: string; overrides: readonly OverrideRow[]; now: Date },
) {
  const states = new Map<string, LevelDisputeState>();
  const restored = new Set<string>();
  if (args.overrides.length === 0) {
    return { stateOf: () => null as LevelDisputeState, restored };
  }
  const ids = args.overrides.map((override) => override.id);
  const [disputes, latest] = await Promise.all([
    database
      .select({
        levelOverrideId: levelDisputes.levelOverrideId,
        restoredOverrideId: levelDisputes.restoredOverrideId,
        status: levelDisputes.status,
      })
      .from(levelDisputes)
      .where(
        or(
          inArray(levelDisputes.levelOverrideId, ids),
          inArray(levelDisputes.restoredOverrideId, ids),
        ),
      ),
    latestOverrideIds(
      database,
      args.userId,
      args.overrides.map((override) => override.sport),
    ),
  ]);
  for (const dispute of disputes) {
    states.set(dispute.levelOverrideId, dispute.status);
    if (dispute.restoredOverrideId) {
      restored.add(dispute.restoredOverrideId);
    }
  }
  for (const override of args.overrides) {
    if (
      !states.has(override.id) &&
      !restored.has(override.id) &&
      override.userId === args.userId &&
      override.setByUserId !== args.userId &&
      latest.get(override.sport) === override.id &&
      disputeWindowOpen(override, args.now)
    ) {
      states.set(override.id, "available");
    }
  }
  return {
    stateOf: (overrideId: string) => states.get(overrideId) ?? null,
    restored,
  };
}
