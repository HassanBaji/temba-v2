import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  MatchStatusEnum,
  games,
  groupMembers,
  groups,
  matches,
  user,
  venueVerifiers,
  venues,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";
import { messagesFor } from "@repo/i18n/messages";

import { gameById } from "#src/routers/games/byId";
import { confirmMatchResult } from "#src/routers/games/confirmMatchResult";
import { seatedPublicGame } from "#src/routers/games/public-game.test-support";
import { registerSeat } from "#src/routers/games/registerSeat";
import { scoreSet } from "#src/routers/games/scoreSet";
import { stampMatch } from "#src/routers/games/stampMatch";
import { updateGameName } from "#src/routers/games/updateName";

const errors = messagesFor("en").game.errors;

async function withDb(run: (db: TestDatabase) => Promise<void>) {
  const { db, close } = await createPgliteDb();
  try {
    await run(db);
  } finally {
    await close();
  }
}

async function insertUser(db: TestDatabase, name: string) {
  const [row] = await db
    .insert(user)
    .values({ name, email: `${name}-${crypto.randomUUID()}@example.com` })
    .returning({ id: user.id });
  return row!.id;
}

async function verifierAt(db: TestDatabase, venueId: string) {
  const userId = await insertUser(db, "Sara");
  await db.insert(venueVerifiers).values({ venueId, userId, kind: "referee" });
  return userId;
}

/**
 * A private Group Game at a Venue with its four seats taken by Group members,
 * and the creator's 6-3 entered on its Match.
 */
async function enteredGroupGame(db: TestDatabase) {
  const g = await seatedPublicGame(db);
  const game = await db.query.games.findFirst({
    where: eq(games.id, g.gameId),
    columns: { venueId: true },
  });
  const [group] = await db
    .insert(groups)
    .values({ name: "Tuesday Crew", createdBy: g.creator })
    .returning({ id: groups.id });
  for (const userId of [g.creator, g.b, g.c, g.d]) {
    await db.insert(groupMembers).values({ groupId: group!.id, userId });
  }
  await db
    .update(games)
    .set({ isPublic: false, groupId: group!.id })
    .where(eq(games.id, g.gameId));
  await scoreSet(db, {
    gameId: g.gameId,
    matchId: g.matchId,
    setId: g.setId,
    userId: g.creator,
    slot1GamesWon: 6,
    slot2GamesWon: 3,
  });
  return { ...g, venueId: game!.venueId! };
}

describe("games.byId for a Verifier (ADR-0072)", () => {
  it("opens a private Group Game at the Verifier's Venue, with the stamp and nothing else to do", async () => {
    await withDb(async (db) => {
      const g = await enteredGroupGame(db);
      const verifier = await verifierAt(db, g.venueId);

      const details = await gameById(db, {
        gameId: g.gameId,
        userId: verifier,
      });

      expect(details.matches[0]).toMatchObject({
        id: g.matchId,
        canStamp: true,
        canAddSet: false,
        canScoreSets: false,
        canConfirmScore: false,
        canComplete: false,
        canDispute: false,
      });
      expect(details).toMatchObject({
        isOrganizer: false,
        isGroupMember: false,
        isRegistered: false,
        canRegister: false,
        canWaitlist: false,
        canJoin: false,
        canLeave: false,
        canInvite: false,
        canAddPlayer: false,
        canRequestLevelRange: false,
        canChangeSeason: false,
      });

      await stampMatch(db, { matchId: g.matchId, userId: verifier });
      const match = await db.query.matches.findFirst({
        where: eq(matches.id, g.matchId),
        columns: { status: true },
      });
      expect(match?.status).toBe(MatchStatusEnum.COMPLETED);
    });
  });

  it("does not open a private Group Game at another Venue", async () => {
    await withDb(async (db) => {
      const g = await enteredGroupGame(db);
      const [elsewhere] = await db
        .insert(venues)
        .values({ name: "Elsewhere", city: "Manama", country: "BH" })
        .returning({ id: venues.id });
      const verifier = await verifierAt(db, elsewhere!.id);

      await expect(
        gameById(db, { gameId: g.gameId, userId: verifier }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  it("refuses the Verifier every write but the stamp", async () => {
    await withDb(async (db) => {
      const g = await enteredGroupGame(db);
      const verifier = await verifierAt(db, g.venueId);

      await expect(
        registerSeat(db, { gameId: g.gameId, userId: verifier }),
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: errors.groupMembersRegister,
      });
      await expect(
        scoreSet(db, {
          gameId: g.gameId,
          matchId: g.matchId,
          setId: g.setId,
          userId: verifier,
          slot1GamesWon: 3,
          slot2GamesWon: 6,
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(
        confirmMatchResult(db, {
          gameId: g.gameId,
          matchId: g.matchId,
          userId: verifier,
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(
        updateGameName(db, {
          gameId: g.gameId,
          userId: verifier,
          customName: "Renamed",
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });

      const match = await db.query.matches.findFirst({
        where: eq(matches.id, g.matchId),
        columns: { status: true },
      });
      expect(match?.status).toBe(MatchStatusEnum.PENDING);
    });
  });
});
