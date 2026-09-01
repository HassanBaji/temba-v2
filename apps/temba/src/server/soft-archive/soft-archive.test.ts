import { communities, groups, user } from "@repo/db/schema";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { commit, consult } from "~/server/soft-archive";
import { createPgliteDb, type TestDatabase } from "~/server/test/pglite";

async function insertUser(database: TestDatabase, email: string) {
  const [row] = await database
    .insert(user)
    .values({ name: "Test User", email })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row;
}

async function insertCommunity(
  database: TestDatabase,
  createdBy: string,
  archivedAt: Date | null = null,
) {
  const [row] = await database
    .insert(communities)
    .values({
      name: "Test Community",
      type: "private",
      createdBy,
      archivedAt,
    })
    .returning({
      id: communities.id,
      archivedAt: communities.archivedAt,
    });
  if (!row) {
    throw new Error("Failed to insert community");
  }
  return row;
}

describe("Soft-archive Community", () => {
  it("commits archive and unarchive and answers freeze kinds", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner@example.com");
      const community = await insertCommunity(db, owner.id);

      const live = await consult(db, { communityId: community.id });
      expect(live.ok).toBe(true);
      if (!live.ok) {
        return;
      }
      expect(live.phase).toBe("live");
      expect(live.freeze("join")).toBe(false);
      expect(live.freeze("catalog")).toBe(false);
      expect(live.freeze("host")).toBe(false);

      const archived = await commit(
        db,
        { communityId: community.id },
        "archived",
      );
      expect(archived).toMatchObject({ ok: true, phase: "archived" });
      if (!archived.ok) {
        return;
      }
      expect(archived.archivedAt).toBeInstanceOf(Date);

      const frozen = await consult(db, { communityId: community.id });
      expect(frozen.ok).toBe(true);
      if (!frozen.ok) {
        return;
      }
      expect(frozen.phase).toBe("archived");
      expect(frozen.freeze("join")).toBe(true);
      expect(frozen.freeze("catalog")).toBe(true);
      expect(frozen.freeze("host")).toBe(true);

      const snapshot = consult({ archivedAt: frozen.archivedAt });
      expect(snapshot.freeze("join")).toBe(true);

      const restored = await commit(db, { communityId: community.id }, "live");
      expect(restored).toMatchObject({
        ok: true,
        phase: "live",
        archivedAt: null,
      });

      const after = await consult(db, { communityId: community.id });
      expect(after.ok && after.phase === "live").toBe(true);
    } finally {
      await close();
    }
  });

  it("returns domain outcomes for missing and no-op commits", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner2@example.com");
      const community = await insertCommunity(db, owner.id);

      await expect(
        consult(db, {
          communityId: "00000000-0000-4000-8000-000000000001",
        }),
      ).resolves.toEqual({ ok: false, reason: "not_found" });

      await expect(
        commit(
          db,
          { communityId: "00000000-0000-4000-8000-000000000001" },
          "archived",
        ),
      ).resolves.toEqual({ ok: false, reason: "not_found" });

      await expect(
        commit(db, { communityId: community.id }, "live"),
      ).resolves.toEqual({ ok: false, reason: "already_live" });

      await commit(db, { communityId: community.id }, "archived");

      await expect(
        commit(db, { communityId: community.id }, "archived"),
      ).resolves.toEqual({ ok: false, reason: "already_archived" });
    } finally {
      await close();
    }
  });

  it("freezes Club Group Game join through consult, not raw archivedAt", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner3@example.com");
      const community = await insertCommunity(db, owner.id);
      const [clubGroup] = await db
        .insert(groups)
        .values({
          name: "Club Group",
          createdBy: owner.id,
          communityId: community.id,
        })
        .returning({ id: groups.id });
      if (!clubGroup) {
        throw new Error("Failed to insert club group");
      }
      const [looseGroup] = await db
        .insert(groups)
        .values({
          name: "Loose Group",
          createdBy: owner.id,
          communityId: null,
        })
        .returning({ id: groups.id });
      if (!looseGroup) {
        throw new Error("Failed to insert loose group");
      }

      const before = await consult(db, {
        clubGroupGame: { groupId: clubGroup.id },
      });
      expect(before.ok && before.freeze("join")).toBe(false);

      await commit(db, { communityId: community.id }, "archived");

      const clubGame = await consult(db, {
        clubGroupGame: { groupId: clubGroup.id },
      });
      expect(clubGame.ok && clubGame.freeze("join")).toBe(true);
      expect(clubGame.ok && clubGame.freeze("catalog")).toBe(true);

      const viaGroup = await consult(db, { clubGroupId: clubGroup.id });
      expect(viaGroup.ok && viaGroup.freeze("host")).toBe(true);

      const groupless = await consult(db, {
        clubGroupGame: { groupId: null },
      });
      expect(groupless.ok && groupless.freeze("join")).toBe(false);

      const loose = await consult(db, {
        clubGroupGame: { groupId: looseGroup.id },
      });
      expect(loose.ok && loose.freeze("join")).toBe(false);

      const [row] = await db
        .select({ archivedAt: communities.archivedAt })
        .from(communities)
        .where(eq(communities.id, community.id));
      expect(row?.archivedAt).toBeInstanceOf(Date);
    } finally {
      await close();
    }
  });
});
