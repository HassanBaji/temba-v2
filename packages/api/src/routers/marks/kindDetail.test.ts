import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { groupMembers, groups, user } from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import {
  completePadelMatch,
  completedFootballFriendlyGame,
  insertUser,
  seatPadelFriendlyGame,
  type PadelMarksGame,
} from "#src/marks/marks.test-support";
import { castMvpVote } from "#src/routers/marks/castMvpVote";
import { give } from "#src/routers/marks/give";
import { kindDetail } from "#src/routers/marks/kindDetail";
import { setHideRoasts } from "#src/routers/users/setHideRoasts";

async function withDb(run: (db: TestDatabase) => Promise<void>) {
  const { db, close } = await createPgliteDb();
  try {
    await run(db);
  } finally {
    await close();
  }
}

async function completedPadel(db: TestDatabase): Promise<PadelMarksGame> {
  const game = await seatPadelFriendlyGame(db);
  await completePadelMatch(db, game);
  return game;
}

/** A User who shares a Group with `player` but may not open the padel Game. */
async function groupMateOf(db: TestDatabase, player: { id: string }) {
  const mate = await insertUser(db, "Mate");
  const [group] = await db
    .insert(groups)
    .values({ name: "Other group", createdBy: mate.id })
    .returning({ id: groups.id });
  await db.insert(groupMembers).values([
    { groupId: group!.id, userId: mate.id },
    { groupId: group!.id, userId: player.id },
  ]);
  return mate;
}

describe("marks.kindDetail", () => {
  it("lists each Mark with its giver, side, Game, score, date and whether it opens", async () => {
    await withDb(async (db) => {
      const game = await completedPadel(db);
      await give(db, {
        gameId: game.gameId,
        userId: game.a.id,
        receiverUserId: game.c.id,
        kind: "clutch",
      });
      await give(db, {
        gameId: game.gameId,
        userId: game.d.id,
        receiverUserId: game.c.id,
        kind: "dynamo",
      });

      const clutch = await kindDetail(db, {
        viewerId: game.b.id,
        playerId: game.c.id,
        kind: "clutch",
        sport: "padel",
      });
      expect(clutch).toMatchObject({
        kind: "clutch",
        sport: "padel",
        isOwner: false,
        hiddenFromOthers: false,
      });
      expect(clutch.rows).toHaveLength(1);
      expect(clutch.rows[0]).toMatchObject({
        gameId: game.gameId,
        matchId: game.matchId,
        sport: "padel",
        game: { format: "friendly_game", groupName: "Thursday padel" },
        score: [{ us: 2, them: 6 }],
        outcome: "lost",
        giver: { userId: game.a.id, name: "Ali" },
        relation: "opponent",
        decidedBy: null,
        canOpenGame: true,
      });
      expect(clutch.rows[0]?.playedAt).toBeInstanceOf(Date);
      expect(clutch.rows[0]?.game.venueName).toEqual(expect.any(String));

      const dynamo = await kindDetail(db, {
        viewerId: game.c.id,
        playerId: game.c.id,
        kind: "dynamo",
        sport: "padel",
      });
      expect(dynamo.isOwner).toBe(true);
      expect(dynamo.rows[0]).toMatchObject({
        giver: { userId: game.d.id },
        relation: "teammate",
      });

      const mate = await groupMateOf(db, game.c);
      const fromOutside = await kindDetail(db, {
        viewerId: mate.id,
        playerId: game.c.id,
        kind: "clutch",
        sport: "padel",
      });
      expect(fromOutside.rows[0]?.canOpenGame).toBe(false);

      const otherSport = await kindDetail(db, {
        viewerId: game.c.id,
        playerId: game.c.id,
        kind: "clutch",
        sport: "football",
      });
      expect(otherSport.rows).toEqual([]);
    });
  });

  it("lists MVP rows with how each was decided and no giver", async () => {
    await withDb(async (db) => {
      const game = await completedPadel(db);
      for (const voter of [game.a, game.c, game.d]) {
        await castMvpVote(db, {
          gameId: game.gameId,
          userId: voter.id,
          candidateUserId: game.b.id,
        });
      }
      await castMvpVote(db, {
        gameId: game.gameId,
        userId: game.b.id,
        candidateUserId: game.a.id,
      });

      const detail = await kindDetail(db, {
        viewerId: game.a.id,
        playerId: game.b.id,
        kind: "mvp",
        sport: "padel",
      });
      expect(detail.rows).toHaveLength(1);
      expect(detail.rows[0]).toMatchObject({
        gameId: game.gameId,
        matchId: game.matchId,
        score: [{ us: 6, them: 2 }],
        outcome: "won",
        giver: null,
        relation: null,
        decidedBy: "vote",
        canOpenGame: true,
      });
    });
  });

  it("reads the football score from the owner's side", async () => {
    await withDb(async (db) => {
      const football = await completedFootballFriendlyGame(db);
      const [scorer, teammate] = football.black;
      await give(db, {
        gameId: football.gameId,
        userId: teammate!.id,
        receiverUserId: scorer!.id,
        kind: "goal_machine",
      });

      const detail = await kindDetail(db, {
        viewerId: scorer!.id,
        playerId: scorer!.id,
        kind: "goal_machine",
        sport: "football",
      });
      expect(detail.rows[0]).toMatchObject({
        sport: "football",
        score: [{ us: 2, them: 1 }],
        outcome: "won",
        relation: "teammate",
      });
    });
  });

  it("hides a Roast the owner hides from everyone but the owner", async () => {
    await withDb(async (db) => {
      const game = await completedPadel(db);
      await give(db, {
        gameId: game.gameId,
        userId: game.a.id,
        receiverUserId: game.b.id,
        kind: "mr_fumble",
      });
      await setHideRoasts(db, { userId: game.b.id, hide: true });

      await expect(
        kindDetail(db, {
          viewerId: game.c.id,
          playerId: game.b.id,
          kind: "mr_fumble",
          sport: "padel",
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      const own = await kindDetail(db, {
        viewerId: game.b.id,
        playerId: game.b.id,
        kind: "mr_fumble",
        sport: "padel",
      });
      expect(own.hiddenFromOthers).toBe(true);
      expect(own.rows).toHaveLength(1);
    });
  });

  it("is not found under Match history visibility, for a kind off the tab, or an unshared User", async () => {
    await withDb(async (db) => {
      const game = await completedPadel(db);
      await give(db, {
        gameId: game.gameId,
        userId: game.a.id,
        receiverUserId: game.b.id,
        kind: "dynamo",
      });
      await db
        .update(user)
        .set({ matchHistoryVisibility: "only_me" })
        .where(eq(user.id, game.b.id));

      await expect(
        kindDetail(db, {
          viewerId: game.a.id,
          playerId: game.b.id,
          kind: "dynamo",
          sport: "padel",
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(
        kindDetail(db, {
          viewerId: game.b.id,
          playerId: game.b.id,
          kind: "smash_machine",
          sport: "football",
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(
        kindDetail(db, {
          viewerId: game.outsider.id,
          playerId: game.b.id,
          kind: "dynamo",
          sport: "padel",
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(
        kindDetail(db, {
          viewerId: game.outsider.id,
          playerId: crypto.randomUUID(),
          kind: "dynamo",
          sport: "padel",
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });
});
