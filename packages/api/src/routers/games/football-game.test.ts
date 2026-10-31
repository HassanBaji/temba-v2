import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  communities,
  courts,
  gameCourts,
  gamePlayers,
  groupMembers,
  gameWaitlist,
  games,
  groups,
  matches,
  ratings,
  user,
  venues,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { loadGroupStandingMembers } from "#src/standing/load-group-standing";
import { hasStandingResults } from "#src/standing/group-standing";
import { loadCompletedMatchesForUser } from "#src/stats/completed-matches";
import { createGame } from "#src/routers/games/create";
import { createTournament } from "#src/routers/games/createTournament";
import { acceptInviteLink } from "#src/routers/games/acceptInviteLink";
import { createInviteLink } from "#src/routers/games/createInviteLink";
import { previewInviteLink } from "#src/routers/games/previewInviteLink";
import { gameById } from "#src/routers/games/byId";
import { kick } from "#src/routers/games/kick";
import { leaveGame } from "#src/routers/games/leave";
import { listAssignableCourts } from "#src/routers/games/listCourts";
import { listCreateVenuesForUser } from "#src/routers/games/listCreateVenues";
import { listMyGamesHubRows } from "#src/games/list-my-games";
import { moveSeat } from "#src/routers/games/moveSeat";
import { register } from "#src/routers/games/register";
import { registerSeat } from "#src/routers/games/registerSeat";
import { registerWithPartner } from "#src/routers/games/registerWithPartner";
import { setMemberLevel } from "#src/routers/ratings/setLevel";
import { updateGameCaps } from "#src/routers/games/updateCaps";
import {
  isHomeCarouselAtCap,
  isHomeCarouselNeedsResults,
} from "#src/home/carousel-games";

async function insertUser(database: TestDatabase, name: string) {
  const [row] = await database
    .insert(user)
    .values({ name, email: `${name}-${crypto.randomUUID()}@example.com` })
    .returning({ id: user.id });
  if (!row) {
    throw new Error("Failed to insert user");
  }
  return row;
}

async function insertMember(f: Fixture, name: string) {
  const member = await insertUser(f.db, name);
  await f.db
    .insert(groupMembers)
    .values({ groupId: f.group.id, userId: member.id });
  return member;
}

async function insertVenue(database: TestDatabase) {
  const [row] = await database
    .insert(venues)
    .values({
      name: `Venue ${crypto.randomUUID()}`,
      city: "Manama",
      country: "BH",
    })
    .returning({ id: venues.id });
  if (!row) {
    throw new Error("Failed to insert venue");
  }
  return row;
}

async function insertCourt(
  database: TestDatabase,
  venueId: string,
  sport: "padel" | "football",
) {
  const [row] = await database
    .insert(courts)
    .values({ venueId, name: `${sport} ${crypto.randomUUID()}`, sport })
    .returning({ id: courts.id });
  if (!row) {
    throw new Error("Failed to insert court");
  }
  return row;
}

async function insertGroup(
  database: TestDatabase,
  args: {
    createdBy: string;
    sport: "padel" | "football";
    communityId?: string;
  },
) {
  const [row] = await database
    .insert(groups)
    .values({
      name: `Group ${crypto.randomUUID()}`,
      createdBy: args.createdBy,
      sport: args.sport,
      communityId: args.communityId,
    })
    .returning();
  if (!row) {
    throw new Error("Failed to insert group");
  }
  return row;
}

function window() {
  const windowStart = new Date(Date.now() + 60 * 60 * 1000);
  return {
    windowStart,
    windowEnd: new Date(windowStart.getTime() + 60 * 60 * 1000),
  };
}

async function withFootball(
  run: (f: {
    db: TestDatabase;
    organizer: { id: string };
    venueId: string;
    pitchId: string;
    padelCourtId: string;
    group: typeof groups.$inferSelect;
  }) => Promise<void>,
) {
  const { db, close } = await createPgliteDb();
  try {
    const organizer = await insertUser(db, "organizer");
    const venue = await insertVenue(db);
    const pitch = await insertCourt(db, venue.id, "football");
    const padelCourt = await insertCourt(db, venue.id, "padel");
    const group = await insertGroup(db, {
      createdBy: organizer.id,
      sport: "football",
    });
    await run({
      db,
      organizer,
      venueId: venue.id,
      pitchId: pitch.id,
      padelCourtId: padelCourt.id,
      group,
    });
  } finally {
    await close();
  }
}

type Fixture = Parameters<Parameters<typeof withFootball>[0]>[0];

