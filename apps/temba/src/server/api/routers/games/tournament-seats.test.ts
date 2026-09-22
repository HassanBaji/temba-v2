import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  GameFormatEnum,
  GameRegistrationModeEnum,
  GameSportEnum,
  gamePlayers,
  gameTeamPlayers,
  gameTeams,
  gameWaitlist,
  games,
  groups,
  ratings,
  user,
  venues,
} from "@repo/db/schema";

import { vacantJoinSeats } from "~/lib/friendly-game-cta";
import { gameSummaryPrimaryAction } from "~/lib/game-summary-cta";
import {
  tournamentFieldSummary,
  tournamentStatusLine,
  tournamentTeamRows,
  tournamentTeamsCountLine,
} from "~/lib/tournament-home";
import { tournamentStartOwnSeat } from "~/lib/tournament-join";
import { acceptInviteLink } from "~/server/api/routers/games/acceptInviteLink";
import { acceptLookupInvite } from "~/server/api/routers/games/acceptLookupInvite";
import { gameById } from "~/server/api/routers/games/byId";
import { createTournament } from "~/server/api/routers/games/createTournament";
import { leaveGame } from "~/server/api/routers/games/leave";
import { moveSeat } from "~/server/api/routers/games/moveSeat";
import { registerSeat } from "~/server/api/routers/games/registerSeat";
import { registerWithPartner } from "~/server/api/routers/games/registerWithPartner";
import { requestLevelRange } from "~/server/api/routers/games/requestLevelRange";
import { sendLookupInvite } from "~/server/api/routers/games/sendLookupInvite";
import { mintLink } from "~/server/invites/doors";
import { createPgliteDb, type TestDatabase } from "~/server/test/pglite";
import { INITIAL_SIGMA, muFromLevel } from "~/server/ratings/level";
import { LEVEL_RANGE_OUTSIDE_MESSAGE } from "~/lib/level-range";

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

async function insertTwelveTeamTournament(
  database: TestDatabase,
  args: {
    createdBy: string;
    venueId: string;
    isPublic?: boolean;
    levelMinTenths?: number | null;
    levelMaxTenths?: number | null;
  },
) {
  const group = await insertGroup(database, args.createdBy);
  const windowStart = new Date("2026-09-20T18:00:00");
  const windowEnd = new Date("2026-10-11T19:00:00");
  const created = await createTournament(database, {
    createdBy: args.createdBy,
    name: "Autumn Friendly",
    groupId: group.id,
    isPublic: args.isPublic ?? true,
    registrationMode: "individual",
    teamCount: 12,
    poolCount: 3,
    venueId: args.venueId,
    matchMinutes: 45,
    windowStart,
    windowEnd: new Date(windowStart.getTime() + 24 * 60 * 60 * 1000),
    levelMinTenths: args.levelMinTenths,
    levelMaxTenths: args.levelMaxTenths,
  });
  // Legacy multi-week rows still schedule. Create refuses this window.
  await database
    .update(games)
    .set({ windowEnd })
    .where(eq(games.id, created.id));
  return { gameId: created.id, groupId: group.id, windowStart, windowEnd };
}

function occupantUserId(
  side: { left: { userId: string } | null; right: { userId: string } | null },
  position: "left" | "right",
) {
  return side[position]?.userId ?? null;
}

