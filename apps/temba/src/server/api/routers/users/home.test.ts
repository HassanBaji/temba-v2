import {
  communities,
  CommunityRoleEnum,
  groups,
  teams,
  user,
} from "@repo/db/schema";
import { describe, expect, it } from "vitest";

import { admit as admitCommunityMember } from "~/server/community-membership";
import {
  loadHome,
  summarizeCompletedMatchStats,
} from "~/server/api/routers/users/home";
import { acceptLookup, mintLookup } from "~/server/invites/doors";
import { createPgliteDb, type TestDatabase } from "~/server/test/pglite";

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

  it("sums unused community, group, and team lookup invites", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "home-invites-owner@example.com");
      const viewer = await insertUser(db, "home-invites-viewer@example.com");

      const [community] = await db
        .insert(communities)
        .values({
          name: "Home Club",
          type: "private",
          createdBy: owner.id,
        })
        .returning({ id: communities.id });
      if (!community) {
        throw new Error("Failed to insert community");
      }
      await admitCommunityMember(db, {
        communityId: community.id,
        userId: owner.id,
        role: CommunityRoleEnum.OWNER,
      });

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

      const communityMint = await mintLookup(
        db,
        { kind: "community", id: community.id },
        { userId: viewer.id, invitedBy: owner.id },
      );
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
      expect(communityMint.ok).toBe(true);
      expect(groupMint.ok).toBe(true);
      expect(teamMint.ok).toBe(true);

      const result = await loadHome(db, { userId: viewer.id });
      expect(result.pendingInviteCount).toBe(3);
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
      const [community] = await db
        .insert(communities)
        .values({
          name: "Accepted Club",
          type: "private",
          createdBy: owner.id,
        })
        .returning({ id: communities.id });
      if (!community) {
        throw new Error("Failed to insert community");
      }
      await admitCommunityMember(db, {
        communityId: community.id,
        userId: owner.id,
        role: CommunityRoleEnum.OWNER,
      });

      const host = { kind: "community" as const, id: community.id };
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
      });
      expect(accepted.ok).toBe(true);

      const result = await loadHome(db, { userId: viewer.id });
      expect(result.pendingInviteCount).toBe(0);
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
    });
    expect(
      summarizeCompletedMatchStats([{ userSlot: 2, sets: drawSets }]),
    ).toEqual({
      gamesPlayed: 1,
      gamesWon: 0,
      gamesLost: 0,
      setsWon: 1,
    });
  });
});
