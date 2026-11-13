import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  games,
  groupMembers,
  groups,
  notifications,
  ratingEvents,
  ratings,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";
import { ratingFlagsAtCreate } from "@repo/domain/game-rating-scope";
import { isProvisional } from "@repo/domain/level";

import { applyLevelOverride } from "#src/ratings/apply-level-override";
import { confirmMatchResult } from "#src/routers/games/confirmMatchResult";
import { register } from "#src/routers/games/register";
import { reportWrongScore } from "#src/routers/games/reportWrongScore";
import { loadRatingsMe } from "#src/routers/ratings/me";
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

type PadelClub = Awaited<ReturnType<typeof padelClub>>;

/**
 * Four padel players in a Club Group, so each Match counts at weight 1, and
 * a Group of theirs that is not Verified.
 */
async function padelClub(db: TestDatabase) {
  const first = await setUpMatch(db, { rated: true, groupRated: false });
  await db
    .update(groups)
    .set({ venueId: first.venueId })
    .where(eq(groups.id, first.groupId));
  // The fixture's own first Game is left unplayed.
  await db
    .update(games)
    .set({ cancelledAt: new Date() })
    .where(eq(games.id, first.gameId));
  const players = [first.a, first.b, first.c, first.d] as const;
  const [loose] = await db
    .insert(groups)
    .values({ name: "Loose", createdBy: first.a.id })
    .returning({ id: groups.id });
  await db
    .insert(groupMembers)
    .values(
      players.map((player) => ({ groupId: loose!.id, userId: player.id })),
    );
  return {
    players,
    groupId: first.groupId,
    venueId: first.venueId,
    looseGroupId: loose!.id,
  };
}

function nextPadelMatch(db: TestDatabase, f: PadelClub) {
  return setUpMatch(
    db,
    { rated: true, groupRated: false },
    { players: [...f.players], groupId: f.groupId, venueId: f.venueId },
  );
}

async function padelLevel(db: TestDatabase, userId: string) {
  return (await loadRatingsMe(apiDb(db), { userId, sport: "padel" })).rating;
}

