import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  GroupMemberRoleEnum,
  courts,
  games,
  groupMembers,
  groupSeries,
  groups,
  user,
  venues,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";
import { messagesFor } from "@repo/i18n/messages";

import { gameById } from "#src/routers/games/byId";
import { cancelGame } from "#src/routers/games/cancel";
import { createGame } from "#src/routers/games/create";
import { createTournament } from "#src/routers/games/createTournament";
import { seriesAttachOptions } from "#src/routers/series/attachOptions";
import { createSeries } from "#src/routers/series/create";
import {
  gameSeriesSummary,
  resolveGameSeriesLink,
  seriesEditionAt,
  seriesLinkLocked,
} from "#src/series/series-link";

const NOW = new Date("2026-11-21T10:00:00Z");
const HOUR = 60 * 60 * 1000;
const errors = messagesFor("en").series.errors;

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

async function insertGroup(
  database: TestDatabase,
  args: { createdBy: string; sport: "padel" | "football"; verified: boolean },
) {
  const [row] = await database
    .insert(groups)
    .values({
      name: `Group ${crypto.randomUUID()}`,
      createdBy: args.createdBy,
      sport: args.sport,
      verifiedAt: args.verified ? NOW : null,
    })
    .returning();
  if (!row) {
    throw new Error("Failed to insert group");
  }
  return row;
}

async function setUp(database: TestDatabase) {
  const owner = await insertUser(database, "owner@example.com");
  const organizer = await insertUser(database, "organizer@example.com");
  const member = await insertUser(database, "member@example.com");
  const [venue] = await database
    .insert(venues)
    .values({ name: "Seef Padel", city: "Manama", country: "BH" })
    .returning({ id: venues.id });
  if (!venue) {
    throw new Error("Failed to insert venue");
  }
  const [pitch] = await database
    .insert(courts)
    .values({ venueId: venue.id, name: "Pitch 1", sport: "football" })
    .returning({ id: courts.id });
  const padel = await insertGroup(database, {
    createdBy: owner.id,
    sport: "padel",
    verified: true,
  });
  const football = await insertGroup(database, {
    createdBy: owner.id,
    sport: "football",
    verified: true,
  });
  await database.insert(groupMembers).values([
    { groupId: padel.id, userId: owner.id },
    {
      groupId: padel.id,
      userId: organizer.id,
      role: GroupMemberRoleEnum.ORGANIZER,
    },
    { groupId: padel.id, userId: member.id },
    { groupId: football.id, userId: owner.id },
  ]);
  return { owner, organizer, member, venue, pitch: pitch!, padel, football };
}

async function newSeries(
  database: TestDatabase,
  groupId: string,
  userId: string,
  name = "Sunday Social",
) {
  const created = await createSeries(database, {
    groupId,
    userId,
    name,
    emblem: "cup",
    colour: "gold",
    now: NOW,
  });
  return created.id;
}

function on(day: string) {
  const windowStart = new Date(`${day}T18:00:00Z`);
  return { windowStart, windowEnd: new Date(windowStart.getTime() + HOUR) };
}

async function padelGame(
  database: TestDatabase,
  args: {
    createdBy: string;
    groupId: string;
    venueId: string;
    day: string;
    seriesId?: string;
  },
) {
  return createGame(
    database,
    {
      createdBy: args.createdBy,
      groupId: args.groupId,
      isPublic: false,
      format: "friendly_game",
      registrationMode: "individual",
      venueId: args.venueId,
      seriesId: args.seriesId,
      ...on(args.day),
    },
    { now: NOW },
  );
}

async function rejection(promise: Promise<unknown>) {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(TRPCError);
  return error as TRPCError;
}

async function gameCount(database: TestDatabase) {
  return (await database.select({ id: games.id }).from(games)).length;
}

async function storedSeriesId(database: TestDatabase, gameId: string) {
  const row = await database.query.games.findFirst({
    where: eq(games.id, gameId),
    columns: { seriesId: true },
  });
  return row?.seriesId;
}

async function editionOf(database: TestDatabase, gameId: string) {
  const game = await database.query.games.findFirst({
    where: eq(games.id, gameId),
  });
  return (await gameSeriesSummary(database, game!))?.edition ?? null;
}

