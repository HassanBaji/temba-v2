import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { gamePlayers, games, groups, user, venues } from "@repo/db/schema";

import { PARTNER_REQUIRED_REFUSAL_MESSAGE } from "~/lib/tournament-rounds";
import { acceptInviteLink } from "~/server/api/routers/games/acceptInviteLink";
import { createInviteLink } from "~/server/api/routers/games/createInviteLink";
import { createTournament } from "~/server/api/routers/games/createTournament";
import { gameById } from "~/server/api/routers/games/byId";
import { previewInviteLink } from "~/server/api/routers/games/previewInviteLink";
import { registerWithPartner } from "~/server/api/routers/games/registerWithPartner";
import { mintLink } from "~/server/invites/doors";
import { createPgliteDb, type TestDatabase } from "~/server/test/pglite";

async function insertUser(
  database: TestDatabase,
  email: string,
  name?: string,
) {
  const [row] = await database
    .insert(user)
    .values({ name: name ?? email.split("@")[0] ?? "User", email })
    .returning({ id: user.id, name: user.name });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row;
}

async function insertVenue(database: TestDatabase) {
  const [row] = await database
    .insert(venues)
    .values({
      name: `Venue ${crypto.randomUUID()}`,
      city: "Lisbon",
      country: "PT",
    })
    .returning({ id: venues.id });
  if (!row) {
    throw new Error("Failed to insert venue");
  }
  return row;
}

async function insertGroup(database: TestDatabase, createdBy: string) {
  const [row] = await database
    .insert(groups)
    .values({ name: `Group ${crypto.randomUUID()}`, createdBy })
    .returning({ id: groups.id });
  if (!row) {
    throw new Error("Failed to insert group");
  }
  return row;
}

async function insertTournament(
  database: TestDatabase,
  args: { createdBy: string; venueId: string; allowSoloRegister?: boolean },
) {
  const group = await insertGroup(database, args.createdBy);
  const windowStart = new Date("2026-09-20T18:00:00");
  const windowEnd = new Date("2026-10-11T19:00:00");
  const created = await createTournament(database, {
    createdBy: args.createdBy,
    name: "Autumn Friendly",
    groupId: group.id,
    isPublic: true,
    allowSoloRegister: args.allowSoloRegister,
    teamCount: 4,
    poolCount: 1,
    venueId: args.venueId,
    matchMinutes: 45,
    windowStart,
    windowEnd: new Date(windowStart.getTime() + 24 * 60 * 60 * 1000),
  });
  // Legacy multi-week rows still schedule. Create refuses this window.
  await database
    .update(games)
    .set({ windowEnd })
    .where(eq(games.id, created.id));
  return { gameId: created.id, groupId: group.id };
}

describe("partner-required Invite link landing", () => {
  it("still mints a link, previews without a seat grid, and refuses to seat", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner-invite@example.com");
      const invitee = await insertUser(db, "invitee@example.com");
      const venue = await insertVenue(db);
      const created = await insertTournament(db, {
        createdBy: owner.id,
        venueId: venue.id,
        allowSoloRegister: false,
      });

      const mintedLink = await createInviteLink(db, {
        gameId: created.gameId,
        userId: owner.id,
        origin: "https://temba.test",
      });
      expect(mintedLink.inviteUrl.length).toBeGreaterThan(0);

      const minted = await mintLink(
        db,
        { kind: "game", id: created.gameId },
        { createdBy: owner.id },
      );
      expect(minted.ok).toBe(true);
      if (!minted.ok) {
        return;
      }

      const unsigned = await previewInviteLink(db, {
        token: minted.link.token,
      });
      expect(unsigned.status).toBe("ready");
      if (unsigned.status !== "ready") {
        return;
      }
      expect(unsigned.partnerRequiredJoin).toBe(true);
      expect(unsigned.needsSeatPick).toBe(false);
      expect(unsigned.sides).toEqual([]);
      expect(unsigned.vacantSeats).toEqual([]);

      const previewed = await previewInviteLink(db, {
        token: minted.link.token,
        userId: invitee.id,
      });
      expect(previewed.status).toBe("ready");
      if (previewed.status !== "ready") {
        return;
      }
      expect(previewed.partnerRequiredJoin).toBe(true);
      expect(previewed.needsSeatPick).toBe(false);
      expect(previewed.sides).toEqual([]);

      await expect(
        acceptInviteLink(db, {
          token: minted.link.token,
          userId: invitee.id,
        }),
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: PARTNER_REQUIRED_REFUSAL_MESSAGE,
      });
      await expect(
        acceptInviteLink(db, {
          token: minted.link.token,
          userId: invitee.id,
          sideIndex: 1,
          position: "left",
        }),
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: PARTNER_REQUIRED_REFUSAL_MESSAGE,
      });

      const seated = await db.query.gamePlayers.findMany({
        where: eq(gamePlayers.gameId, created.gameId),
      });
      expect(seated.some((row) => row.userId === invitee.id)).toBe(false);
    } finally {
      await close();
    }
  });

  it("hides waitlist and move on Game home", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner-home@example.com");
      const caller = await insertUser(db, "caller-home@example.com");
      const partner = await insertUser(db, "partner-home@example.com");
      const outsider = await insertUser(db, "outsider-home@example.com");
      const venue = await insertVenue(db);
      const created = await insertTournament(db, {
        createdBy: owner.id,
        venueId: venue.id,
        allowSoloRegister: false,
      });

      await registerWithPartner(db, {
        gameId: created.gameId,
        userId: caller.id,
        partnerUserId: partner.id,
        sideIndex: 1,
        position: "left",
      });

      const seated = await gameById(db, {
        gameId: created.gameId,
        userId: caller.id,
      });
      expect(seated.canMove).toBe(false);
      expect(seated.canWaitlist).toBe(false);

      const visitor = await gameById(db, {
        gameId: created.gameId,
        userId: outsider.id,
      });
      expect(visitor.canRegister).toBe(true);
      expect(visitor.canWaitlist).toBe(false);
      expect(visitor.canMove).toBe(false);
    } finally {
      await close();
    }
  });

  it("keeps seat-pick Invite accept on an allow-alone tournament", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner-alone@example.com");
      const invitee = await insertUser(db, "alone-invitee@example.com");
      const venue = await insertVenue(db);
      const created = await insertTournament(db, {
        createdBy: owner.id,
        venueId: venue.id,
        allowSoloRegister: true,
      });

      const minted = await mintLink(
        db,
        { kind: "game", id: created.gameId },
        { createdBy: owner.id },
      );
      expect(minted.ok).toBe(true);
      if (!minted.ok) {
        return;
      }

      const previewed = await previewInviteLink(db, {
        token: minted.link.token,
        userId: invitee.id,
      });
      expect(previewed.status).toBe("ready");
      if (previewed.status !== "ready") {
        return;
      }
      expect(previewed.partnerRequiredJoin).toBe(false);
      expect(previewed.needsSeatPick).toBe(true);
      expect(previewed.sides.length).toBeGreaterThan(0);

      const linked = await acceptInviteLink(db, {
        token: minted.link.token,
        userId: invitee.id,
        sideIndex: 1,
        position: "left",
      });
      expect(linked).toMatchObject({
        outcome: "registered",
        waitlisted: false,
      });
    } finally {
      await close();
    }
  });
});
