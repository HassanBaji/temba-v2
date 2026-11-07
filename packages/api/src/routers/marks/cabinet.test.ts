import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { games, marks, user } from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";
import type { CoinKind, MarkKind } from "@repo/domain/marks";

import {
  completePadelMatch,
  completedFootballFriendlyGame,
  insertUser,
  seatPadelFriendlyGame,
  type PadelMarksGame,
} from "#src/marks/marks.test-support";
import { cabinet, type Cabinet } from "#src/routers/marks/cabinet";
import { castMvpVote } from "#src/routers/marks/castMvpVote";
import { give } from "#src/routers/marks/give";
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

/** a, c and d each give `b` a Mark; everyone votes and `b` is the MVP. */
async function padelCabinetFor(db: TestDatabase) {
  const game = await completedPadel(db);
  const giveTo = (giver: { id: string }, kind: MarkKind) =>
    give(db, {
      gameId: game.gameId,
      userId: giver.id,
      receiverUserId: game.b.id,
      kind,
    });
  await giveTo(game.a, "dynamo");
  await giveTo(game.c, "clutch");
  await giveTo(game.d, "great_wall");
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
  return game;
}

function shown(view: Cabinet) {
  if (view.hidden) {
    throw new Error("Expected a visible cabinet");
  }
  return view;
}

function kindOf(view: Cabinet, sport: "padel" | "football", kind: CoinKind) {
  return shown(view).perSport[sport].kinds.find((row) => row.kind === kind);
}