describe("attaching a Series at create", () => {
  it("stores it on a padel Friendly game, a football Game and a Social, and games.byId reads Edition 1", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await setUp(db);
      const padelSeries = await newSeries(db, f.padel.id, f.owner.id);
      const socialSeries = await newSeries(
        db,
        f.padel.id,
        f.owner.id,
        "Friday Social",
      );
      const footballSeries = await newSeries(db, f.football.id, f.owner.id);

      const friendly = await padelGame(db, {
        createdBy: f.organizer.id,
        groupId: f.padel.id,
        venueId: f.venue.id,
        day: "2026-12-06",
        seriesId: padelSeries,
      });
      const footballGame = await createGame(
        db,
        {
          createdBy: f.owner.id,
          groupId: f.football.id,
          isPublic: false,
          format: "friendly_game",
          registrationMode: "individual",
          venueId: f.venue.id,
          courtId: f.pitch.id,
          seriesId: footballSeries,
          ...on("2026-12-07"),
        },
        { now: NOW },
      );
      const social = await createTournament(db, {
        createdBy: f.owner.id,
        name: "Friday Social",
        groupId: f.padel.id,
        isPublic: false,
        tournamentShape: "groups_only",
        teamCount: 8,
        poolCount: 2,
        matchMinutes: 45,
        venueId: f.venue.id,
        seriesId: socialSeries,
        ...on("2026-12-11"),
      });

      expect(await storedSeriesId(db, friendly.id)).toBe(padelSeries);
      expect(await storedSeriesId(db, footballGame.id)).toBe(footballSeries);
      expect(await storedSeriesId(db, social.id)).toBe(socialSeries);

      const details = await gameById(db, {
        gameId: friendly.id,
        userId: f.organizer.id,
      });
      expect(details.series).toEqual({
        id: padelSeries,
        name: "Sunday Social",
        emblem: "cup",
        colour: "gold",
        edition: 1,
      });
      const socialDetails = await gameById(db, {
        gameId: social.id,
        userId: f.owner.id,
      });
      expect(socialDetails.series?.edition).toBe(1);
      const footballDetails = await gameById(db, {
        gameId: footballGame.id,
        userId: f.owner.id,
      });
      expect(footballDetails.series?.edition).toBe(1);
    } finally {
      await close();
    }
  });

  it("leaves seriesId optional: games.byId reads null without one", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await setUp(db);
      const created = await padelGame(db, {
        createdBy: f.owner.id,
        groupId: f.padel.id,
        venueId: f.venue.id,
        day: "2026-12-06",
      });
      expect(await storedSeriesId(db, created.id)).toBeNull();
      const details = await gameById(db, {
        gameId: created.id,
        userId: f.owner.id,
      });
      expect(details.series).toBeNull();
    } finally {
      await close();
    }
  });

  it("numbers Editions by start: a Game between two takes the middle number, and cancelling one closes the gap", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await setUp(db);
      const seriesId = await newSeries(db, f.padel.id, f.owner.id);
      const game = (day: string) =>
        padelGame(db, {
          createdBy: f.owner.id,
          groupId: f.padel.id,
          venueId: f.venue.id,
          day,
          seriesId,
        });

      const first = await game("2026-12-06");
      const third = await game("2026-12-20");
      expect(await editionOf(db, first.id)).toBe(1);
      expect(await editionOf(db, third.id)).toBe(2);

      expect(
        await seriesEditionAt(db, {
          seriesId,
          windowStart: on("2026-12-13").windowStart,
        }),
      ).toBe(2);
      const second = await game("2026-12-13");
      expect(await editionOf(db, first.id)).toBe(1);
      expect(await editionOf(db, second.id)).toBe(2);
      expect(await editionOf(db, third.id)).toBe(3);

      await cancelGame(db, { gameId: second.id, userId: f.owner.id });
      expect(await editionOf(db, second.id)).toBeNull();
      expect(await editionOf(db, third.id)).toBe(2);
      const details = await gameById(db, {
        gameId: second.id,
        userId: f.owner.id,
      });
      expect(details.series).toBeNull();
    } finally {
      await close();
    }
  });

  it("orders two Games on the same start by creation", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await setUp(db);
      const seriesId = await newSeries(db, f.padel.id, f.owner.id);
      const game = () =>
        padelGame(db, {
          createdBy: f.owner.id,
          groupId: f.padel.id,
          venueId: f.venue.id,
          day: "2026-12-06",
          seriesId,
        });
      const earlier = await game();
      const later = await game();
      expect(await editionOf(db, earlier.id)).toBe(1);
      expect(await editionOf(db, later.id)).toBe(2);
      const start = on("2026-12-06").windowStart;
      expect(await seriesEditionAt(db, { seriesId, windowStart: start })).toBe(
        3,
      );
      expect(
        await seriesEditionAt(db, {
          seriesId,
          windowStart: start,
          excludeGameId: earlier.id,
        }),
      ).toBe(1);
      expect(
        await seriesEditionAt(db, {
          seriesId,
          windowStart: start,
          excludeGameId: later.id,
        }),
      ).toBe(2);
    } finally {
      await close();
    }
  });
});

