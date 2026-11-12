import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { groupMembers, GroupMemberRoleEnum, user } from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { groupById } from "#src/routers/groups/byId";
import { createLoosePrivate } from "#src/routers/groups/createLoosePrivate";
import { seasonStanding } from "#src/routers/groups/seasonStanding";
import { setMemberNickname } from "#src/routers/groups/setMemberNickname";

async function insertUser(database: TestDatabase, name: string) {
  const [row] = await database
    .insert(user)
    .values({
      name,
      email: `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
      clerkId: `user_${crypto.randomUUID()}`,
    })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row.id;
}

async function seed(database: TestDatabase) {
  const creator = await insertUser(database, "Hassan Ali");
  const organizer = await insertUser(database, "Yousif Kadhem");
  const member = await insertUser(database, "Ahmed Nasser");
  const other = await insertUser(database, "Ahmed Buhazza");
  const outsider = await insertUser(database, "Salman H");
  const group = await createLoosePrivate(database, {
    name: "Karbabad Friday Football",
    sport: "football",
    userId: creator,
  });
  await database.insert(groupMembers).values([
    {
      groupId: group.id,
      userId: organizer,
      role: GroupMemberRoleEnum.ORGANIZER,
    },
    { groupId: group.id, userId: member },
    { groupId: group.id, userId: other },
  ]);
  return { creator, organizer, member, other, outsider, groupId: group.id };
}

async function rejection(promise: Promise<unknown>) {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(TRPCError);
  return error as TRPCError;
}

async function nicknameSeenBy(
  database: TestDatabase,
  groupId: string,
  viewerId: string,
  memberId: string,
) {
  const home = await groupById(database, { groupId, userId: viewerId });
  return (
    home.standing.leaderboard.find((row) => row.userId === memberId)
      ?.nickname ?? null
  );
}

describe("groups.setMemberNickname", () => {
  it("lets an Appointed Organizer name a member and records the editor", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seed(db);
      const now = new Date("2026-11-12T10:00:00Z");

      await expect(
        setMemberNickname(db, {
          groupId: f.groupId,
          approverUserId: f.organizer,
          userId: f.member,
          nickname: "  Ahmed   keeper ",
          visibility: "approvers",
          now,
        }),
      ).resolves.toMatchObject({
        ok: true,
        nickname: { name: "Ahmed keeper", visibility: "approvers" },
      });

      const row = await db.query.groupMembers.findFirst({
        where: and(
          eq(groupMembers.groupId, f.groupId),
          eq(groupMembers.userId, f.member),
        ),
      });
      expect(row).toMatchObject({
        nickname: "Ahmed keeper",
        nicknameVisibility: "approvers",
        nicknameUpdatedById: f.organizer,
        nicknameUpdatedAt: now,
      });
    } finally {
      await close();
    }
  });

  it("shows an approvers-only name to approvers and hides it from members and the player", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seed(db);
      await setMemberNickname(db, {
        groupId: f.groupId,
        approverUserId: f.creator,
        userId: f.other,
        nickname: "Abu Ali",
        visibility: "approvers",
      });

      expect(await nicknameSeenBy(db, f.groupId, f.organizer, f.other)).toEqual(
        { name: "Abu Ali", visibility: "approvers" },
      );
      expect(await nicknameSeenBy(db, f.groupId, f.member, f.other)).toBeNull();
      expect(await nicknameSeenBy(db, f.groupId, f.other, f.other)).toBeNull();
    } finally {
      await close();
    }
  });

  it("shows a name set for the whole Group to every member, the player included", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seed(db);
      await setMemberNickname(db, {
        groupId: f.groupId,
        approverUserId: f.creator,
        userId: f.member,
        nickname: "Ahmed keeper",
        visibility: "group",
      });

      const expected = { name: "Ahmed keeper", visibility: "group" };
      expect(await nicknameSeenBy(db, f.groupId, f.other, f.member)).toEqual(
        expected,
      );
      expect(await nicknameSeenBy(db, f.groupId, f.member, f.member)).toEqual(
        expected,
      );
      const standing = await seasonStanding(db, {
        groupId: f.groupId,
        seasonId: null,
        userId: f.other,
      });
      expect(
        standing.rows.find((row) => row.userId === f.member)?.nickname,
      ).toEqual(expected);
    } finally {
      await close();
    }
  });

  it("clears the name on a blank or null value", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seed(db);
      const base = {
        groupId: f.groupId,
        approverUserId: f.creator,
        userId: f.member,
        visibility: "group" as const,
      };
      await setMemberNickname(db, { ...base, nickname: "Ahmed keeper" });
      await setMemberNickname(db, { ...base, nickname: "   " });
      expect(
        await nicknameSeenBy(db, f.groupId, f.creator, f.member),
      ).toBeNull();

      await setMemberNickname(db, { ...base, nickname: "Ahmed keeper" });
      await setMemberNickname(db, { ...base, nickname: null });
      expect(
        await nicknameSeenBy(db, f.groupId, f.creator, f.member),
      ).toBeNull();
    } finally {
      await close();
    }
  });

  it("refuses members who are not approvers, names over 24 characters and non-members", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await seed(db);
      const base = {
        groupId: f.groupId,
        userId: f.member,
        visibility: "approvers" as const,
      };

      expect(
        (
          await rejection(
            setMemberNickname(db, {
              ...base,
              approverUserId: f.other,
              nickname: "Ahmed keeper",
            }),
          )
        ).code,
      ).toBe("FORBIDDEN");
      expect(
        (
          await rejection(
            setMemberNickname(db, {
              ...base,
              approverUserId: f.creator,
              nickname: "x".repeat(25),
            }),
          )
        ).code,
      ).toBe("BAD_REQUEST");
      expect(
        (
          await rejection(
            setMemberNickname(db, {
              ...base,
              approverUserId: f.creator,
              userId: f.outsider,
              nickname: "Salman lefty",
            }),
          )
        ).code,
      ).toBe("NOT_FOUND");
    } finally {
      await close();
    }
  });
});
