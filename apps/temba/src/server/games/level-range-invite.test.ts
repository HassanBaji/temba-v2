import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  GameFormatEnum,
  GameLevelRangeRequestStatusEnum,
  GameRegistrationModeEnum,
  gameLevelRangeRequests,
  gamePlayers,
  games,
  gameWaitlist,
  matches,
  ratings,
  teamMembers,
  teams,
  user,
  venues,
} from "@repo/db/schema";

import type { GameRow } from "~/server/games/access";
import { acceptInviteLink } from "~/server/games/accept-invite-link";
import { acceptLookupInvite } from "~/server/games/accept-lookup-invite";
import { leaveGame } from "~/server/games/leave";
import {
  requestLevelRange,
  approveLevelRangeRequest,
} from "~/server/games/level-range-requests";
import { previewInviteLink } from "~/server/games/preview-invite-link";
import { registerSeat } from "~/server/games/register-seat";
import { revokeLookupInvite } from "~/server/games/revoke-lookup-invite";
import { sendLookupInvite } from "~/server/games/send-lookup-invite";
import { updateGameLevelRange } from "~/server/games/update-level-range";
import { mintLink } from "~/server/invites/doors";
import { loadGameInviteOpenGraph } from "~/server/invites/game-invite-open-graph";
import { createPgliteDb, type TestDatabase } from "~/server/test/pglite";
import { INITIAL_SIGMA, muFromLevel } from "~/server/ratings/level";
import { LEVEL_RANGE_OUTSIDE_MESSAGE } from "~/lib/level-range";

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

async function insertVenue(database: TestDatabase) {
  const [row] = await database
    .insert(venues)
    .values({
      name: `Venue ${crypto.randomUUID()}`,
      city: "Lisbon",
      country: "PT",
    })
    .returning({ id: venues.id, name: venues.name });
  if (!row) {
    throw new Error("Failed to insert venue");
  }
  return row;
}

async function insertGame(
  database: TestDatabase,
  args: {
    createdBy: string;
    venueId: string;
    registrationMode?: GameRow["registrationMode"];
    playersAllowed?: number;
    isPublic?: boolean;
    levelMinTenths?: number | null;
    levelMaxTenths?: number | null;
    cancelledAt?: Date | null;
  },
): Promise<GameRow> {
  const [row] = await database
    .insert(games)
    .values({
      format: GameFormatEnum.FRIENDLY_GAME,
      registrationMode:
        args.registrationMode ?? GameRegistrationModeEnum.INDIVIDUAL,
      venueId: args.venueId,
      createdBy: args.createdBy,
      playersAllowed: args.playersAllowed ?? 4,
      teamsAllowed: 2,
      isPublic: args.isPublic ?? true,
      levelMinTenths: args.levelMinTenths ?? null,
      levelMaxTenths: args.levelMaxTenths ?? null,
      cancelledAt: args.cancelledAt ?? null,
      windowEnd: new Date(Date.now() + 60 * 60 * 1000),
    })
    .returning();
  if (!row) {
    throw new Error("Failed to insert game");
  }
  await database.insert(matches).values({ gameId: row.id });
  return row;
}

async function insertRating(
  database: TestDatabase,
  userId: string,
  level: number,
) {
  await database.insert(ratings).values({
    userId,
    sport: "padel",
    mu: muFromLevel(level),
    phi: 50,
    sigma: INITIAL_SIGMA,
    levelBand: "C2",
  });
}

function expectForbidden(error: unknown, message: string) {
  expect(error).toBeInstanceOf(TRPCError);
  if (!(error instanceof TRPCError)) {
    return;
  }
  expect(error.code).toBe("FORBIDDEN");
  expect(error.message).toBe(message);
}

