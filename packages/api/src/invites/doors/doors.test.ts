import {
  gameInviteLinks,
  gameMemberInvites,
  games,
  groupInviteLinks,
  groupMemberInvites,
  groupMembers,
  groups,
  matches,
  teams,
  user,
  venues,
  GameFormatEnum,
} from "@repo/db/schema";
import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  acceptLink,
  acceptLookup,
  findGameInviteLinkByShortCode,
  findGroupInviteLinkByShortCode,
  mintLink,
  mintLookup,
  previewLink,
} from "#src/invites/doors";
import { GAME_INVITE_SHORT_CODE_ALPHABET } from "#src/invites/tokens";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

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
          locale: "en",
        }),
      ).toEqual({ ok: false, reason: "seat_required" });

      const accepted = await acceptLookup(db, host, {
        inviteId: minted.invite.id,
        userId: invitee.id,
        seat: { sideIndex: 2, position: "right" },
        locale: "en",
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

  it("joins a Club Group through a Group Lookup invite accept and keeps the invite accepted", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "doors-group-owner@example.com");
      const invitee = await insertUser(db, "doors-group-invitee@example.com");
      const clubGroup = await insertClubGroup(db, owner.id);

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
        locale: "en",
      });
      expect(accepted).toEqual({
        ok: true,
        alreadyMember: false,
        hostId: clubGroup.id,
      });

      const membership = await db.query.groupMembers.findFirst({
        where: and(
          eq(groupMembers.groupId, clubGroup.id),
          eq(groupMembers.userId, invitee.id),
        ),
      });
      expect(membership).toBeDefined();
      const invite = await db.query.groupMemberInvites.findFirst({
        where: eq(groupMemberInvites.id, minted.invite.id),
      });
      expect(invite?.acceptedAt).toBeInstanceOf(Date);

      expect(
        await acceptLookup(db, host, {
          inviteId: minted.invite.id,
          userId: invitee.id,
          locale: "en",
        }),
      ).toEqual({ ok: false, reason: "unavailable" });
    } finally {
      await close();
    }
  });

  it("answers not_found for a deleted Group host and previews its Invite link as unavailable", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "doors-deleted-owner@example.com");
      const invitee = await insertUser(db, "doors-deleted-invitee@example.com");
      const group = await insertLooseGroup(db, owner.id);
      const host = { kind: "group" as const, id: group.id };
      const link = await mintLink(db, host, { createdBy: owner.id });
      expect(link.ok).toBe(true);
      if (!link.ok) {
        return;
      }

      await db
        .update(groups)
        .set({ deletedAt: new Date(), deletedBy: owner.id })
        .where(eq(groups.id, group.id));

      expect(await previewLink(db, "group", link.link.token)).toEqual({
        ok: true,
        status: "unavailable",
      });
      expect(
        await acceptLink(db, "group", {
          token: link.link.token,
          userId: invitee.id,
          locale: "en",
        }),
      ).toEqual({ ok: false, reason: "not_found" });
      expect(await mintLink(db, host, { createdBy: owner.id })).toEqual({
        ok: false,
        reason: "not_found",
      });
      expect(
        await mintLookup(db, host, { userId: invitee.id, invitedBy: owner.id }),
      ).toEqual({ ok: false, reason: "not_found" });

      const row = await db.query.groupInviteLinks.findFirst({
        where: eq(groupInviteLinks.token, link.link.token),
      });
      expect(row?.token).toBe(link.link.token);
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

  it("leaves Team Invite link mint on the long token path without a short code", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "doors-team-short@example.com");
      const [team] = await db
        .insert(teams)
        .values({
          name: "No Short Team",
          createdBy: owner.id,
        })
        .returning({ id: teams.id });
      if (!team) {
        throw new Error("Failed to insert team");
      }
      const minted = await mintLink(
        db,
        { kind: "team", id: team.id },
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

  it("mints a unique 8-character Group Invite short code on the same row as the token", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "doors-group-short-owner@example.com");
      const group = await insertLooseGroup(db, owner.id);
      const minted = await mintLink(
        db,
        { kind: "group", id: group.id },
        { createdBy: owner.id },
      );
      expect(minted.ok).toBe(true);
      if (!minted.ok) {
        return;
      }
      expect(minted.link.shortCode).toMatch(
        new RegExp(`^[${GAME_INVITE_SHORT_CODE_ALPHABET}]{8}$`),
      );
      expect(minted.link.shortCode).toBe(minted.link.shortCode?.toUpperCase());

      const row = await db.query.groupInviteLinks.findFirst({
        where: eq(groupInviteLinks.token, minted.link.token),
      });
      expect(row?.shortCode).toBe(minted.link.shortCode);
      expect(
        (
          await findGroupInviteLinkByShortCode(
            db,
            minted.link.shortCode!.toLowerCase(),
          )
        )?.token,
      ).toBe(minted.link.token);
      expect(
        await findGroupInviteLinkByShortCode(db, "0O1ILUAB"),
      ).toBeUndefined();
      expect(
        await findGroupInviteLinkByShortCode(db, "ZZZZZZZZ"),
      ).toBeUndefined();
    } finally {
      await close();
    }
  });

  it("recopies a new Group token and short code while older doors still admit until they expire", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(
        db,
        "doors-group-recopy-owner@example.com",
      );
      const invitee = await insertUser(
        db,
        "doors-group-recopy-invitee@example.com",
      );
      const group = await insertLooseGroup(db, owner.id);
      const host = { kind: "group" as const, id: group.id };
      const first = await mintLink(db, host, { createdBy: owner.id });
      const second = await mintLink(db, host, { createdBy: owner.id });
      expect(first.ok).toBe(true);
      expect(second.ok).toBe(true);
      if (!first.ok || !second.ok) {
        return;
      }
      expect(second.link.token).not.toBe(first.link.token);
      expect(second.link.shortCode).not.toBe(first.link.shortCode);

      expect(await previewLink(db, "group", first.link.token)).toMatchObject({
        ok: true,
        status: "ready",
      });
      expect(await previewLink(db, "group", second.link.token)).toMatchObject({
        ok: true,
        status: "ready",
      });

      const acceptedOld = await acceptLink(db, "group", {
        token: first.link.token,
        userId: invitee.id,
        locale: "en",
      });
      expect(acceptedOld).toMatchObject({ ok: true, hostId: group.id });
    } finally {
      await close();
    }
  });

  it("still admits a legacy Group Invite link row with a null short code on the token path", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "doors-group-legacy-code@example.com");
      const invitee = await insertUser(
        db,
        "doors-group-legacy-invitee@example.com",
      );
      const group = await insertLooseGroup(db, owner.id);
      const [legacy] = await db
        .insert(groupInviteLinks)
        .values({
          groupId: group.id,
          createdBy: owner.id,
          token: "legacy-group-token-without-short-code",
          shortCode: null,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        })
        .returning();
      if (!legacy) {
        throw new Error("Failed to insert legacy Group Invite link");
      }
      expect(legacy.shortCode).toBeNull();
      expect(await previewLink(db, "group", legacy.token)).toMatchObject({
        ok: true,
        status: "ready",
      });
      const accepted = await acceptLink(db, "group", {
        token: legacy.token,
        userId: invitee.id,
        locale: "en",
      });
      expect(accepted).toMatchObject({ ok: true, hostId: group.id });
    } finally {
      await close();
    }
  });

  it("recopies a new Game token and short code while older doors still admit", async () => {
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
        locale: "en",
      });
      expect(acceptedOld).toMatchObject({ ok: true, hostId: game.id });
    } finally {
      await close();
    }
  });

  it("ignores a stored expiry on a Game Invite link row", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "doors-stale-expiry@example.com");
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
      expect(minted.link.expiresAt).toBeNull();
      await db
        .update(gameInviteLinks)
        .set({ expiresAt: new Date(Date.now() - 1000) })
        .where(eq(gameInviteLinks.id, minted.link.id));

      expect(await previewLink(db, "game", minted.link.token)).toMatchObject({
        ok: true,
        status: "ready",
      });
      expect(
        (await findGameInviteLinkByShortCode(db, minted.link.shortCode!))
          ?.token,
      ).toBe(minted.link.token);
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
        locale: "en",
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

async function insertLooseGroup(
  database: TestDatabase,
  createdBy: string,
  name = "Loose Group",
) {
  const [group] = await database
    .insert(groups)
    .values({ name, createdBy })
    .returning({ id: groups.id });
  if (!group) {
    throw new Error("Failed to insert group");
  }
  return group;
}

async function insertClubGroup(database: TestDatabase, createdBy: string) {
  const [venue] = await database
    .insert(venues)
    .values({
      name: `Doors Club ${crypto.randomUUID()}`,
      city: "Lisbon",
      country: "PT",
    })
    .returning({ id: venues.id });
  if (!venue) {
    throw new Error("Failed to insert venue");
  }
  const [group] = await database
    .insert(groups)
    .values({ name: "Club Group", createdBy, venueId: venue.id })
    .returning({ id: groups.id });
  if (!group) {
    throw new Error("Failed to insert club group");
  }
  return group;
}

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