describe("refusing a Series at create", () => {
  it("refuses another Group's Series and creates nothing", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await setUp(db);
      const other = await insertGroup(db, {
        createdBy: f.owner.id,
        sport: "padel",
        verified: true,
      });
      const foreign = await newSeries(db, other.id, f.owner.id);
      const error = await rejection(
        padelGame(db, {
          createdBy: f.owner.id,
          groupId: f.padel.id,
          venueId: f.venue.id,
          day: "2026-12-06",
          seriesId: foreign,
        }),
      );
      expect(error.code).toBe("BAD_REQUEST");
      expect(error.message).toBe(errors.notInGroup);

      const tournamentError = await rejection(
        createTournament(db, {
          createdBy: f.owner.id,
          name: "Friday Social",
          groupId: f.padel.id,
          isPublic: false,
          tournamentShape: "groups_only",
          teamCount: 8,
          poolCount: 2,
          matchMinutes: 45,
          venueId: f.venue.id,
          seriesId: foreign,
          ...on("2026-12-11"),
        }),
      );
      expect(tournamentError.message).toBe(errors.notInGroup);
      expect(await gameCount(db)).toBe(0);
    } finally {
      await close();
    }
  });

  it("refuses a Group that is not Verified any more and creates nothing", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await setUp(db);
      const seriesId = await newSeries(db, f.padel.id, f.owner.id);
      await db
        .update(groups)
        .set({ verifiedAt: null })
        .where(eq(groups.id, f.padel.id));
      const error = await rejection(
        padelGame(db, {
          createdBy: f.owner.id,
          groupId: f.padel.id,
          venueId: f.venue.id,
          day: "2026-12-06",
          seriesId,
        }),
      );
      expect(error.code).toBe("FORBIDDEN");
      expect(error.message).toBe(errors.verifiedOnly);
      expect(await gameCount(db)).toBe(0);
    } finally {
      await close();
    }
  });

  it("refuses an ended Series and creates nothing", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await setUp(db);
      const seriesId = await newSeries(db, f.padel.id, f.owner.id);
      await db
        .update(groupSeries)
        .set({ endedAt: NOW, endedBy: f.owner.id })
        .where(eq(groupSeries.id, seriesId));
      const error = await rejection(
        padelGame(db, {
          createdBy: f.owner.id,
          groupId: f.padel.id,
          venueId: f.venue.id,
          day: "2026-12-06",
          seriesId,
        }),
      );
      expect(error.message).toBe(errors.ended);
      expect(await gameCount(db)).toBe(0);
    } finally {
      await close();
    }
  });

  it("refuses a Public Game and creates nothing", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await setUp(db);
      const seriesId = await newSeries(db, f.padel.id, f.owner.id);
      const error = await rejection(
        createGame(
          db,
          {
            createdBy: f.owner.id,
            isPublic: true,
            format: "friendly_game",
            registrationMode: "individual",
            venueId: f.venue.id,
            seriesId,
            ...on("2026-12-06"),
          },
          { now: NOW },
        ),
      );
      expect(error.message).toBe(errors.notInGroup);
      expect(await gameCount(db)).toBe(0);
    } finally {
      await close();
    }
  });

  it("refuses the legacy kinds that carry no Series and creates nothing", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await setUp(db);
      const seriesId = await newSeries(db, f.padel.id, f.owner.id);
      for (const format of ["americano", "friendly_tournament"] as const) {
        const error = await rejection(
          createGame(
            db,
            {
              createdBy: f.owner.id,
              groupId: f.padel.id,
              isPublic: false,
              format,
              registrationMode: "individual",
              playersAllowed: 8,
              venueId: f.venue.id,
              seriesId,
              ...on("2026-12-06"),
            },
            { now: NOW },
          ),
        );
        expect(error.message).toBe(errors.cannotCarry);
      }
      expect(await gameCount(db)).toBe(0);
    } finally {
      await close();
    }
  });

  it("refuses a Game without a day", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await setUp(db);
      const seriesId = await newSeries(db, f.padel.id, f.owner.id);
      const error = await rejection(
        resolveGameSeriesLink(db, {
          game: {
            format: "friendly_game",
            groupId: f.padel.id,
            challengeId: null,
            poolCount: null,
            tournamentShape: null,
            windowStart: null,
          },
          group: f.padel,
          seriesId,
          locale: "en",
        }),
      );
      expect(error.message).toBe(errors.needsDay);
    } finally {
      await close();
    }
  });
});