describe("marks.cabinet", () => {
  it("counts Marks and the MVP on the sport of the Game they came from", async () => {
    await withDb(async (db) => {
      const padel = await padelCabinetFor(db);
      const football = await completedFootballFriendlyGame(db);
      // The same User received a Mark and the MVP on a football Game.
      await db.insert(marks).values({
        matchId: football.matchId,
        giverUserId: football.black[1]!.id,
        receiverUserId: padel.b.id,
        kind: "clutch",
      });
      await db
        .update(games)
        .set({
          mvpUserId: padel.b.id,
          mvpDecidedBy: "organizer",
          mvpDecidedAt: new Date(),
          mvpSettledAt: new Date(),
        })
        .where(eq(games.id, football.gameId));

      const view = shown(
        await cabinet(db, { viewerId: padel.a.id, playerId: padel.b.id }),
      );
      expect(view.isOwner).toBe(false);
      expect(view.hideRoasts).toBeNull();
      expect(view.sports).toEqual(["padel", "football"]);

      expect(view.perSport.padel).toMatchObject({
        total: 3,
        mvpCount: 1,
        mvpDecidedBy: { vote: 1, organizer: 0, tie_break: 0 },
        kindsNotYet: 12 - 4,
      });
      expect(view.perSport.padel.kinds).toHaveLength(12);
      expect(kindOf(view, "padel", "clutch")?.count).toBe(1);
      expect(kindOf(view, "padel", "dynamo")).toMatchObject({
        count: 1,
        group: "teammate",
        lastFrom: {
          giverUserId: padel.a.id,
          giverName: "Ali",
          gameId: padel.gameId,
          game: { format: "friendly_game", groupName: "Thursday padel" },
        },
      });
      expect(kindOf(view, "padel", "mvp")).toMatchObject({
        count: 1,
        group: "mvp",
        lastFrom: {
          giverUserId: null,
          giverName: null,
          gameId: padel.gameId,
        },
      });
      expect(kindOf(view, "padel", "good_game")).toMatchObject({
        count: 0,
        lastFrom: null,
      });

      expect(view.perSport.football).toMatchObject({
        total: 1,
        mvpCount: 1,
        mvpDecidedBy: { vote: 0, organizer: 1, tie_break: 0 },
        kindsNotYet: 10,
      });
      expect(kindOf(view, "football", "clutch")?.count).toBe(1);
      expect(view.perSport.football.kinds.map((row) => row.kind)).not.toContain(
        "smash_machine",
      );
      expect(view.perSport.padel.kinds.map((row) => row.kind)).not.toContain(
        "goal_machine",
      );
    });
  });

  it("counts an MVP only once it has settled", async () => {
    await withDb(async (db) => {
      const game = await completedPadel(db);
      await castMvpVote(db, {
        gameId: game.gameId,
        userId: game.a.id,
        candidateUserId: game.b.id,
      });

      const view = shown(
        await cabinet(db, { viewerId: game.b.id, playerId: game.b.id }),
      );
      expect(view.perSport.padel.mvpCount).toBe(0);
      expect(kindOf(view, "padel", "mvp")?.count).toBe(0);
    });
  });

  it("leaves hidden Roasts out for other viewers and flags them for the owner", async () => {
    await withDb(async (db) => {
      const game = await completedPadel(db);
      await give(db, {
        gameId: game.gameId,
        userId: game.a.id,
        receiverUserId: game.b.id,
        kind: "mr_fumble",
      });
      await give(db, {
        gameId: game.gameId,
        userId: game.c.id,
        receiverUserId: game.b.id,
        kind: "clutch",
      });
      await setHideRoasts(db, { userId: game.b.id, hide: true });

      const other = shown(
        await cabinet(db, { viewerId: game.c.id, playerId: game.b.id }),
      );
      expect(other.hideRoasts).toBeNull();
      expect(other.perSport.padel.total).toBe(1);
      expect(other.perSport.padel.kinds).toHaveLength(10);
      expect(other.perSport.padel.kinds.map((row) => row.kind)).not.toEqual(
        expect.arrayContaining(["mr_fumble"]),
      );
      expect(other.perSport.padel.kinds.map((row) => row.kind)).not.toEqual(
        expect.arrayContaining(["sayed_malek"]),
      );

      const own = shown(
        await cabinet(db, { viewerId: game.b.id, playerId: game.b.id }),
      );
      expect(own.isOwner).toBe(true);
      expect(own.hideRoasts).toBe(true);
      expect(own.perSport.padel.total).toBe(2);
      expect(kindOf(own, "padel", "mr_fumble")).toMatchObject({
        count: 1,
        hiddenFromOthers: true,
      });
      expect(kindOf(own, "padel", "sayed_malek")).toMatchObject({
        count: 0,
        hiddenFromOthers: true,
      });

      await setHideRoasts(db, { userId: game.b.id, hide: false });
      const shownAgain = shown(
        await cabinet(db, { viewerId: game.c.id, playerId: game.b.id }),
      );
      expect(shownAgain.perSport.padel.total).toBe(2);
      expect(kindOf(shownAgain, "padel", "mr_fumble")).toMatchObject({
        count: 1,
        hiddenFromOthers: false,
      });
    });
  });

  it("is hidden from a viewer the owner's Match history visibility excludes", async () => {
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

      expect(
        await cabinet(db, { viewerId: game.a.id, playerId: game.b.id }),
      ).toEqual({ hidden: true });
      const own = shown(
        await cabinet(db, { viewerId: game.b.id, playerId: game.b.id }),
      );
      expect(own.perSport.padel.total).toBe(1);
    });
  });

  it("is not found for an unshared or unknown User", async () => {
    await withDb(async (db) => {
      const game = await completedPadel(db);
      await expect(
        cabinet(db, { viewerId: game.outsider.id, playerId: game.b.id }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      await expect(
        cabinet(db, {
          viewerId: game.outsider.id,
          playerId: crypto.randomUUID(),
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  it("shows the sports a User plays or has coins in, or both when neither", async () => {
    await withDb(async (db) => {
      const nobody = await insertUser(db, "Nobody");
      const empty = shown(
        await cabinet(db, { viewerId: nobody.id, playerId: nobody.id }),
      );
      expect(empty.sports).toEqual(["padel", "football"]);
      expect(empty.perSport.padel).toMatchObject({
        total: 0,
        mvpCount: 0,
        kindsNotYet: 12,
      });
      expect(empty.perSport.football.kindsNotYet).toBe(12);

      await db
        .update(user)
        .set({ sports: ["football"] })
        .where(eq(user.id, nobody.id));
      const footballer = shown(
        await cabinet(db, { viewerId: nobody.id, playerId: nobody.id }),
      );
      expect(footballer.sports).toEqual(["football"]);

      const game = await completedPadel(db);
      await db
        .update(user)
        .set({ sports: ["football"] })
        .where(eq(user.id, game.b.id));
      await give(db, {
        gameId: game.gameId,
        userId: game.a.id,
        receiverUserId: game.b.id,
        kind: "dynamo",
      });
      const both = shown(
        await cabinet(db, { viewerId: game.b.id, playerId: game.b.id }),
      );
      expect(both.sports).toEqual(["padel", "football"]);
    });
  });
});
