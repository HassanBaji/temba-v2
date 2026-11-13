import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { groups, notifications, ratingEvents, ratings } from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";
import { isProvisional } from "@repo/domain/level";

import { confirmMatchResult } from "#src/routers/games/confirmMatchResult";
import { register } from "#src/routers/games/register";
import { ratingHistory } from "#src/routers/ratings/history";
import {
  addMember,
  footballGame,
  nextFootballGame,
  playAndSettle,
  setUpMatch,
  type FootballFixture,
} from "#src/ratings/group-rated-match.test-support";

type ApiDb = Parameters<typeof ratingHistory>[0];

function apiDb(database: TestDatabase) {
  return database as unknown as ApiDb;
}

async function withDb(run: (database: TestDatabase) => Promise<void>) {
  const { db, close } = await createPgliteDb();
  try {
    await run(db);
  } finally {
    await close();
  }
}

async function confirmedNotifications(db: TestDatabase, userId: string) {
  return db.query.notifications.findMany({
    where: and(
      eq(notifications.recipientUserId, userId),
      eq(notifications.type, "level_confirmed"),
    ),
  });
}

async function confirmedLines(
  db: TestDatabase,
  userId: string,
  sport: "padel" | "football",
) {
  const history = await ratingHistory(apiDb(db), {
    userId,
    sport,
    ladder: "level",
    limit: 50,
  });
  return history.entries.filter((entry) => entry.kind === "level_confirmed");
}

async function phiOf(
  db: TestDatabase,
  userId: string,
  sport: "padel" | "football",
) {
  const row = await db.query.ratings.findFirst({
    where: and(eq(ratings.userId, userId), eq(ratings.sport, sport)),
  });
  return row!.phi;
}

/** A Verified football Group on a Venue, so its Games count at weight 1. */
async function clubFootballGame(db: TestDatabase) {
  const f = await footballGame(db, { verified: true });
  await db
    .update(groups)
    .set({ venueId: f.venueId })
    .where(eq(groups.id, f.groupId));
  return f;
}

/** Every other seated player confirms the Score, which completes the Match. */
async function confirmAll(
  db: TestDatabase,
  m: Awaited<ReturnType<typeof setUpMatch>>,
) {
  for (const player of [m.b, m.c, m.d]) {
    await confirmMatchResult(apiDb(db), {
      gameId: m.gameId,
      matchId: m.matchId,
      userId: player.id,
    });
  }
}

async function seat(f: FootballFixture, userIds: string[]) {
  for (const userId of userIds) {
    await register(apiDb(f.db), { gameId: f.gameId, userId });
  }
}

describe("Level confirmed", () => {
  it("tells a football player once, on their fifth counting Match, which their history marks", async () => {
    await withDb(async (db) => {
      let f = await clubFootballGame(db);
      const a = await addMember(f, "a");
      const b = await addMember(f, "b");
      const gameIds: string[] = [];
      for (let played = 1; played <= 7; played++) {
        if (played > 1) {
          f = await nextFootballGame(f, played * 3);
          await seat(f, [a, b]);
        }
        gameIds.push(f.gameId);
        await playAndSettle(f, [a], [b], { slot1: 1, slot2: 0 });
        expect(await confirmedNotifications(db, a)).toHaveLength(
          played < 5 ? 0 : 1,
        );
        expect(isProvisional(await phiOf(db, a, "football"))).toBe(played < 5);
      }

      const [notification] = await confirmedNotifications(db, a);
      expect(notification).toMatchObject({
        audience: "player",
        gameId: gameIds[4],
        dedupeKey: "level_confirmed:football",
      });
      expect(await confirmedNotifications(db, b)).toHaveLength(1);

      const lines = await confirmedLines(db, a, "football");
      expect(lines).toHaveLength(1);
      const fifth = await db.query.ratingEvents.findFirst({
        where: and(
          eq(ratingEvents.userId, a),
          eq(ratingEvents.id, lines[0]!.id),
        ),
        with: { match: { columns: { gameId: true } } },
      });
      expect(fifth?.match.gameId).toBe(gameIds[4]);
      expect(lines[0]).toMatchObject({ sport: "football", matchesCounted: 5 });
      expect(await confirmedLines(db, a, "padel")).toEqual([]);
    });
  });

  it("tells a padel player once, on the Match that takes their Level out of Provisional", async () => {
    await withDb(async (db) => {
      const first = await setUpMatch(db, { rated: true, groupRated: false });
      // A Club Group, so each Match counts at weight 1.
      await db
        .update(groups)
        .set({ venueId: first.venueId })
        .where(eq(groups.id, first.groupId));
      await confirmAll(db, first);
      const players = [first.a, first.b, first.c, first.d] as const;
      let confirmedOn: string | null = null;
      for (let played = 2; played <= 16; played++) {
        const next = await setUpMatch(
          db,
          { rated: true, groupRated: false },
          {
            players: [...players],
            groupId: first.groupId,
            venueId: first.venueId,
          },
        );
        await confirmAll(db, next);
        if (
          confirmedOn == null &&
          !isProvisional(await phiOf(db, first.a.id, "padel"))
        ) {
          confirmedOn = next.gameId;
        }
      }
      expect(confirmedOn).not.toBeNull();

      const sent = await confirmedNotifications(db, first.a.id);
      expect(sent).toHaveLength(1);
      expect(sent[0]?.gameId).toBe(confirmedOn);
      expect(await confirmedLines(db, first.a.id, "padel")).toHaveLength(1);
    });
  });
});
