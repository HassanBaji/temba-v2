import { and, eq, isNull } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  communities,
  communitySports,
  teamMemberInvites,
  teamMembers,
  user,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { acceptInAppInvite } from "./acceptInAppInvite";
import { acceptInviteLink } from "./acceptInviteLink";
import { createInviteLink } from "./createInviteLink";
import { createTeam } from "./create";
import { dissolve } from "./dissolve";
import { inviteInApp } from "./inviteInApp";
import { leave } from "./leave";
import { mine } from "./mine";
import { requestLink } from "./requestLink";
import { teamById } from "./byId";

type Db = Parameters<typeof createTeam>[0];

async function makeUsers(database: TestDatabase, count: number) {
  const rows = await database
    .insert(user)
    .values(
      Array.from({ length: count }, (_, index) => ({
        name: `Player ${index}`,
        email: `player${index}@example.com`,
      })),
    )
    .returning({ id: user.id });
  return rows.map((row) => row.id);
}

async function makeTeam(
  database: TestDatabase,
  creator: { id: string },
  sport: "padel" | "football",
) {
  const team = await createTeam(database as unknown as Db, {
    name: undefined,
    sport,
    userId: creator.id,
    userName: "Creator",
  });
  return team.id;
}

async function addMembers(
  database: TestDatabase,
  teamId: string,
  userIds: string[],
) {
  await database
    .insert(teamMembers)
    .values(userIds.map((userId) => ({ teamId, userId })));
}

async function withDb(run: (database: TestDatabase, db: Db) => Promise<void>) {
  const { db, close } = await createPgliteDb();
  try {
    await run(db, db as unknown as Db);
  } finally {
    await close();
  }
}

describe("football Team invites", () => {
  it("holds several unused invites at once and refuses past the budget", async () => {
    await withDb(async (database, db) => {
      const ids = await makeUsers(database, 26);
      const [creator, ...others] = ids as [string, ...string[]];
      const teamId = await makeTeam(database, { id: creator }, "football");

      for (const inviteeUserId of others.slice(0, 5)) {
        await inviteInApp(db, { teamId, userId: creator, inviteeUserId });
      }
      const live = await database.query.teamMemberInvites.findMany({
        where: and(
          eq(teamMemberInvites.teamId, teamId),
          isNull(teamMemberInvites.acceptedAt),
        ),
      });
      expect(live).toHaveLength(5);

      await addMembers(database, teamId, others.slice(5, 24));
      await expect(
        inviteInApp(db, {
          teamId,
          userId: creator,
          inviteeUserId: others[24]!,
        }),
      ).rejects.toThrow("Revoke the unused invite before sending a new one");

      await database
        .update(teamMemberInvites)
        .set({ revokedAt: new Date() })
        .where(eq(teamMemberInvites.userId, others[0]!));
      await inviteInApp(db, {
        teamId,
        userId: creator,
        inviteeUserId: others[24]!,
      });
    });
  });

  it("refuses a repeat invite to the same User", async () => {
    await withDb(async (database, db) => {
      const [creator, invitee] = (await makeUsers(database, 2)) as [
        string,
        string,
      ];
      const teamId = await makeTeam(database, { id: creator }, "football");
      await inviteInApp(db, {
        teamId,
        userId: creator,
        inviteeUserId: invitee,
      });
      await expect(
        inviteInApp(db, { teamId, userId: creator, inviteeUserId: invitee }),
      ).rejects.toThrow("An unused Lookup invite already exists");
    });
  });

  it("keeps other doors live after an accept until the Team is full", async () => {
    await withDb(async (database, db) => {
      const ids = await makeUsers(database, 4);
      const [creator, a, b, c] = ids as [string, string, string, string];
      const teamId = await makeTeam(database, { id: creator }, "football");
      await inviteInApp(db, { teamId, userId: creator, inviteeUserId: a });
      await inviteInApp(db, { teamId, userId: creator, inviteeUserId: b });
      const link = await createInviteLink(db, {
        teamId,
        userId: creator,
        origin: "https://temba.test",
      });
      const invite = await database.query.teamMemberInvites.findFirst({
        where: eq(teamMemberInvites.userId, a),
      });

      await acceptInAppInvite(db, { inviteId: invite!.id, userId: a });

      const stillUnused = await database.query.teamMemberInvites.findFirst({
        where: and(
          eq(teamMemberInvites.userId, b),
          isNull(teamMemberInvites.acceptedAt),
          isNull(teamMemberInvites.revokedAt),
        ),
      });
      expect(stillUnused).toBeDefined();
      const token = link.inviteUrl.split("/").pop()!;
      await acceptInviteLink(db, { token, userId: c });
      expect(
        (await teamById(db, { teamId, userId: creator })).roster.count,
      ).toBe(3);
    });
  });

  it("refuses an accept when the Team is full", async () => {
    await withDb(async (database, db) => {
      const ids = await makeUsers(database, 26);
      const [creator, ...others] = ids as [string, ...string[]];
      const teamId = await makeTeam(database, { id: creator }, "football");
      const link = await createInviteLink(db, {
        teamId,
        userId: creator,
        origin: "https://temba.test",
      });
      await inviteInApp(db, {
        teamId,
        userId: creator,
        inviteeUserId: others[24]!,
      });
      await addMembers(database, teamId, others.slice(0, 24));

      const invite = await database.query.teamMemberInvites.findFirst({
        where: eq(teamMemberInvites.userId, others[24]!),
      });
      const full = await teamById(db, { teamId, userId: creator });
      expect(full.roster).toMatchObject({ count: 25, full: true });
      await expect(
        acceptInAppInvite(db, { inviteId: invite!.id, userId: others[24]! }),
      ).rejects.toThrow("This Team is full");
      await expect(
        acceptInviteLink(db, {
          token: link.inviteUrl.split("/").pop()!,
          userId: others[24]!,
        }),
      ).rejects.toThrow("This Team is full");
      await expect(
        inviteInApp(db, {
          teamId,
          userId: creator,
          inviteeUserId: others[24]!,
        }),
      ).rejects.toThrow("This Team is full");
    });
  });

  it("lets the same pair sit together in two football Teams", async () => {
    await withDb(async (database, db) => {
      const [creator, partner] = (await makeUsers(database, 2)) as [
        string,
        string,
      ];
      const first = await makeTeam(database, { id: creator }, "football");
      const second = await makeTeam(database, { id: creator }, "football");

      for (const teamId of [first, second]) {
        await inviteInApp(db, {
          teamId,
          userId: creator,
          inviteeUserId: partner,
        });
        const invite = await database.query.teamMemberInvites.findFirst({
          where: and(
            eq(teamMemberInvites.teamId, teamId),
            eq(teamMemberInvites.userId, partner),
          ),
        });
        await acceptInAppInvite(db, { inviteId: invite!.id, userId: partner });
      }

      expect(
        (await teamById(db, { teamId: second, userId: creator })).roster.count,
      ).toBe(2);
    });
  });
});

