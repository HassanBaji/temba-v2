import { groupInviteLinks, groups, user } from "@repo/db/schema";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { GENERIC_TEMBA_OPEN_GRAPH } from "~/lib/game-invite-open-graph";
import { mintLink } from "~/server/invites/doors";
import { loadGroupInviteOpenGraph } from "~/server/invites/group-invite-open-graph";
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

describe("loadGroupInviteOpenGraph", () => {
  it("returns Group name metadata for a live Invite and generic Temba for dead codes", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "group-og-owner@example.com");
      const [group] = await db
        .insert(groups)
        .values({
          name: "Friday Night",
          createdBy: owner.id,
        })
        .returning({ id: groups.id });
      if (!group) {
        throw new Error("Failed to insert group");
      }
      const minted = await mintLink(
        db,
        { kind: "group", id: group.id },
        { createdBy: owner.id },
      );
      expect(minted.ok).toBe(true);
      if (!minted.ok) {
        return;
      }
      expect(
        await loadGroupInviteOpenGraph(db, minted.link.shortCode!),
      ).toEqual({
        title: "Friday Night",
        description: 'You are invited to join "Friday Night" for "Padel"',
      });

      expect(await loadGroupInviteOpenGraph(db, "0O1ILUAB")).toEqual(
        GENERIC_TEMBA_OPEN_GRAPH,
      );
      expect(await loadGroupInviteOpenGraph(db, "ZZZZZZZZ")).toEqual(
        GENERIC_TEMBA_OPEN_GRAPH,
      );

      await db
        .update(groupInviteLinks)
        .set({ expiresAt: new Date(Date.now() - 1000) })
        .where(eq(groupInviteLinks.id, minted.link.id));
      expect(
        await loadGroupInviteOpenGraph(db, minted.link.shortCode!),
      ).toEqual(GENERIC_TEMBA_OPEN_GRAPH);
    } finally {
      await close();
    }
  });
});