function footballInput(f: Fixture, extra: Record<string, unknown> = {}) {
  return {
    createdBy: f.organizer.id,
    groupId: f.group.id,
    isPublic: false,
    format: "friendly_game" as const,
    registrationMode: "individual" as const,
    venueId: f.venueId,
    courtId: f.pitchId,
    ...window(),
    ...extra,
  };
}

async function createFootball(f: Fixture, extra: Record<string, unknown> = {}) {
  const created = await createGame(f.db, footballInput(f, extra));
  const game = await f.db.query.games.findFirst({
    where: eq(games.id, created.id),
  });
  if (!game) {
    throw new Error("Game missing");
  }
  return game;
}

describe("games.create on a football Group", () => {
  it("stores a football roster Game with side size 5 and cap 10, no Match", async () => {
    await withFootball(async (f) => {
      const game = await createFootball(f);
      expect(game.sport).toBe("football");
      expect(game.format).toBe("friendly_game");
      expect(game.registrationMode).toBe("individual");
      expect(game.sideSize).toBe(5);
      expect(game.playersAllowed).toBe(10);
      expect(game.teamsAllowed).toBeNull();
      expect(game.rated).toBe(false);
      expect(
        await f.db.select().from(matches).where(eq(matches.gameId, game.id)),
      ).toHaveLength(0);
      const recorded = await f.db
        .select()
        .from(gameCourts)
        .where(eq(gameCourts.gameId, game.id));
      expect(recorded.map((row) => row.courtId)).toEqual([f.pitchId]);
    });
  });

  it("stays Unrated whatever the caller sends", async () => {
    await withFootball(async (f) => {
      const game = await createFootball(f, { rated: true, isPublic: true });
      expect(game.rated).toBe(false);
    });
  });

  it("takes side size and cap within bounds", async () => {
    await withFootball(async (f) => {
      const game = await createFootball(f, { sideSize: 7, playersAllowed: 16 });
      expect(game.sideSize).toBe(7);
      expect(game.playersAllowed).toBe(16);
      await expect(
        createFootball(f, { sideSize: 7, playersAllowed: 13 }),
      ).rejects.toThrow("between 14 and 40");
      await expect(
        createFootball(f, { sideSize: 5, playersAllowed: 41 }),
      ).rejects.toThrow("between 10 and 40");
      await expect(createFootball(f, { sideSize: 10 })).rejects.toThrow(
        "Side size",
      );
    });
  });

  it("refuses a Level range, a padel Court, Americano and a tournament", async () => {
    await withFootball(async (f) => {
      await expect(createFootball(f, { levelMinTenths: 10 })).rejects.toThrow(
        "no Level range",
      );
      await expect(
        createFootball(f, { courtId: f.padelCourtId }),
      ).rejects.toThrow("football pitch");
      await expect(
        createFootball(f, { format: "americano", playersAllowed: 8 }),
      ).rejects.toThrow("Friendly games");
      await expect(
        createTournament(f.db, {
          createdBy: f.organizer.id,
          groupId: f.group.id,
          venueId: f.venueId,
          isPublic: false,
          registrationMode: "individual",
          name: "Cup",
          teamCount: 8,
          matchMinutes: 45,
          poolCount: 2,
          ...window(),
        }),
      ).rejects.toThrow("Football Games are Friendly games");
    });
  });

  it("allows skip Court only on a locked Venue with no pitch", async () => {
    await withFootball(async (f) => {
      const lockedVenue = await insertVenue(f.db);
      const padelOnly = await insertCourt(f.db, lockedVenue.id, "padel");
      const [community] = await f.db
        .insert(communities)
        .values({
          name: "Locked Club",
          type: "private",
          createdBy: f.organizer.id,
          venueId: lockedVenue.id,
        })
        .returning({ id: communities.id });
      const club = await insertGroup(f.db, {
        createdBy: f.organizer.id,
        sport: "football",
        communityId: community!.id,
      });
      const input = {
        createdBy: f.organizer.id,
        groupId: club.id,
        isPublic: false,
        format: "friendly_game" as const,
        registrationMode: "individual" as const,
        venueId: lockedVenue.id,
        ...window(),
      };
      await expect(
        createGame(f.db, { ...input, courtId: padelOnly.id }),
      ).rejects.toThrow("football pitch");
      const created = await createGame(f.db, input);
      expect(created.id).toBeDefined();
    });
  });
});

