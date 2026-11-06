import { groupMembers, groups, teams, user } from "@repo/db/schema";
import { describe, expect, it } from "vitest";

import { loadHome } from "#src/routers/users/home";
import { summarizeCompletedMatchStats } from "@repo/domain/completed-matches";
import { acceptLookup, mintLookup } from "#src/invites/doors";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

async function insertUser(database: TestDatabase, email: string) {
  const [row] = await database
    .insert(user)
    .values({ name: email.split("@")[0] ?? "User", email })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row;
}

describe("loadHome pendingInviteCount", () => {
  it("is zero when the User has no unused invites", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const viewer = await insertUser(db, "home-invites-none@example.com");
      const result = await loadHome(db, { userId: viewer.id });
      expect(result.pendingInviteCount).toBe(0);
    } finally {
      await close();
    }
  });

  it("sums unused group and team lookup invites", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "home-invites-owner@example.com");
      const viewer = await insertUser(db, "home-invites-viewer@example.com");

      const [group] = await db
        .insert(groups)
        .values({ name: "Home Group", createdBy: owner.id })
        .returning({ id: groups.id });
      if (!group) {
        throw new Error("Failed to insert group");
      }

      const [team] = await db
        .insert(teams)
        .values({ name: "Home Team", createdBy: owner.id })
        .returning({ id: teams.id });
      if (!team) {
        throw new Error("Failed to insert team");
      }

      const groupMint = await mintLookup(
        db,
        { kind: "group", id: group.id },
        { userId: viewer.id, invitedBy: owner.id },
      );
      const teamMint = await mintLookup(
        db,
        { kind: "team", id: team.id },
        { userId: viewer.id, invitedBy: owner.id },
      );
      expect(groupMint.ok).toBe(true);
      expect(teamMint.ok).toBe(true);

      const result = await loadHome(db, { userId: viewer.id });
      expect(result.pendingInviteCount).toBe(2);
    } finally {
      await close();
    }
  });

  it("does not count an accepted invite", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(
        db,
        "home-invites-accepted-owner@example.com",
      );
      const viewer = await insertUser(
        db,
        "home-invites-accepted-viewer@example.com",
      );
      const [group] = await db
        .insert(groups)
        .values({ name: "Accepted Group", createdBy: owner.id })
        .returning({ id: groups.id });
      if (!group) {
        throw new Error("Failed to insert group");
      }

      const host = { kind: "group" as const, id: group.id };
      const minted = await mintLookup(db, host, {
        userId: viewer.id,
        invitedBy: owner.id,
      });
      expect(minted.ok).toBe(true);
      if (!minted.ok) {
        return;
      }

      const accepted = await acceptLookup(db, host, {
        inviteId: minted.invite.id,
        userId: viewer.id,
        locale: "en",
      });
      expect(accepted.ok).toBe(true);

      const result = await loadHome(db, { userId: viewer.id });
      expect(result.pendingInviteCount).toBe(0);
    } finally {
      await close();
    }
  });
});

describe("loadHome standing", () => {
  it("has no position for a member without a counted Match", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const viewer = await insertUser(db, "home-standing-new@example.com");
      const [group] = await db
        .insert(groups)
        .values({ name: "Fresh Group", createdBy: viewer.id })
        .returning({ id: groups.id });
      if (!group) {
        throw new Error("Failed to insert group");
      }
      await db
        .insert(groupMembers)
        .values({ groupId: group.id, userId: viewer.id });

      const result = await loadHome(db, { userId: viewer.id });
      expect(result.standing).toHaveLength(1);
      expect(result.standing[0]?.position).toBeNull();
    } finally {
      await close();
    }
  });
});

describe("summarizeCompletedMatchStats", () => {
  const winSets = [{ slot1GamesWon: 6, slot2GamesWon: 4 }];
  const lossSets = [{ slot1GamesWon: 4, slot2GamesWon: 6 }];
  const drawSets = [
    { slot1GamesWon: 6, slot2GamesWon: 4 },
    { slot1GamesWon: 4, slot2GamesWon: 6 },
  ];

  it("counts a win as played and won, not lost", () => {
    expect(
      summarizeCompletedMatchStats([{ userSlot: 1, sets: winSets }]),
    ).toEqual({
      gamesPlayed: 1,
      gamesWon: 1,
      gamesLost: 0,
      setsWon: 1,
      setsLost: 0,
    });
  });

  it("counts a loss as played and lost, not won", () => {
    expect(
      summarizeCompletedMatchStats([{ userSlot: 1, sets: lossSets }]),
    ).toEqual({
      gamesPlayed: 1,
      gamesWon: 0,
      gamesLost: 1,
      setsWon: 0,
      setsLost: 1,
    });
  });

  it("counts a drawn Match as played but neither won nor lost", () => {
    expect(
      summarizeCompletedMatchStats([{ userSlot: 1, sets: drawSets }]),
    ).toEqual({
      gamesPlayed: 1,
      gamesWon: 0,
      gamesLost: 0,
      setsWon: 1,
      setsLost: 1,
    });
    expect(
      summarizeCompletedMatchStats([{ userSlot: 2, sets: drawSets }]),
    ).toEqual({
      gamesPlayed: 1,
      gamesWon: 0,
      gamesLost: 0,
      setsWon: 1,
      setsLost: 1,
    });
  });
});
