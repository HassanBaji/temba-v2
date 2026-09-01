import {
  communities,
  communityMemberInvites,
  communityMembers,
  CommunityRoleEnum,
  gameInviteLinks,
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
  acceptLink,
  acceptLookup,
  findGameInviteLinkByShortCode,
  mintLink,
  mintLookup,
  previewLink,
} from "~/server/invites/doors";
import { GAME_INVITE_SHORT_CODE_ALPHABET } from "~/server/invites/tokens";
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

  it("mints a unique 8-character Game Invite short code on the same row as the token", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "doors-short-owner@example.com");
      const game = await insertFriendlyGame(db, owner.id);
      const host = { kind: "game" as const, id: game.id };
      const minted = await mintLink(db, host, { createdBy: owner.id });
      expect(minted.ok).toBe(true);
      if (!minted.ok) {
        return;
      }
      expect(minted.link.shortCode).toMatch(
        new RegExp(`^[${GAME_INVITE_SHORT_CODE_ALPHABET}]{8}$`),
      );
      expect(minted.link.shortCode).toBe(minted.link.shortCode?.toUpperCase());

      const row = await db.query.gameInviteLinks.findFirst({
        where: eq(gameInviteLinks.token, minted.link.token),
      });
      expect(row?.shortCode).toBe(minted.link.shortCode);
      expect(row?.token).toBe(minted.link.token);
    } finally {
      await close();
    }
  });

  it("leaves Community Invite link mint on the long token path without a short code", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "doors-community-short@example.com");
      const [community] = await db
        .insert(communities)
        .values({
          name: "No Short Club",
          type: "private",
          createdBy: owner.id,
        })
        .returning({ id: communities.id });
      if (!community) {
        throw new Error("Failed to insert community");
      }
      const minted = await mintLink(
        db,
        { kind: "community", id: community.id },
        { createdBy: owner.id },
      );
      expect(minted.ok).toBe(true);
      if (!minted.ok) {
        return;
      }
      expect(minted.link.shortCode).toBeUndefined();
      expect(minted.link.token.length).toBeGreaterThan(8);
    } finally {
      await close();
    }
  });

  it("recopies a new token and short code while older doors still admit until they expire", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "doors-recopy-owner@example.com");
      const invitee = await insertUser(db, "doors-recopy-invitee@example.com");
      const game = await insertFriendlyGame(db, owner.id);
      const host = { kind: "game" as const, id: game.id };
      const first = await mintLink(db, host, { createdBy: owner.id });
      const second = await mintLink(db, host, { createdBy: owner.id });
      expect(first.ok).toBe(true);
      expect(second.ok).toBe(true);
      if (!first.ok || !second.ok) {
        return;
      }
      expect(second.link.token).not.toBe(first.link.token);
      expect(second.link.shortCode).not.toBe(first.link.shortCode);

      expect(await previewLink(db, "game", first.link.token)).toMatchObject({
        ok: true,
        status: "ready",
      });
      expect(await previewLink(db, "game", second.link.token)).toMatchObject({
        ok: true,
        status: "ready",
      });

      const firstByCode = await findGameInviteLinkByShortCode(
        db,
        first.link.shortCode!.toLowerCase(),
      );
      const secondByCode = await findGameInviteLinkByShortCode(
        db,
        second.link.shortCode!,
      );
      expect(firstByCode?.token).toBe(first.link.token);
      expect(secondByCode?.token).toBe(second.link.token);

      const acceptedOld = await acceptLink(db, "game", {
        token: first.link.token,
        userId: invitee.id,
        seat: { sideIndex: 1, position: "left" },
      });
      expect(acceptedOld).toMatchObject({ ok: true, hostId: game.id });
    } finally {
      await close();
    }
  });

  it("keeps expired short codes on their row and treats them as a dead Invite", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "doors-expired-code@example.com");
      const game = await insertFriendlyGame(db, owner.id);
      const host = { kind: "game" as const, id: game.id };
      const minted = await mintLink(db, host, { createdBy: owner.id });
      expect(minted.ok).toBe(true);
      if (!minted.ok) {
        return;
      }
      await db
        .update(gameInviteLinks)
        .set({ expiresAt: new Date(Date.now() - 1000) })
        .where(eq(gameInviteLinks.id, minted.link.id));

      const newer = await mintLink(db, host, { createdBy: owner.id });
      expect(newer.ok).toBe(true);
      if (!newer.ok) {
        return;
      }
      expect(newer.link.shortCode).not.toBe(minted.link.shortCode);

      const expiredRow = await db.query.gameInviteLinks.findFirst({
        where: eq(gameInviteLinks.id, minted.link.id),
      });
      expect(expiredRow?.shortCode).toBe(minted.link.shortCode);
      expect(await previewLink(db, "game", minted.link.token)).toEqual({
        ok: true,
        status: "invalid",
      });
      expect(
        (await findGameInviteLinkByShortCode(db, minted.link.shortCode!))
          ?.token,
      ).toBe(minted.link.token);
      expect(await previewLink(db, "game", newer.link.token)).toMatchObject({
        ok: true,
        status: "ready",
      });
    } finally {
      await close();
    }
  });

  it("still admits a legacy Game Invite link row with a null short code on the token path", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "doors-legacy-code@example.com");
      const invitee = await insertUser(db, "doors-legacy-invitee@example.com");
      const game = await insertFriendlyGame(db, owner.id);
      const [legacy] = await db
        .insert(gameInviteLinks)
        .values({
          gameId: game.id,
          createdBy: owner.id,
          token: "legacy-token-without-short-code",
          shortCode: null,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        })
        .returning();
      if (!legacy) {
        throw new Error("Failed to insert legacy Invite link");
      }
      expect(legacy.shortCode).toBeNull();
      expect(await previewLink(db, "game", legacy.token)).toMatchObject({
        ok: true,
        status: "ready",
      });
      const accepted = await acceptLink(db, "game", {
        token: legacy.token,
        userId: invitee.id,
        seat: { sideIndex: 1, position: "right" },
      });
      expect(accepted).toMatchObject({ ok: true, hostId: game.id });
      expect(
        await findGameInviteLinkByShortCode(db, "23456789"),
      ).toBeUndefined();
    } finally {
      await close();
    }
  });

  it("rejects short codes outside the alphabet and unknown codes without resolving another Game", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "doors-invalid-code@example.com");
      const game = await insertFriendlyGame(db, owner.id);
      const minted = await mintLink(
        db,
        { kind: "game", id: game.id },
        { createdBy: owner.id },
      );
      expect(minted.ok).toBe(true);
      if (!minted.ok) {
        return;
      }
      expect(
        await findGameInviteLinkByShortCode(db, "0O1ILUAB"),
      ).toBeUndefined();
      expect(await findGameInviteLinkByShortCode(db, "ABC")).toBeUndefined();
      expect(
        await findGameInviteLinkByShortCode(db, "ZZZZZZZZ"),
      ).toBeUndefined();
      expect(
        (await findGameInviteLinkByShortCode(db, minted.link.shortCode!))
          ?.gameId,
      ).toBe(game.id);
    } finally {
      await close();
    }
  });
});

async function insertFriendlyGame(database: TestDatabase, createdBy: string) {
  const [venue] = await database
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
  const [game] = await database
    .insert(games)
    .values({
      format: GameFormatEnum.FRIENDLY_GAME,
      venueId: venue.id,
      createdBy,
      playersAllowed: 4,
      windowEnd: new Date(Date.now() + 60 * 60 * 1000),
    })
    .returning();
  if (!game) {
    throw new Error("Failed to insert game");
  }
  await database.insert(matches).values({ gameId: game.id });
  return game;
}
