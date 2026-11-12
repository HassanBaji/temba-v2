import { eq, inArray } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  gameTeamPlayers,
  games,
  groupRatingEvents,
  groupMembers,
  groups,
  matches,
  ratingEvents,
  ratings,
  user,
  venues,
} from "@repo/db/schema";

import { createFriendlyGame } from "#src/games/create-friendly";
import { addGuestPlayer } from "#src/routers/games/addGuestPlayer";
import { completeMatch } from "#src/routers/games/completeMatch";
import { registerSeat } from "#src/routers/games/registerSeat";
import { scoreSet } from "#src/routers/games/scoreSet";
import { guestStandInState } from "@repo/domain/guest-player";
import { muFromLevel, type RatingGlickoState } from "@repo/domain/level";
import { rateDoublesMatch } from "@repo/domain/rate-doubles-match";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

const HOUR = 60 * 60 * 1000;

async function insertUser(database: TestDatabase, label: string) {
  const [row] = await database
    .insert(user)
    .values({
      name: label,
      email: `${label}-${crypto.randomUUID()}@example.com`,
      clerkId: `user_${crypto.randomUUID()}`,
    })
    .returning();
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row;
}

async function seedRating(
  database: TestDatabase,
  userId: string,
  level: number,
): Promise<RatingGlickoState> {
  const state = {
    mu: muFromLevel(level),
    phi: 120,
    sigma: 0.06,
    levelBand: "C2" as const,
  };
  await database
    .insert(ratings)
    .values({ userId, sport: "padel", ...state, lastRatedAt: new Date() });
  return state;
}

/** Khalid and the organizer against Ahmed and a Guest player, 6-2. */
async function setUpGuestMatch(
  database: TestDatabase,
  options: { groupRated?: boolean } = {},
) {
  const [organizer, khalid, ahmed] = await Promise.all(
    ["organizer", "khalid", "ahmed"].map((label) =>
      insertUser(database, label),
    ),
  );
  const [venue] = await database
    .insert(venues)
    .values({ name: "Ace Padel", city: "Manama", country: "BH" })
    .returning();
  const [group] = await database
    .insert(groups)
    .values({ name: "Tuesday Night Padel", createdBy: organizer!.id })
    .returning();
  await database.insert(groupMembers).values(
    [organizer!, khalid!, ahmed!].map((member) => ({
      groupId: group!.id,
      userId: member.id,
    })),
  );
  const windowStart = new Date(Date.now() + 2 * HOUR);
  const created = await createFriendlyGame(database, {
    createdBy: organizer!.id,
    groupId: group!.id,
    venueId: venue!.id,
    windowStart,
    windowEnd: new Date(windowStart.getTime() + HOUR),
  });
  const gameId = created.game.id;
  await database
    .update(games)
    .set({ rated: true, groupRated: options.groupRated ?? false })
    .where(eq(games.id, gameId));

  const states = {
    organizer: await seedRating(database, organizer!.id, 3.1),
    khalid: await seedRating(database, khalid!.id, 3.3),
    ahmed: await seedRating(database, ahmed!.id, 3.0),
  };

  const seat = (
    userId: string,
    sideIndex: number,
    position: "left" | "right",
  ) => registerSeat(database, { gameId, userId, sideIndex, position });
  await seat(organizer!.id, 1, "right");
  await seat(khalid!.id, 1, "left");
  await seat(ahmed!.id, 2, "right");
  const guest = await addGuestPlayer(database, {
    gameId,
    organizerUserId: organizer!.id,
    name: "Fahad",
    seat: { sideIndex: 2, position: "left" },
  });

  const set = await database.query.matchSets.findFirst({
    where: (table, { eq: equals }) => equals(table.matchId, created.matchId),
  });
  await database
    .update(games)
    .set({
      windowStart: new Date(Date.now() - 2 * HOUR),
      windowEnd: new Date(Date.now() - HOUR),
    })
    .where(eq(games.id, gameId));
  await scoreSet(database, {
    gameId,
    matchId: created.matchId,
    setId: set!.id,
    userId: organizer!.id,
    slot1GamesWon: 6,
    slot2GamesWon: 2,
  });

  return {
    gameId,
    matchId: created.matchId,
    organizer: organizer!,
    khalid: khalid!,
    ahmed: ahmed!,
    guestId: guest.userId,
    states,
  };
}

describe("a Rated Match with a Guest player", () => {
  it("rates the players with an account as if the guest were their mean Level", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await setUpGuestMatch(db);
      const match = await db.query.matches.findFirst({
        where: eq(matches.id, f.matchId),
      });
      const links = await db.query.gameTeamPlayers.findMany({
        where: inArray(gameTeamPlayers.gameTeamId, [
          match!.slot1GameTeamId!,
          match!.slot2GameTeamId!,
        ]),
        with: { gamePlayer: { columns: { userId: true } } },
      });
      expect(links.map((link) => link.gamePlayer.userId)).toContain(f.guestId);

      await completeMatch(db, {
        gameId: f.gameId,
        matchId: f.matchId,
        userId: f.organizer.id,
      });

      const events = await db.query.ratingEvents.findMany({
        where: eq(ratingEvents.matchId, f.matchId),
      });
      expect(events.map((event) => event.userId).sort()).toEqual(
        [f.organizer.id, f.khalid.id, f.ahmed.id].sort(),
      );
      expect(
        await db.query.ratings.findMany({
          where: eq(ratings.userId, f.guestId),
        }),
      ).toHaveLength(0);

      const standIn = guestStandInState([
        f.states.organizer,
        f.states.khalid,
        f.states.ahmed,
      ])!;
      expect(standIn.mu).toBeCloseTo(
        (muFromLevel(3.1) + muFromLevel(3.3) + muFromLevel(3.0)) / 3,
      );
      const expected = rateDoublesMatch({
        slot1: [
          { state: f.states.khalid, lastRatedAt: new Date() },
          { state: f.states.organizer, lastRatedAt: new Date() },
        ],
        slot2: [
          { state: standIn, lastRatedAt: null },
          { state: f.states.ahmed, lastRatedAt: new Date() },
        ],
        outcome: "slot1",
        weight: 0.5,
        now: new Date(),
      });
      const ahmedEvent = events.find((event) => event.userId === f.ahmed.id);
      const khalidEvent = events.find((event) => event.userId === f.khalid.id);
      expect(ahmedEvent?.muAfter).toBeCloseTo(expected.slot2[1].after.mu, 4);
      expect(khalidEvent?.muAfter).toBeCloseTo(expected.slot1[0].after.mu, 4);
      expect(khalidEvent!.muAfter).toBeGreaterThan(f.states.khalid.mu);
      expect(ahmedEvent!.muAfter).toBeLessThan(f.states.ahmed.mu);
    } finally {
      await close();
    }
  });

  it("moves Group Levels for the players with an account only", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await setUpGuestMatch(db, { groupRated: true });

      await completeMatch(db, {
        gameId: f.gameId,
        matchId: f.matchId,
        userId: f.organizer.id,
      });

      const events = await db.query.groupRatingEvents.findMany({
        where: eq(groupRatingEvents.matchId, f.matchId),
      });
      expect(events.map((event) => event.userId).sort()).toEqual(
        [f.organizer.id, f.khalid.id, f.ahmed.id].sort(),
      );
    } finally {
      await close();
    }
  });
});