describe("Game Level range Lookup, Invite link, and promote", () => {
  it("upserts an approved waiver on Lookup send, still admits after accept, and keeps the waiver after revoke", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "lookup-owner@example.com");
      const invitee = await insertUser(db, "lookup-invitee@example.com");
      const other = await insertUser(db, "lookup-other@example.com");
      const venue = await insertVenue(db);
      await insertRating(db, invitee.id, 5.5);
      await insertRating(db, other.id, 5.8);
      const game = await insertGame(db, {
        createdBy: owner.id,
        venueId: venue.id,
        levelMinTenths: 30,
        levelMaxTenths: 45,
      });

      const sent = await sendLookupInvite(db, {
        gameId: game.id,
        userId: owner.id,
        userIds: [invitee.id],
      });
      expect(sent.refused).toEqual([]);
      expect(sent.sent).toHaveLength(1);
      const inviteId = sent.sent[0]?.id;
      if (!inviteId) {
        throw new Error("Expected Lookup invite");
      }

      const waiver = await db.query.gameLevelRangeRequests.findFirst({
        where: eq(gameLevelRangeRequests.userId, invitee.id),
      });
      expect(waiver?.status).toBe(GameLevelRangeRequestStatusEnum.APPROVED);
      expect(waiver?.decidedBy).toBe(owner.id);

      const accepted = await acceptLookupInvite(db, {
        inviteId,
        userId: invitee.id,
        sideIndex: 1,
        position: "left",
      });
      expect(accepted).toMatchObject({ ok: true, waitlisted: false });
      const seated = await db.query.gamePlayers.findFirst({
        where: eq(gamePlayers.userId, invitee.id),
      });
      expect(seated).toBeTruthy();

      const otherSent = await sendLookupInvite(db, {
        gameId: game.id,
        userId: owner.id,
        userIds: [other.id],
      });
      const otherInviteId = otherSent.sent[0]?.id;
      if (!otherInviteId) {
        throw new Error("Expected second Lookup invite");
      }
      await revokeLookupInvite(db, {
        inviteId: otherInviteId,
        userId: owner.id,
      });
      const kept = await db.query.gameLevelRangeRequests.findFirst({
        where: eq(gameLevelRangeRequests.userId, other.id),
      });
      expect(kept?.status).toBe(GameLevelRangeRequestStatusEnum.APPROVED);

      const otherSeat = await registerSeat(db, {
        gameId: game.id,
        userId: other.id,
        sideIndex: 1,
        position: "right",
      });
      expect(otherSeat).toEqual({ ok: true, waitlisted: false });
    } finally {
      await close();
    }
  });

  it("refuses Invite link accept without a waiver and lets preview request with inviteToken", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "link-owner@example.com");
      const invitee = await insertUser(db, "link-invitee@example.com");
      const venue = await insertVenue(db);
      await insertRating(db, invitee.id, 5.2);
      const game = await insertGame(db, {
        createdBy: owner.id,
        venueId: venue.id,
        isPublic: false,
        levelMinTenths: 30,
        levelMaxTenths: 45,
      });
      const minted = await mintLink(
        db,
        { kind: "game", id: game.id },
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
      expect(unsigned.needsSeatPick).toBe(true);
      expect(unsigned.levelMinTenths).toBe(30);
      expect(unsigned.viewerPassesLevelRange).toBeNull();

      const previewed = await previewInviteLink(db, {
        token: minted.link.token,
        userId: invitee.id,
      });
      expect(previewed.status).toBe("ready");
      if (previewed.status !== "ready") {
        return;
      }
      expect(previewed.needsSeatPick).toBe(false);
      expect(previewed.viewerPassesLevelRange).toBe(false);
      expect(previewed.canRequestLevelRange).toBe(true);

      try {
        await acceptInviteLink(db, {
          token: minted.link.token,
          userId: invitee.id,
          sideIndex: 1,
          position: "left",
        });
        throw new Error("expected Invite link Level refuse");
      } catch (error) {
        expectForbidden(error, LEVEL_RANGE_OUTSIDE_MESSAGE);
      }

      await expect(
        requestLevelRange(db, {
          gameId: game.id,
          userId: invitee.id,
        }),
      ).rejects.toBeInstanceOf(TRPCError);

      const requested = await requestLevelRange(db, {
        gameId: game.id,
        userId: invitee.id,
        inviteToken: minted.link.token,
      });
      expect(requested.status).toBe("pending");

      await approveLevelRangeRequest(db, {
        requestId: requested.id,
        userId: owner.id,
      });
      const afterWaiver = await acceptInviteLink(db, {
        token: minted.link.token,
        userId: invitee.id,
        sideIndex: 1,
        position: "left",
      });
      expect(afterWaiver.outcome).toBe("registered");
    } finally {
      await close();
    }
  });

  it("refuses a team-only Invite clicker who fails the Level helper", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "team-link-owner@example.com");
      const clicker = await insertUser(db, "team-link-clicker@example.com");
      const partner = await insertUser(db, "team-link-partner@example.com");
      const venue = await insertVenue(db);
      await insertRating(db, clicker.id, 5.5);
      await insertRating(db, partner.id, 4.0);
      const game = await insertGame(db, {
        createdBy: owner.id,
        venueId: venue.id,
        registrationMode: GameRegistrationModeEnum.TEAM_ONLY,
        levelMinTenths: 30,
        levelMaxTenths: 45,
      });
      const [team] = await db
        .insert(teams)
        .values({ createdBy: clicker.id, name: "Invite Team" })
        .returning({ id: teams.id });
      if (!team) {
        throw new Error("Failed to insert team");
      }
      await db.insert(teamMembers).values([
        { teamId: team.id, userId: clicker.id },
        { teamId: team.id, userId: partner.id },
      ]);
      const minted = await mintLink(
        db,
        { kind: "game", id: game.id },
        { createdBy: owner.id },
      );
      expect(minted.ok).toBe(true);
      if (!minted.ok) {
        return;
      }
      try {
        await acceptInviteLink(db, {
          token: minted.link.token,
          userId: clicker.id,
        });
        throw new Error("expected team Invite clicker refuse");
      } catch (error) {
        expectForbidden(error, LEVEL_RANGE_OUTSIDE_MESSAGE);
      }
    } finally {
      await close();
    }
  });

  it("promotes a waitlisted User after the range tightens and re-checks after leave", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "promo-owner@example.com");
      const seated = await insertUser(db, "promo-seated@example.com");
      const waiting = await insertUser(db, "promo-wait@example.com");
      const venue = await insertVenue(db);
      await insertRating(db, seated.id, 4.0);
      await insertRating(db, waiting.id, 4.2);
      const game = await insertGame(db, {
        createdBy: owner.id,
        venueId: venue.id,
        playersAllowed: 1,
        levelMinTenths: 30,
        levelMaxTenths: 70,
      });

      await registerSeat(db, {
        gameId: game.id,
        userId: seated.id,
        sideIndex: 1,
        position: "left",
      });
      const waitlisted = await registerSeat(db, {
        gameId: game.id,
        userId: waiting.id,
      });
      expect(waitlisted).toEqual({ ok: true, waitlisted: true });

      await updateGameLevelRange(db, {
        gameId: game.id,
        userId: owner.id,
        levelMinTenths: 50,
        levelMaxTenths: 70,
      });

      const stillSeated = await db.query.gamePlayers.findFirst({
        where: eq(gamePlayers.userId, seated.id),
      });
      expect(stillSeated).toBeTruthy();
      const stillWaiting = await db.query.gameWaitlist.findFirst({
        where: eq(gameWaitlist.userId, waiting.id),
      });
      expect(stillWaiting).toBeTruthy();

      await leaveGame(db, { gameId: game.id, userId: seated.id });
      const promoted = await db.query.gamePlayers.findFirst({
        where: eq(gamePlayers.userId, waiting.id),
      });
      expect(promoted).toBeTruthy();

      await leaveGame(db, { gameId: game.id, userId: waiting.id });
      try {
        await registerSeat(db, {
          gameId: game.id,
          userId: waiting.id,
          sideIndex: 1,
          position: "left",
        });
        throw new Error("expected re-register after leave to refuse");
      } catch (error) {
        expectForbidden(error, LEVEL_RANGE_OUTSIDE_MESSAGE);
      }
    } finally {
      await close();
    }
  });

  it("appends the Game Level range to Invite Open Graph without User Levels", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "og-range-owner@example.com");
      const venue = await insertVenue(db);
      const windowStart = new Date(Date.now() + 60 * 60 * 1000);
      const windowEnd = new Date(windowStart.getTime() + 60 * 60 * 1000);
      const [game] = await db
        .insert(games)
        .values({
          format: GameFormatEnum.FRIENDLY_GAME,
          venueId: venue.id,
          createdBy: owner.id,
          playersAllowed: 4,
          windowStart,
          windowEnd,
          levelMinTenths: 30,
          levelMaxTenths: 45,
        })
        .returning();
      if (!game) {
        throw new Error("Failed to insert game");
      }
      await db.insert(matches).values({ gameId: game.id });
      const minted = await mintLink(
        db,
        { kind: "game", id: game.id },
        { createdBy: owner.id },
      );
      expect(minted.ok).toBe(true);
      if (!minted.ok) {
        return;
      }
      const fields = await loadGameInviteOpenGraph(db, minted.link.shortCode!);
      expect(fields.description).toContain("Level C2–B3");
      expect(fields.description).not.toMatch(/og-range-owner|5\.2/);
    } finally {
      await close();
    }
  });
});