describe("padel Team invites", () => {
  it("keeps one open seat, a full message and a reserved pair", async () => {
    await withDb(async (database, db) => {
      const [creator, a, b] = (await makeUsers(database, 3)) as [
        string,
        string,
        string,
      ];
      const teamId = await makeTeam(database, { id: creator }, "padel");
      await inviteInApp(db, { teamId, userId: creator, inviteeUserId: a });
      await expect(
        inviteInApp(db, { teamId, userId: creator, inviteeUserId: b }),
      ).rejects.toThrow("Revoke the unused invite before sending a new one");

      const invite = await database.query.teamMemberInvites.findFirst({
        where: eq(teamMemberInvites.userId, a),
      });
      await acceptInAppInvite(db, { inviteId: invite!.id, userId: a });
      await expect(
        inviteInApp(db, { teamId, userId: creator, inviteeUserId: b }),
      ).rejects.toThrow("This Team is full");

      const other = await makeTeam(database, { id: creator }, "padel");
      await expect(
        inviteInApp(db, { teamId: other, userId: creator, inviteeUserId: a }),
      ).rejects.toThrow("This pair already has a Team or a pending invite");
    });
  });

  it("builds the padel incomplete flag from the rule", async () => {
    await withDb(async (database, db) => {
      const [creator, a] = (await makeUsers(database, 2)) as [string, string];
      const teamId = await makeTeam(database, { id: creator }, "padel");
      expect((await mine(db, { userId: creator }))[0]!.incomplete).toBe(true);
      await addMembers(database, teamId, [a]);
      expect((await mine(db, { userId: creator }))[0]!.incomplete).toBe(false);
      const view = await teamById(db, { teamId, userId: a });
      expect(view.roster).toEqual({
        min: 2,
        max: 2,
        completeAt: 2,
        count: 2,
        complete: true,
        full: true,
      });
      expect(view.viewerCanLeave).toBe(false);
    });
  });
});