async function gameOfEvent(db: TestDatabase, eventId: string) {
  const event = await db.query.ratingEvents.findFirst({
    where: eq(ratingEvents.id, eventId),
    with: { match: { columns: { gameId: true } } },
  });
  return event?.match.gameId;
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

  it("confirms a padel Level on its fifth Rated Match in a Verified Group, told once and marked in history", async () => {
    await withDb(async (db) => {
      const f = await padelClub(db);
      const gameIds: string[] = [];
      for (let played = 1; played <= 6; played++) {
        const m = await nextPadelMatch(db, f);
        await confirmAll(db, m);
        gameIds.push(m.gameId);
        const me = await padelLevel(db, f.players[0].id);
        expect(me?.provisional).toBe(played < 5);
        expect(me?.ratedMatchesRemaining).toBe(Math.max(0, 5 - played));
        expect(await confirmedNotifications(db, f.players[0].id)).toHaveLength(
          played < 5 ? 0 : 1,
        );
      }

      const [notification] = await confirmedNotifications(db, f.players[0].id);
      expect(notification).toMatchObject({
        gameId: gameIds[4],
        dedupeKey: "level_confirmed:padel",
      });
      expect(isProvisional(await phiOf(db, f.players[0].id, "padel"))).toBe(
        true,
      );
      const lines = await confirmedLines(db, f.players[0].id, "padel");
      expect(lines).toHaveLength(1);
      expect(lines[0]).toMatchObject({ sport: "padel", matchesCounted: 5 });
      expect(await gameOfEvent(db, lines[0]!.id)).toBe(gameIds[4]);
    });
  });

  it("does not count padel Matches in a Public Game or on a Group that is not Verified", async () => {
    await withDb(async (db) => {
      const f = await padelClub(db);
      const player = f.players[0].id;
      for (let played = 1; played <= 4; played++) {
        await confirmAll(db, await nextPadelMatch(db, f));
      }
      for (let played = 1; played <= 3; played++) {
        const publicMatch = await nextPadelMatch(db, f);
        await db
          .update(games)
          .set({ groupId: null, isPublic: true })
          .where(eq(games.id, publicMatch.gameId));
        // One player from each side confirms a Public Game (ADR-0071).
        for (const side of [publicMatch.b, publicMatch.c]) {
          await confirmMatchResult(apiDb(db), {
            gameId: publicMatch.gameId,
            matchId: publicMatch.matchId,
            userId: side.id,
          });
        }
      }
      const loose = await setUpMatch(
        db,
        // What a Game on a padel Group that is not Verified stores (ADR-0066).
        ratingFlagsAtCreate({
          hasGroup: true,
          groupVerified: false,
          sport: "padel",
          rated: true,
        }),
        {
          players: [...f.players],
          groupId: f.looseGroupId,
          venueId: f.venueId,
        },
      );
      await confirmAll(db, loose);

      const events = await db.query.ratingEvents.findMany({
        where: eq(ratingEvents.userId, player),
      });
      expect(events).toHaveLength(7);
      expect(await padelLevel(db, player)).toMatchObject({
        provisional: true,
        ratedMatchesRemaining: 1,
      });
      expect(await confirmedNotifications(db, player)).toHaveLength(0);
      expect(await confirmedLines(db, player, "padel")).toEqual([]);

      const fifth = await nextPadelMatch(db, f);
      await confirmAll(db, fifth);
      expect(await padelLevel(db, player)).toMatchObject({
        provisional: false,
        ratedMatchesRemaining: 0,
      });
      const [notification] = await confirmedNotifications(db, player);
      expect(notification?.gameId).toBe(fifth.gameId);
    });
  });

  it("does not count a reversed padel Match", async () => {
    await withDb(async (db) => {
      const f = await padelClub(db);
      const player = f.players[0].id;
      let last: Awaited<ReturnType<typeof nextPadelMatch>> | null = null;
      for (let played = 1; played <= 5; played++) {
        last = await nextPadelMatch(db, f);
        await confirmAll(db, last);
      }
      expect((await padelLevel(db, player))?.provisional).toBe(false);

      await reportWrongScore(apiDb(db), {
        gameId: last!.gameId,
        matchId: last!.matchId,
        userId: player,
      });
      expect(await padelLevel(db, player)).toMatchObject({
        provisional: true,
        ratedMatchesRemaining: 1,
      });
      expect(await confirmedLines(db, player, "padel")).toEqual([]);

      const again = await nextPadelMatch(db, f);
      await confirmAll(db, again);
      expect((await padelLevel(db, player))?.provisional).toBe(false);
      const lines = await confirmedLines(db, player, "padel");
      expect(lines).toHaveLength(1);
      expect(await gameOfEvent(db, lines[0]!.id)).toBe(again.gameId);
      expect(await confirmedNotifications(db, player)).toHaveLength(1);
    });
  });

  it("keeps a padel Level a Level override confirmed, with no milestone after it", async () => {
    await withDb(async (db) => {
      const f = await padelClub(db);
      const player = f.players[0].id;
      await confirmAll(db, await nextPadelMatch(db, f));
      await applyLevelOverride(apiDb(db), {
        sport: "padel",
        setterUserId: f.players[1].id,
        setByRole: "operator",
        targetUserId: player,
        groupId: null,
        level: 3.5,
        reason: "plays_above_results",
      });
      expect(await padelLevel(db, player)).toMatchObject({
        provisional: false,
        ratedMatchesRemaining: 0,
      });
      for (let played = 2; played <= 6; played++) {
        await confirmAll(db, await nextPadelMatch(db, f));
      }
      expect((await padelLevel(db, player))?.provisional).toBe(false);
      expect(await confirmedLines(db, player, "padel")).toEqual([]);
      expect(await confirmedNotifications(db, player)).toHaveLength(0);
    });
  });
});