describe("Friendly tournament seats at 12 Game teams", () => {
  it("shows 12 sides, occupancy, and Round window before anyone joins", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner-open@example.com");
      const venue = await insertVenue(db);
      const created = await insertTwelveTeamTournament(db, {
        createdBy: owner.id,
        venueId: venue.id,
      });

      const detail = await gameById(db, {
        gameId: created.gameId,
        userId: owner.id,
      });

      expect(detail.format).toBe("friendly_tournament");
      expect(detail.poolCount).toBe(3);
      expect(detail.teamsAllowed).toBe(12);
      expect(detail.playersAllowed).toBe(24);
      expect(detail.registeredUserCount).toBe(0);
      expect(detail.sides).toHaveLength(12);
      expect(
        detail.sides.every((side) => side.left == null && side.right == null),
      ).toBe(true);
      expect(detail.windowStart).toEqual(created.windowStart);
      expect(detail.windowEnd).toEqual(created.windowEnd);
      expect(detail.registrationStatus).toBe("open");
      expect(detail.canRegister).toBe(true);

      const player = await insertUser(db, "joiner-open@example.com");
      const joiner = await gameById(db, {
        gameId: created.gameId,
        userId: player.id,
      });
      const field = tournamentFieldSummary(joiner.sides);
      const countLine = tournamentTeamsCountLine(field.full, field.halfOpen);
      const statusLine = tournamentStatusLine({
        seated: false,
        seatsLeft:
          Math.max(field.seatTotal, joiner.playersAllowed ?? 0) -
          field.seatsTaken,
        teamCount: joiner.teamsAllowed ?? joiner.sides.length,
        organizerName: null,
      });

      expect(joiner.registeredTeamCount).toBe(0);
      expect(joiner.registrationStatus).toBe("open");
      expect(joiner.canRegister).toBe(true);
      expect(joiner.canWaitlist).toBe(false);
      expect(countLine).toBe("");
      expect(statusLine.startsWith("No seats left.")).toBe(false);
      expect(vacantJoinSeats(joiner.sides).length).toBeGreaterThan(0);
      expect(tournamentStartOwnSeat(joiner.sides, null, null)).not.toBeNull();
      expect(
        gameSummaryPrimaryAction({
          format: joiner.format,
          registrationMode: joiner.registrationMode,
          canRegister: joiner.canRegister,
          canWaitlist: joiner.canWaitlist,
          joinFrozen: joiner.joinFrozen,
          isRegistered: joiner.isRegistered,
          isSeated: joiner.isSeated,
          isWaitlisted: joiner.isWaitlisted,
          registrationStatus: joiner.registrationStatus,
        }),
      ).not.toBe("join_waitlist");

      const seated = await registerSeat(db, {
        gameId: created.gameId,
        userId: player.id,
        sideIndex: 1,
        position: "left",
      });
      expect(seated).toEqual({ ok: true, waitlisted: false });
    } finally {
      await close();
    }
  });

  it("lets a User start a Game team on a fully vacant side, including side 12", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner-vacant@example.com");
      const player = await insertUser(db, "starter@example.com", "Ada");
      const venue = await insertVenue(db);
      const created = await insertTwelveTeamTournament(db, {
        createdBy: owner.id,
        venueId: venue.id,
      });

      const seated = await registerSeat(db, {
        gameId: created.gameId,
        userId: player.id,
        sideIndex: 12,
        position: "left",
      });
      expect(seated).toEqual({ ok: true, waitlisted: false });

      const detail = await gameById(db, {
        gameId: created.gameId,
        userId: player.id,
      });
      expect(detail.isSeated).toBe(true);
      expect(detail.registeredUserCount).toBe(1);
      const side12 = detail.sides.find((side) => side.sideIndex === 12);
      expect(occupantUserId(side12!, "left")).toBe(player.id);
      expect(occupantUserId(side12!, "right")).toBeNull();
      expect(side12?.left?.name).toBe("Ada");
    } finally {
      await close();
    }
  });

  it("lets a User take the remaining Position beside someone already seated", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner-beside@example.com");
      const first = await insertUser(db, "first-beside@example.com", "Sofia");
      const second = await insertUser(db, "second-beside@example.com", "Jonas");
      const venue = await insertVenue(db);
      await insertRating(db, first.id, 3.2);
      const created = await insertTwelveTeamTournament(db, {
        createdBy: owner.id,
        venueId: venue.id,
      });

      await registerSeat(db, {
        gameId: created.gameId,
        userId: first.id,
        sideIndex: 7,
        position: "left",
      });
      await registerSeat(db, {
        gameId: created.gameId,
        userId: second.id,
        sideIndex: 7,
        position: "right",
      });

      const detail = await gameById(db, {
        gameId: created.gameId,
        userId: second.id,
      });
      const side7 = detail.sides.find((side) => side.sideIndex === 7);
      expect(occupantUserId(side7!, "left")).toBe(first.id);
      expect(occupantUserId(side7!, "right")).toBe(second.id);
      expect(side7?.left?.name).toBe("Sofia");
      expect(side7?.left?.levelBand).toBe("C2");
      expect(side7?.right?.name).toBe("Jonas");
    } finally {
      await close();
    }
  });

  it("refuses a second seat for a User already seated", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner-second@example.com");
      const player = await insertUser(db, "already-in@example.com");
      const venue = await insertVenue(db);
      const created = await insertTwelveTeamTournament(db, {
        createdBy: owner.id,
        venueId: venue.id,
      });

      await registerSeat(db, {
        gameId: created.gameId,
        userId: player.id,
        sideIndex: 1,
        position: "left",
      });

      try {
        await registerSeat(db, {
          gameId: created.gameId,
          userId: player.id,
          sideIndex: 2,
          position: "left",
        });
        throw new Error("expected a second seat to be refused");
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        if (!(error instanceof TRPCError)) {
          return;
        }
        expect(error.code).toBe("CONFLICT");
        expect(error.message).toBe("You are already registered on this Game");
      }
    } finally {
      await close();
    }
  });

  it("registers a partner onto both Positions of a vacant side without asking the partner", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner-pair@example.com");
      const caller = await insertUser(db, "caller-pair@example.com", "Ada");
      const partner = await insertUser(db, "partner-pair@example.com", "Sofia");
      const venue = await insertVenue(db);
      const created = await insertTwelveTeamTournament(db, {
        createdBy: owner.id,
        venueId: venue.id,
      });

      const result = await registerWithPartner(db, {
        gameId: created.gameId,
        userId: caller.id,
        partnerUserId: partner.id,
        sideIndex: 12,
        position: "left",
      });
      expect(result).toEqual({ ok: true, waitlisted: false });

      const callerView = await gameById(db, {
        gameId: created.gameId,
        userId: caller.id,
      });
      const partnerView = await gameById(db, {
        gameId: created.gameId,
        userId: partner.id,
      });
      expect(callerView.isSeated).toBe(true);
      expect(partnerView.isSeated).toBe(true);
      const side12 = callerView.sides.find((side) => side.sideIndex === 12);
      expect(occupantUserId(side12!, "left")).toBe(caller.id);
      expect(occupantUserId(side12!, "right")).toBe(partner.id);
    } finally {
      await close();
    }
  });

  it("frees only the leaver's Position and leaves the partner seated", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner-leave@example.com");
      const caller = await insertUser(db, "caller-leave@example.com", "Ada");
      const partner = await insertUser(
        db,
        "partner-leave@example.com",
        "Sofia",
      );
      const venue = await insertVenue(db);
      const created = await insertTwelveTeamTournament(db, {
        createdBy: owner.id,
        venueId: venue.id,
      });

      await registerWithPartner(db, {
        gameId: created.gameId,
        userId: caller.id,
        partnerUserId: partner.id,
        sideIndex: 5,
        position: "left",
      });

      const before = await gameById(db, {
        gameId: created.gameId,
        userId: caller.id,
      });
      const teamId = before.sides.find(
        (side) => side.sideIndex === 5,
      )?.gameTeamId;
      expect(teamId).toBeTruthy();

      await leaveGame(db, { gameId: created.gameId, userId: caller.id });

      const remainingLinks = await db.query.gameTeamPlayers.findMany({
        where: eq(gameTeamPlayers.gameTeamId, teamId!),
      });
      expect(remainingLinks).toHaveLength(1);
      expect(remainingLinks[0]?.position).toBe("right");

      const team = await db.query.gameTeams.findFirst({
        where: eq(gameTeams.id, teamId!),
      });
      expect(team).toBeTruthy();

      const partnerView = await gameById(db, {
        gameId: created.gameId,
        userId: partner.id,
      });
      expect(partnerView.isSeated).toBe(true);
      const leftover = partnerView.sides.find((side) => side.sideIndex === 5);
      expect(occupantUserId(leftover!, "left")).toBeNull();
      expect(occupantUserId(leftover!, "right")).toBe(partner.id);

      const callerView = await gameById(db, {
        gameId: created.gameId,
        userId: caller.id,
      });
      expect(callerView.isSeated).toBe(false);
    } finally {
      await close();
    }
  });

  it("moves a seated User to a different vacant Position", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner-move@example.com");
      const player = await insertUser(db, "mover@example.com");
      const venue = await insertVenue(db);
      const created = await insertTwelveTeamTournament(db, {
        createdBy: owner.id,
        venueId: venue.id,
      });

      await registerSeat(db, {
        gameId: created.gameId,
        userId: player.id,
        sideIndex: 1,
        position: "left",
      });
      await moveSeat(db, {
        gameId: created.gameId,
        userId: player.id,
        sideIndex: 12,
        position: "right",
      });

      const detail = await gameById(db, {
        gameId: created.gameId,
        userId: player.id,
      });
      const side1 = detail.sides.find((side) => side.sideIndex === 1);
      const side12 = detail.sides.find((side) => side.sideIndex === 12);
      expect(occupantUserId(side1!, "left")).toBeNull();
      expect(occupantUserId(side12!, "right")).toBe(player.id);
    } finally {
      await close();
    }
  });

  it("waitlists a User on a full 12-team field and admits them when a seat frees", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner-wait@example.com");
      const venue = await insertVenue(db);
      const created = await insertTwelveTeamTournament(db, {
        createdBy: owner.id,
        venueId: venue.id,
      });

      const seated: { id: string }[] = [];
      for (let index = 0; index < 24; index += 1) {
        const person = await insertUser(db, `seat-${index}@example.com`);
        seated.push(person);
        const sideIndex = Math.floor(index / 2) + 1;
        const position = index % 2 === 0 ? "left" : "right";
        const result = await registerSeat(db, {
          gameId: created.gameId,
          userId: person.id,
          sideIndex,
          position,
        });
        expect(result.waitlisted).toBe(false);
      }

      const waiter = await insertUser(db, "waiter@example.com");
      const waitlisted = await registerSeat(db, {
        gameId: created.gameId,
        userId: waiter.id,
      });
      expect(waitlisted).toEqual({ ok: true, waitlisted: true });

      const waitRows = await db.query.gameWaitlist.findMany({
        where: eq(gameWaitlist.gameId, created.gameId),
      });
      expect(waitRows).toHaveLength(1);
      expect(waitRows[0]?.userId).toBe(waiter.id);

      const leaver = seated[23];
      if (!leaver) {
        throw new Error("expected a seated User to leave");
      }
      await leaveGame(db, { gameId: created.gameId, userId: leaver.id });

      const waiterView = await gameById(db, {
        gameId: created.gameId,
        userId: waiter.id,
      });
      expect(waiterView.isSeated).toBe(true);
      expect(waiterView.isWaitlisted).toBe(false);
      const side12 = waiterView.sides.find((side) => side.sideIndex === 12);
      expect(occupantUserId(side12!, "right")).toBe(waiter.id);

      const leftoverWait = await db.query.gameWaitlist.findMany({
        where: eq(gameWaitlist.gameId, created.gameId),
      });
      expect(leftoverWait).toHaveLength(0);

      const leaverStill = await db.query.gamePlayers.findFirst({
        where: eq(gamePlayers.userId, leaver.id),
      });
      expect(leaverStill).toBeUndefined();
    } finally {
      await close();
    }
  }, 60_000);

  it("admits Lookup invites and Invite links onto a vacant tournament Position", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner-invite@example.com");
      const lookupInvitee = await insertUser(db, "lookup-in@example.com");
      const linkInvitee = await insertUser(db, "link-in@example.com");
      const venue = await insertVenue(db);
      const created = await insertTwelveTeamTournament(db, {
        createdBy: owner.id,
        venueId: venue.id,
      });

      const sent = await sendLookupInvite(db, {
        gameId: created.gameId,
        userId: owner.id,
        userIds: [lookupInvitee.id],
      });
      expect(sent.refused).toEqual([]);
      const inviteId = sent.sent[0]?.id;
      if (!inviteId) {
        throw new Error("Expected Lookup invite");
      }

      const lookedUp = await acceptLookupInvite(db, {
        inviteId,
        userId: lookupInvitee.id,
        sideIndex: 12,
        position: "left",
      });
      expect(lookedUp).toMatchObject({ ok: true, waitlisted: false });

      const minted = await mintLink(
        db,
        { kind: "game", id: created.gameId },
        { createdBy: owner.id },
      );
      expect(minted.ok).toBe(true);
      if (!minted.ok) {
        return;
      }

      const linked = await acceptInviteLink(db, {
        token: minted.link.token,
        userId: linkInvitee.id,
        sideIndex: 12,
        position: "right",
      });
      expect(linked).toMatchObject({
        outcome: "registered",
        waitlisted: false,
      });

      const detail = await gameById(db, {
        gameId: created.gameId,
        userId: owner.id,
      });
      const side12 = detail.sides.find((side) => side.sideIndex === 12);
      expect(occupantUserId(side12!, "left")).toBe(lookupInvitee.id);
      expect(occupantUserId(side12!, "right")).toBe(linkInvitee.id);
    } finally {
      await close();
    }
  });

  it("gates seats by Game Level range and still accepts a Level range request", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner-range@example.com");
      const outsider = await insertUser(db, "outsider@example.com");
      const venue = await insertVenue(db);
      await insertRating(db, outsider.id, 5.5);
      const created = await insertTwelveTeamTournament(db, {
        createdBy: owner.id,
        venueId: venue.id,
        levelMinTenths: 20,
        levelMaxTenths: 40,
      });

      try {
        await registerSeat(db, {
          gameId: created.gameId,
          userId: outsider.id,
          sideIndex: 1,
          position: "left",
        });
        throw new Error("expected Level range to refuse the seat");
      } catch (error) {
        expect(error).toBeInstanceOf(TRPCError);
        if (!(error instanceof TRPCError)) {
          return;
        }
        expect(error.code).toBe("FORBIDDEN");
        expect(error.message).toBe(LEVEL_RANGE_OUTSIDE_MESSAGE);
      }

      const requested = await requestLevelRange(db, {
        gameId: created.gameId,
        userId: outsider.id,
      });
      expect(requested.status).toBe("pending");

      const detail = await gameById(db, {
        gameId: created.gameId,
        userId: outsider.id,
      });
      expect(detail.canRegister).toBe(false);
      expect(detail.levelRangeRequest?.status).toBe("pending");
    } finally {
      await close();
    }
  });
});