describe("games.create on a padel Group", () => {
  it("still creates a Match with Set shells", async () => {
    await withFootball(async (f) => {
      const group = await insertGroup(f.db, {
        createdBy: f.organizer.id,
        sport: "padel",
      });
      const created = await createGame(f.db, {
        ...footballInput(f),
        groupId: group.id,
        courtId: f.padelCourtId,
      });
      const game = await f.db.query.games.findFirst({
        where: eq(games.id, created.id),
      });
      expect(game?.sport).toBe("padel");
      expect(game?.sideSize).toBeNull();
      expect(game?.playersAllowed).toBe(4);
      expect(created.matchId).not.toBeNull();
      await expect(
        createGame(f.db, { ...footballInput(f), groupId: group.id }),
      ).rejects.toThrow("padel Court");
    });
  });
});

describe("roster registration on a football Game", () => {
  it("admits, waitlists at cap, and promotes on leave and kick", async () => {
    await withFootball(async (f) => {
      const game = await createFootball(f);
      const players = [];
      for (let index = 0; index < 11; index += 1) {
        players.push(await insertMember(f, `p${index}`));
      }
      for (const player of players.slice(0, 10)) {
        const result = await register(f.db, {
          gameId: game.id,
          userId: player.id,
        });
        expect(result.waitlisted).toBe(false);
      }
      const eleventh = players[10]!;
      const waitlisted = await register(f.db, {
        gameId: game.id,
        userId: eleventh.id,
      });
      expect(waitlisted.waitlisted).toBe(true);

      const positions = await f.db.query.gameTeamPlayers.findMany();
      expect(positions).toHaveLength(0);

      await leaveGame(f.db, { gameId: game.id, userId: players[0]!.id });
      const onGame = await f.db.query.gamePlayers.findMany({
        where: eq(gamePlayers.gameId, game.id),
      });
      expect(onGame).toHaveLength(10);
      expect(onGame.some((row) => row.userId === eleventh.id)).toBe(true);

      const twelfth = await insertMember(f, "p11");
      await register(f.db, { gameId: game.id, userId: twelfth.id });
      await kick(f.db, {
        gameId: game.id,
        organizerUserId: f.organizer.id,
        userId: players[1]!.id,
      });
      const afterKick = await f.db.query.gamePlayers.findMany({
        where: and(
          eq(gamePlayers.gameId, game.id),
          eq(gamePlayers.userId, twelfth.id),
        ),
      });
      expect(afterKick).toHaveLength(1);
      expect(
        await f.db
          .select()
          .from(gameWaitlist)
          .where(eq(gameWaitlist.gameId, game.id)),
      ).toHaveLength(0);
    });
  });

  it("refuses every seat door with one message", async () => {
    await withFootball(async (f) => {
      const game = await createFootball(f);
      const a = await insertMember(f, "a");
      const b = await insertMember(f, "b");
      const message = "This Game has no seats; register as yourself";
      await expect(
        registerSeat(f.db, { gameId: game.id, userId: a.id }),
      ).rejects.toThrow(message);
      await expect(
        registerWithPartner(f.db, {
          gameId: game.id,
          userId: a.id,
          partnerUserId: b.id,
        }),
      ).rejects.toThrow(message);
      await expect(
        moveSeat(f.db, {
          gameId: game.id,
          userId: a.id,
          sideIndex: 1,
          position: "left",
        }),
      ).rejects.toThrow(message);
      await expect(
        acceptInviteLink(f.db, {
          token: (
            await createInviteLink(f.db, {
              gameId: game.id,
              userId: f.organizer.id,
              origin: "https://temba.test",
            })
          ).inviteUrl
            .split("/")
            .pop()!,
          userId: a.id,
          sideIndex: 1,
          position: "left",
        }),
      ).rejects.toThrow(message);
    });
  });

  it("admits through an Invite link without a Position", async () => {
    await withFootball(async (f) => {
      const game = await createFootball(f);
      const joiner = await insertMember(f, "joiner");
      const link = await createInviteLink(f.db, {
        gameId: game.id,
        userId: f.organizer.id,
        origin: "https://temba.test",
      });
      const accepted = await acceptInviteLink(f.db, {
        token: link.inviteUrl.split("/").pop()!,
        userId: joiner.id,
      });
      expect(accepted.waitlisted).toBe(false);
      const view = await gameById(f.db, {
        gameId: game.id,
        userId: joiner.id,
      });
      expect(view.isRegistered).toBe(true);
      expect(view.sides).toEqual([]);
      expect(view.sideSize).toBe(5);
      expect(view.roster).toMatchObject({ count: 1, cap: 10 });
      expect(view.roster?.users.map((row) => row.id)).toEqual([joiner.id]);
    });
  });

  it("joins through an Invite link as the keeper or player they chose", async () => {
    await withFootball(async (f) => {
      const game = await createFootball(f);
      const link = await createInviteLink(f.db, {
        gameId: game.id,
        userId: f.organizer.id,
        origin: "https://temba.test",
      });
      const token = link.inviteUrl.split("/").pop()!;
      const roleOf = async (userId: string) =>
        f.db.query.gamePlayers.findFirst({
          where: and(
            eq(gamePlayers.gameId, game.id),
            eq(gamePlayers.userId, userId),
          ),
          columns: { footballRole: true, footballPosition: true },
        });

      const defender = await insertMember(f, "Dana Def");
      await acceptInviteLink(f.db, {
        token,
        userId: defender.id,
        football: { role: "outfield", position: "def" },
      });
      expect(await roleOf(defender.id)).toEqual({
        footballRole: "outfield",
        footballPosition: "def",
      });

      for (const name of ["Kim Keeper", "Kai Keeper"]) {
        const keeper = await insertMember(f, name);
        await acceptInviteLink(f.db, {
          token,
          userId: keeper.id,
          football: { role: "keeper", position: "mid" },
        });
        expect((await roleOf(keeper.id))?.footballRole).toBe("keeper");
      }

      const late = await insertMember(f, "late");
      await expect(
        acceptInviteLink(f.db, {
          token,
          userId: late.id,
          football: { role: "keeper", position: "mid" },
        }),
      ).rejects.toThrow("Both keeper seats are taken");
      expect(await roleOf(late.id)).toBeUndefined();
    });
  });

  it("previews the roster and the joiner's preferred role until they join", async () => {
    await withFootball(async (f) => {
      const game = await createFootball(f);
      const link = await createInviteLink(f.db, {
        gameId: game.id,
        userId: f.organizer.id,
        origin: "https://temba.test",
      });
      const token = link.inviteUrl.split("/").pop()!;
      const keeper = await insertMember(f, "Kim Keeper");
      await acceptInviteLink(f.db, {
        token,
        userId: keeper.id,
        football: { role: "keeper", position: "mid" },
      });
      const joiner = await insertMember(f, "joiner");
      await f.db
        .update(user)
        .set({
          preferredFootballRole: "outfield",
          preferredFootballPosition: "fwd",
        })
        .where(eq(user.id, joiner.id));

      const signedOut = await previewInviteLink(f.db, { token });
      expect(signedOut.status === "ready" && signedOut.football).toBeNull();

      const before = await previewInviteLink(f.db, {
        token,
        userId: joiner.id,
      });
      expect(before.status === "ready" && before.football).toEqual({
        players: [{ name: "Kim Keeper", role: "keeper", position: "mid" }],
        sideSize: 5,
        playersAllowed: 10,
        pricePerPlayerFils: null,
        teamsSet: false,
        preferred: { role: "outfield", position: "fwd" },
      });

      await acceptInviteLink(f.db, {
        token,
        userId: joiner.id,
        football: { role: "outfield", position: "fwd" },
      });
      const after = await previewInviteLink(f.db, {
        token,
        userId: joiner.id,
      });
      expect(after.status === "ready" && after.football).toBeNull();
    });
  });

  it("never falls back to a cap of 4 or 2", async () => {
    await withFootball(async (f) => {
      const game = await createFootball(f);
      expect(game.playersAllowed).toBe(10);
      expect(
        isHomeCarouselAtCap({
          registrationMode: game.registrationMode,
          playersAllowed: game.playersAllowed,
          teamsAllowed: game.teamsAllowed,
          registeredUserCount: 5,
          registeredTeamCount: 0,
        }),
      ).toBe(false);
      const players = [];
      for (let index = 0; index < 5; index += 1) {
        players.push(await insertMember(f, `cap${index}`));
        await register(f.db, { gameId: game.id, userId: players[index]!.id });
      }
      const view = await gameById(f.db, {
        gameId: game.id,
        userId: players[0]!.id,
      });
      expect(view.registrationStatus).toBe("open");
      expect(view.canRegister).toBe(false);
      const outsider = await insertMember(f, "outsider");
      const outsiderView = await gameById(f.db, {
        gameId: game.id,
        userId: outsider.id,
      });
      expect(outsiderView.registrationStatus).toBe("open");
    });
  });
});

