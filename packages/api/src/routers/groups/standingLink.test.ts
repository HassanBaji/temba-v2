import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";

import { groupMembers, groupSeasons, groups, user } from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { standingLink } from "#src/routers/groups/standingLink";

type ApiDb = Parameters<typeof standingLink>[0];

const ORIGIN = "https://temba.example";

async function setUp(database: TestDatabase) {
  const [owner, stranger] = await database
    .insert(user)
    .values([
      { name: "owner", email: "owner@example.com" },
      { name: "stranger", email: "stranger@example.com" },
    ])
    .returning({ id: user.id });
  const [group] = await database
    .insert(groups)
    .values({ name: "Tuesday Night", createdBy: owner!.id, sport: "padel" })
    .returning({ id: groups.id });
  await database
    .insert(groupMembers)
    .values({ groupId: group!.id, userId: owner!.id });
  const [season] = await database
    .insert(groupSeasons)
    .values({
      groupId: group!.id,
      name: "Season 1",
      startsOn: "2026-11-01",
      endsOn: "2027-01-31",
      createdBy: owner!.id,
    })
    .returning({ id: groupSeasons.id });
  return {
    db: database as unknown as ApiDb,
    ownerId: owner!.id,
    strangerId: stranger!.id,
    groupId: group!.id,
    seasonId: season!.id,
  };
}

describe("standingLink", () => {
  it("links to the lens and view on screen", async () => {
    const { db: raw, close } = await createPgliteDb();
    try {
      const { db, ownerId, groupId, seasonId } = await setUp(raw);
      expect(
        await standingLink(db, {
          groupId,
          seasonId,
          view: "by-level",
          userId: ownerId,
          origin: ORIGIN,
        }),
      ).toEqual({
        url: `${ORIGIN}/dashboard/groups/${groupId}?season=${seasonId}&view=by-level`,
      });
      expect(
        (
          await standingLink(db, {
            groupId,
            seasonId: null,
            view: "overall",
            userId: ownerId,
            origin: ORIGIN,
          })
        ).url,
      ).toBe(
        `${ORIGIN}/dashboard/groups/${groupId}?season=all-time&view=overall`,
      );
    } finally {
      await close();
    }
  });

  it("refuses a viewer who is not a member", async () => {
    const { db: raw, close } = await createPgliteDb();
    try {
      const { db, strangerId, groupId } = await setUp(raw);
      const error = await standingLink(db, {
        groupId,
        seasonId: null,
        view: "overall",
        userId: strangerId,
        origin: ORIGIN,
      }).then(
        () => null,
        (caught: unknown) => caught,
      );
      expect(error).toBeInstanceOf(TRPCError);
      expect((error as TRPCError).code).toBe("FORBIDDEN");
    } finally {
      await close();
    }
  });
});