describe("Complete Teams tournament field", () => {
  it("lists vacant Game team sides so the Teams list is not empty", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const owner = await insertUser(db, "owner-teams@example.com");
      const venue = await insertVenue(db);
      const group = await insertGroup(db, owner.id);
      const [created] = await db
        .insert(games)
        .values({
          createdBy: owner.id,
          name: "Complete Teams Friendly",
          format: GameFormatEnum.FRIENDLY_TOURNAMENT,
          registrationMode: GameRegistrationModeEnum.TEAM_ONLY,
          groupId: group.id,
          venueId: venue.id,
          isPublic: true,
          poolCount: 1,
          teamsAllowed: 4,
          playersAllowed: 8,
          sport: GameSportEnum.PADEL,
          windowStart: new Date("2026-09-21T13:00:00"),
          windowEnd: new Date("2026-09-21T15:00:00"),
        })
        .returning({ id: games.id });
      if (!created) {
        throw new Error("Failed to insert leftover Complete Teams tournament");
      }

      const detail = await gameById(db, {
        gameId: created.id,
        userId: owner.id,
      });
      const rows = tournamentTeamRows(detail.sides, owner.id);

      expect(detail.registrationMode).toBe("team_only");
      expect(detail.allowSoloRegister).toBe(true);
      expect(detail.teamsAllowed).toBe(4);
      expect(detail.sides).toHaveLength(4);
      expect(
        detail.sides.every((side) => side.left == null && side.right == null),
      ).toBe(true);
      expect(rows.head).toHaveLength(4);
      expect(rows.head.every((row) => row.name === "Open")).toBe(true);
    } finally {
      await close();
    }
  });
});