describe("seriesLinkLocked", () => {
  it("locks once a King of the court Final order is posted", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await setUp(db);
      const created = await padelGame(db, {
        createdBy: f.owner.id,
        groupId: f.padel.id,
        venueId: f.venue.id,
        day: "2026-12-06",
      });
      expect(
        await seriesLinkLocked(db, {
          id: created.id,
          finalOrderPostedAt: null,
        }),
      ).toBe(false);
      expect(
        await seriesLinkLocked(db, { id: created.id, finalOrderPostedAt: NOW }),
      ).toBe(true);
    } finally {
      await close();
    }
  });
});

describe("series.attachOptions", () => {
  it("lists the running Series by name with the Edition each would be on the start", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await setUp(db);
      const sunday = await newSeries(db, f.padel.id, f.owner.id);
      const friday = await newSeries(
        db,
        f.padel.id,
        f.owner.id,
        "Friday Classic",
      );
      const ended = await newSeries(db, f.padel.id, f.owner.id, "Old Ladder");
      await db
        .update(groupSeries)
        .set({ endedAt: NOW, endedBy: f.owner.id })
        .where(eq(groupSeries.id, ended));
      const game = (day: string) =>
        padelGame(db, {
          createdBy: f.owner.id,
          groupId: f.padel.id,
          venueId: f.venue.id,
          day,
          seriesId: sunday,
        });
      await game("2026-12-06");
      const edited = await game("2026-12-13");
      await game("2026-12-20");

      const options = await seriesAttachOptions(db, {
        groupId: f.padel.id,
        windowStart: on("2026-12-27").windowStart,
        userId: f.organizer.id,
      });
      expect(options).toEqual({
        options: [
          {
            id: friday,
            name: "Friday Classic",
            emblem: "cup",
            colour: "gold",
            edition: 1,
          },
          {
            id: sunday,
            name: "Sunday Social",
            emblem: "cup",
            colour: "gold",
            edition: 4,
          },
        ],
      });

      const between = await seriesAttachOptions(db, {
        groupId: f.padel.id,
        windowStart: on("2026-12-15").windowStart,
        userId: f.owner.id,
      });
      expect(between.options.find((row) => row.id === sunday)?.edition).toBe(3);
      const editing = await seriesAttachOptions(db, {
        groupId: f.padel.id,
        windowStart: on("2026-12-15").windowStart,
        gameId: edited.id,
        userId: f.owner.id,
      });
      expect(editing.options.find((row) => row.id === sunday)?.edition).toBe(2);
    } finally {
      await close();
    }
  });

  it("forbids a plain member", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await setUp(db);
      await newSeries(db, f.padel.id, f.owner.id);
      const error = await rejection(
        seriesAttachOptions(db, {
          groupId: f.padel.id,
          windowStart: on("2026-12-06").windowStart,
          userId: f.member.id,
        }),
      );
      expect(error.code).toBe("FORBIDDEN");
    } finally {
      await close();
    }
  });

  it("offers nothing on a Group that is not Verified", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const f = await setUp(db);
      await newSeries(db, f.padel.id, f.owner.id);
      await db
        .update(groups)
        .set({ verifiedAt: null })
        .where(eq(groups.id, f.padel.id));
      expect(
        await seriesAttachOptions(db, {
          groupId: f.padel.id,
          windowStart: on("2026-12-06").windowStart,
          userId: f.owner.id,
        }),
      ).toEqual({ options: [] });
    } finally {
      await close();
    }
  });
});