describe("games.updateCaps on a football Game", () => {
  it("edits players allowed within bounds and not below registered", async () => {
    await withFootball(async (f) => {
      const game = await createFootball(f);
      await updateGameCaps(f.db, {
        gameId: game.id,
        userId: f.organizer.id,
        playersAllowed: 14,
      });
      const row = await f.db.query.games.findFirst({
        where: eq(games.id, game.id),
      });
      expect(row?.playersAllowed).toBe(14);
      await expect(
        updateGameCaps(f.db, {
          gameId: game.id,
          userId: f.organizer.id,
          playersAllowed: 9,
        }),
      ).rejects.toThrow("between 10 and 40");
      for (let index = 0; index < 12; index += 1) {
        const player = await insertMember(f, `cap${index}`);
        await register(f.db, { gameId: game.id, userId: player.id });
      }
      await expect(
        updateGameCaps(f.db, {
          gameId: game.id,
          userId: f.organizer.id,
          playersAllowed: 10,
        }),
      ).rejects.toThrow("below the current registered count");
    });
  });
});

describe("Court and Venue pickers follow the sport", () => {
  it("filters the create Venues and the Game's Courts by sport", async () => {
    await withFootball(async (f) => {
      const padelOnlyVenue = await insertVenue(f.db);
      await insertCourt(f.db, padelOnlyVenue.id, "padel");

      const football = await listCreateVenuesForUser(f.db, {
        userId: f.organizer.id,
        groupId: f.group.id,
      });
      expect(football.venues.map((venue) => venue.id)).toEqual([f.venueId]);
      expect(football.venues[0]?.courts).toEqual([
        expect.objectContaining({ id: f.pitchId, sport: "football" }),
      ]);

      const padelGroup = await insertGroup(f.db, {
        createdBy: f.organizer.id,
        sport: "padel",
      });
      const padel = await listCreateVenuesForUser(f.db, {
        userId: f.organizer.id,
        groupId: padelGroup.id,
      });
      expect(padel.venues).toHaveLength(2);
      for (const venue of padel.venues) {
        expect(venue.courts.every((court) => court.sport === "padel")).toBe(
          true,
        );
      }

      const game = await createFootball(f, { courtId: undefined });
      const assignable = await listAssignableCourts(f.db, game);
      expect(assignable.map((court) => court.id)).toEqual([f.pitchId]);
    });
  });
});