describe("teams.leave", () => {
  it("lets a football member leave and keeps a linked Team linked below complete", async () => {
    await withDb(async (database, db) => {
      const ids = await makeUsers(database, 5);
      const [creator, ...others] = ids as [string, ...string[]];
      const teamId = await makeTeam(database, { id: creator }, "football");
      await addMembers(database, teamId, others);
      const [community] = await database
        .insert(communities)
        .values({ name: "Club", createdBy: creator })
        .returning({ id: communities.id });
      await database
        .insert(communitySports)
        .values({ communityId: community!.id, sport: "football" });
      await requestLink(db, {
        teamId,
        communityId: community!.id,
        userId: creator,
      });
      const { teams } = await import("@repo/db/schema");
      await database
        .update(teams)
        .set({ communityId: community!.id })
        .where(eq(teams.id, teamId));

      const before = await teamById(db, { teamId, userId: others[0]! });
      expect(before.viewerCanLeave).toBe(true);
      await leave(db, { teamId, userId: others[0]! });

      const after = await teamById(db, { teamId, userId: creator });
      expect(after.roster).toMatchObject({ count: 4, complete: false });
      expect(after.communityId).toBe(community!.id);
    });
  });

  it("refuses the creator", async () => {
    await withDb(async (database, db) => {
      const [creator, a] = (await makeUsers(database, 2)) as [string, string];
      const teamId = await makeTeam(database, { id: creator }, "football");
      await addMembers(database, teamId, [a]);
      await expect(leave(db, { teamId, userId: creator })).rejects.toThrow(
        "dissolve the Team instead",
      );
    });
  });

  it("refuses on a padel Team", async () => {
    await withDb(async (database, db) => {
      const [creator, a] = (await makeUsers(database, 2)) as [string, string];
      const teamId = await makeTeam(database, { id: creator }, "padel");
      await addMembers(database, teamId, [a]);
      await expect(leave(db, { teamId, userId: a })).rejects.toThrow(
        "Dissolve the Team instead",
      );
    });
  });

  it("refuses a non-member", async () => {
    await withDb(async (database, db) => {
      const [creator, outsider] = (await makeUsers(database, 2)) as [
        string,
        string,
      ];
      const teamId = await makeTeam(database, { id: creator }, "football");
      await expect(leave(db, { teamId, userId: outsider })).rejects.toThrow(
        "Only a Team member",
      );
    });
  });

  it("refuses while the linked Community is Soft-archived", async () => {
    await withDb(async (database, db) => {
      const [creator, a] = (await makeUsers(database, 2)) as [string, string];
      const teamId = await makeTeam(database, { id: creator }, "football");
      await addMembers(database, teamId, [a]);
      const [community] = await database
        .insert(communities)
        .values({ name: "Club", createdBy: creator, archivedAt: new Date() })
        .returning({ id: communities.id });
      const { teams } = await import("@repo/db/schema");
      await database
        .update(teams)
        .set({ communityId: community!.id })
        .where(eq(teams.id, teamId));

      await expect(leave(db, { teamId, userId: a })).rejects.toThrow(
        "archived Community",
      );
      expect((await teamById(db, { teamId, userId: a })).viewerCanLeave).toBe(
        false,
      );
    });
  });
});

describe("teams.dissolve on a football Team", () => {
  it("is for the creator only", async () => {
    await withDb(async (database, db) => {
      const ids = await makeUsers(database, 5);
      const [creator, ...others] = ids as [string, ...string[]];
      const teamId = await makeTeam(database, { id: creator }, "football");
      await addMembers(database, teamId, others);
      await expect(
        dissolve(db, { teamId, userId: others[0]! }),
      ).rejects.toThrow("Only the creator can dissolve this Team");
      await dissolve(db, { teamId, userId: creator });
    });
  });
});

describe("teams.requestLink", () => {
  async function setup(database: TestDatabase, members: number) {
    const ids = await makeUsers(database, members);
    const [creator, ...others] = ids as [string, ...string[]];
    const teamId = await makeTeam(database, { id: creator }, "football");
    await addMembers(database, teamId, others);
    const [community] = await database
      .insert(communities)
      .values({ name: "Club", createdBy: creator })
      .returning({ id: communities.id });
    await database
      .insert(communitySports)
      .values({ communityId: community!.id, sport: "football" });
    return { creator, teamId, communityId: community!.id };
  }

  it("is refused below five members", async () => {
    await withDb(async (database, db) => {
      const { creator, teamId, communityId } = await setup(database, 4);
      await expect(
        requestLink(db, { teamId, communityId, userId: creator }),
      ).rejects.toThrow("Incomplete Teams cannot request a Community link");
    });
  });

  it("is allowed at five members", async () => {
    await withDb(async (database, db) => {
      const { creator, teamId, communityId } = await setup(database, 5);
      const created = await requestLink(db, {
        teamId,
        communityId,
        userId: creator,
      });
      expect(created.status).toBe("pending");
    });
  });
});
