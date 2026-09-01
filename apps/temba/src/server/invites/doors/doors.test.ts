import {
  communities,
  communityMemberInvites,
  communityMembers,
  CommunityRoleEnum,
  gameMemberInvites,
  games,
  groups,
  matches,
  user,
  venues,
  GameFormatEnum,
} from "@repo/db/schema";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { admit as admitCommunityMember } from "~/server/community-membership";
import {
  acceptLookup,
  mintLink,
  mintLookup,
  previewLink,
} from "~/server/invites/doors";
import { commit } from "~/server/soft-archive";
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

describe("Invite doors", () => {
  it("refuses Community mint and accept while Soft-archived and keeps the Lookup invite", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "doors-owner@example.com");
      const invitee = await insertUser(db, "doors-invitee@example.com");
      const [community] = await db
        .insert(communities)
        .values({
          name: "Doors Club",
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
        userId: invitee.id,
        invitedBy: owner.id,
      });
      expect(minted.ok).toBe(true);
      if (!minted.ok) {
        return;
      }

      await commit(db, { communityId: community.id }, "archived");

      expect(
        await mintLookup(db, host, {
          userId: (await insertUser(db, "doors-other@example.com")).id,
          invitedBy: owner.id,
        }),
      ).toEqual({ ok: false, reason: "frozen" });

      expect(
        await acceptLookup(db, host, {
          inviteId: minted.invite.id,
          userId: invitee.id,
        }),
      ).toEqual({ ok: false, reason: "frozen" });

      const unused = await db.query.communityMemberInvites.findFirst({
        where: eq(communityMemberInvites.id, minted.invite.id),
      });
      expect(unused?.acceptedAt).toBeNull();
      expect(unused?.revokedAt).toBeNull();

      const link = await mintLink(db, host, { createdBy: owner.id });
      expect(link).toEqual({ ok: false, reason: "frozen" });
    } finally {
      await close();
    }
  });

  it("requires a Position on Game accept and occupies through Game admit", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "doors-game-owner@example.com");
      const invitee = await insertUser(db, "doors-game-invitee@example.com");
      const [venue] = await db
        .insert(venues)
        .values({
          name: `Doors Venue ${crypto.randomUUID()}`,
          city: "Lisbon",
          country: "PT",
        })
        .returning({ id: venues.id });
      if (!venue) {
        throw new Error("Failed to insert venue");
      }
      const [game] = await db
        .insert(games)
        .values({
          format: GameFormatEnum.FRIENDLY_GAME,
          venueId: venue.id,
          createdBy: owner.id,
          playersAllowed: 4,
          windowEnd: new Date(Date.now() + 60 * 60 * 1000),
        })
        .returning();
      if (!game) {
        throw new Error("Failed to insert game");
      }
      await db.insert(matches).values({ gameId: game.id });

      const host = { kind: "game" as const, id: game.id };
      const minted = await mintLookup(db, host, {
        userId: invitee.id,
        invitedBy: owner.id,
      });
      expect(minted.ok).toBe(true);
      if (!minted.ok) {
        return;
      }

      expect(
        await acceptLookup(db, host, {
          inviteId: minted.invite.id,
          userId: invitee.id,
        }),
      ).toEqual({ ok: false, reason: "seat_required" });

      const accepted = await acceptLookup(db, host, {
        inviteId: minted.invite.id,
        userId: invitee.id,
        seat: { sideIndex: 2, position: "right" },
      });
      expect(accepted).toMatchObject({
        ok: true,
        waitlisted: false,
        hostId: game.id,
      });

      const invite = await db.query.gameMemberInvites.findFirst({
        where: eq(gameMemberInvites.id, minted.invite.id),
      });
      expect(invite?.acceptedAt).toBeInstanceOf(Date);

      const match = await db.query.matches.findFirst({
        where: eq(matches.gameId, game.id),
      });
      expect(match?.slot2GameTeamId).not.toBeNull();
      expect(match?.slot1GameTeamId).toBeNull();
    } finally {
      await close();
    }
  });

  it("auto-admits a Club Group invitee through Community membership", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "doors-group-owner@example.com");
      const invitee = await insertUser(db, "doors-group-invitee@example.com");
      const [community] = await db
        .insert(communities)
        .values({
          name: "Club",
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

      const host = { kind: "group" as const, id: clubGroup.id };
      const minted = await mintLookup(db, host, {
        userId: invitee.id,
        invitedBy: owner.id,
      });
      expect(minted.ok).toBe(true);
      if (!minted.ok) {
        return;
      }

      const accepted = await acceptLookup(db, host, {
        inviteId: minted.invite.id,
        userId: invitee.id,
      });
      expect(accepted).toMatchObject({ ok: true, alreadyMember: false });

      const membership = await db.query.communityMembers.findFirst({
        where: eq(communityMembers.userId, invitee.id),
      });
      expect(membership?.communityId).toBe(community.id);
      expect(membership?.role).toBe(CommunityRoleEnum.MEMBER);
    } finally {
      await close();
    }
  });

  it("previews an Invite link as unavailable after Soft-archive without deleting the token", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "doors-link-owner@example.com");
      const [community] = await db
        .insert(communities)
        .values({
          name: "Link Club",
          type: "private",
          createdBy: owner.id,
        })
        .returning({ id: communities.id });
      if (!community) {
        throw new Error("Failed to insert community");
      }
      const host = { kind: "community" as const, id: community.id };
      const minted = await mintLink(db, host, { createdBy: owner.id });
      expect(minted.ok).toBe(true);
      if (!minted.ok) {
        return;
      }

      await commit(db, { communityId: community.id }, "archived");
      expect(await previewLink(db, "community", minted.link.token)).toEqual({
        ok: true,
        status: "unavailable",
      });
    } finally {
      await close();
    }
  });
});