describe("football Group guards", () => {
  it("refuses setLevel on a football Group", async () => {
    await withFootball(async (f) => {
      const target = await insertMember(f, "target");
      await expect(
        setMemberLevel(f.db, {
          groupId: f.group.id,
          setterUserId: f.organizer.id,
          targetUserId: target.id,
          levelTenths: 30,
        }),
      ).rejects.toThrow("Football Levels arrive with results");
      expect(await f.db.select().from(ratings)).toHaveLength(0);
    });
  });
});

describe("rows carry sport", () => {
  it("lists a football Game with its sport and no 2v2 sides", async () => {
    await withFootball(async (f) => {
      const game = await createFootball(f);
      const player = await insertMember(f, "lister");
      await register(f.db, { gameId: game.id, userId: player.id });
      const rows = await listMyGamesHubRows(f.db, player.id);
      const row = rows.find((item) => item.id === game.id);
      expect(row?.sport).toBe("football");
      expect(row?.sides).toEqual([]);
      expect(row?.playersAllowed).toBe(10);
      expect(
        isHomeCarouselNeedsResults(
          {
            ...(row as never),
            matches: [],
            cancelledAt: null,
          } as never,
          new Date(),
        ),
      ).toBe(false);
    });
  });
});

describe("football Games and results readers", () => {
  it("leaves Standing and stats at zero for a Group with no Matches", async () => {
    await withFootball(async (f) => {
      const game = await createFootball(f);
      const player = await insertMember(f, "scorer");
      await register(f.db, { gameId: game.id, userId: player.id });
      const standing = await loadGroupStandingMembers(f.db, [f.group.id]);
      const members = standing.get(f.group.id) ?? [];
      expect(members.some((member) => member.userId === player.id)).toBe(true);
      expect(members.some((member) => hasStandingResults(member))).toBe(false);
      expect(await loadCompletedMatchesForUser(f.db, player.id)).toEqual([]);
    });
  });
});

describe("games side size checks", () => {
  it("requires a side size on a football Game and one of the allowed values", async () => {
    await withFootball(async (f) => {
      const base = {
        format: "friendly_game" as const,
        venueId: f.venueId,
        createdBy: f.organizer.id,
      };
      await expect(
        f.db.insert(games).values({ ...base, sport: "football" }),
      ).rejects.toThrow();
      await expect(
        f.db.insert(games).values({ ...base, sport: "football", sideSize: 10 }),
      ).rejects.toThrow();
      await expect(
        f.db.insert(games).values({ ...base, sport: "padel", sideSize: 4 }),
      ).rejects.toThrow();
      await f.db.insert(games).values({ ...base, sport: "padel" });
      await f.db
        .insert(games)
        .values({ ...base, sport: "football", sideSize: 11 });
    });
  });
});
