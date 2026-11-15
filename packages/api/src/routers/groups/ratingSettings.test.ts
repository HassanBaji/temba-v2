import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { groups } from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import {
  addMember,
  footballGame,
  insertUser,
} from "#src/ratings/group-rated-match.test-support";
import { groupRatingSettings } from "#src/routers/groups/ratingSettings";

type ApiDb = Parameters<typeof groupRatingSettings>[0];

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

async function rejection(promise: Promise<unknown>) {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(TRPCError);
  return error as TRPCError;
}

describe("groups.ratingSettings", () => {
  it("gives an Organizer the settings and the menu row's summary", async () => {
    await withDb(async (db) => {
      const f = await footballGame(db);
      await db
        .update(groups)
        .set({ performanceRatingMode: "everyone" })
        .where(eq(groups.id, f.groupId));

      expect(
        await groupRatingSettings(apiDb(db), {
          groupId: f.groupId,
          userId: f.organizerId,
        }),
      ).toEqual({
        group: { id: f.groupId, name: "Thursday Football" },
        canChange: true,
        settings: {
          mode: "everyone",
          weightPercent: 30,
          organizerCountsDouble: false,
        },
        summary: "Everyone rates after a game, standard weight",
        line: "After each game everyone rates, and the average is 30% of the move.",
      });
    });
  });

  it("gives a member only the line", async () => {
    await withDb(async (db) => {
      const f = await footballGame(db);
      const member = await addMember(f, "member");
      const result = await groupRatingSettings(apiDb(db), {
        groupId: f.groupId,
        userId: member,
        locale: "ar",
      });
      expect(result.canChange).toBe(false);
      expect(result.settings).toBeNull();
      expect(result.summary).toBeNull();
      expect(result.line).toBe(
        "النتائج فقط: تتحرّك نقاط الفئة بالفوز والتعادل والخسارة.",
      );
    });
  });

  it("refuses someone outside the Group", async () => {
    await withDb(async (db) => {
      const f = await footballGame(db);
      const stranger = await insertUser(db, "stranger");
      const refused = await rejection(
        groupRatingSettings(apiDb(db), {
          groupId: f.groupId,
          userId: stranger.id,
        }),
      );
      expect(refused.code).toBe("FORBIDDEN");
    });
  });

  it("refuses a Verified Group, which has no tier", async () => {
    await withDb(async (db) => {
      const f = await footballGame(db, { verified: true });
      const refused = await rejection(
        groupRatingSettings(apiDb(db), {
          groupId: f.groupId,
          userId: f.organizerId,
        }),
      );
      expect(refused.code).toBe("PRECONDITION_FAILED");
    });
  });
});
