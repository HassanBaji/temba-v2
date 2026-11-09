import { describe, expect, it } from "vitest";

import { teamMembers, user } from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { createTeam } from "./create";
import { inviteInApp } from "./inviteInApp";
import { pendingInvites } from "./pendingInvites";

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

describe("teams.pendingInvites", () => {
  it("lists the viewer's open invites with the Team's sport and Roster count", async () => {
    const { db: database, close } = await createPgliteDb();
    const db = database as unknown as Db;
    try {
      const [captain, mate, invitee] = (await makeUsers(database, 3)) as [
        string,
        string,
        string,
      ];
      const team = await createTeam(db, {
        name: "Thursday Crew",
        sport: "football",
        userId: captain,
        userName: "Captain",
      });
      await database
        .insert(teamMembers)
        .values({ teamId: team.id, userId: mate });
      await inviteInApp(db, {
        teamId: team.id,
        userId: captain,
        inviteeUserId: invitee,
      });

      expect(await pendingInvites(db, { userId: invitee })).toEqual([
        expect.objectContaining({
          teamId: team.id,
          displayName: "Thursday Crew",
          sport: "football",
          rosterCount: 2,
          invitedBy: expect.objectContaining({ id: captain }),
        }),
      ]);
      expect(await pendingInvites(db, { userId: mate })).toEqual([]);
    } finally {
      await close();
    }
  });
});
