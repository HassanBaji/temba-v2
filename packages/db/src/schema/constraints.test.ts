import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createPgliteDb, type TestDatabase } from "../testing";
import {
  gamePlayers,
  games,
  gameTeamPlayers,
  gameTeams,
  groupLevelOverrides,
  groups,
  groupSeasons,
  levelOverrides,
  matches,
  user,
  venues,
} from "./index";

let db: TestDatabase;
let close: () => Promise<void>;

beforeEach(async () => {
  ({ db, close } = await createPgliteDb());
});

afterEach(async () => {
  await close();
});

async function insertUser(name: string) {
  const [row] = await db
    .insert(user)
    .values({ name, email: `${name}@example.com` })
    .returning({ id: user.id });
  return row!.id;
}

async function insertGame(createdBy: string, groupId?: string) {
  const [venue] = await db
    .insert(venues)
    .values({ name: `Venue ${createdBy}`, city: "Manama", country: "BH" })
    .returning({ id: venues.id });
  const [game] = await db
    .insert(games)
    .values({ venueId: venue!.id, createdBy, groupId })
    .returning();
  return game!;
}

async function insertGameTeams(gameId: string, count: number) {
  return db
    .insert(gameTeams)
    .values(
      Array.from({ length: count }, (_, index) => ({
        gameId,
        sideIndex: index + 1,
      })),
    )
    .returning({ id: gameTeams.id });
}

/** The Postgres SQLSTATE a write fails with, or null when it succeeds. */
async function failureCode(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    const cause = (error as { cause?: { code?: string } }).cause;
    return cause?.code ?? (error as { code?: string }).code ?? "unknown";
  }
  return null;
}

const NOT_NULL_VIOLATION = "23502";
const RESTRICT_VIOLATION = "23001";
const UNIQUE_VIOLATION = "23505";

describe("defaults the code reads as always set", () => {
  it("keeps a Game's sport and a Group's type", async () => {
    const organizer = await insertUser("organizer");
    const [group] = await db
      .insert(groups)
      .values({ name: "Crew", createdBy: organizer })
      .returning();
    const game = await insertGame(organizer, group!.id);

    expect(game.sport).toBe("padel");
    expect(group!.type).toBe("private");
    expect(
      await failureCode(
        db
          .update(games)
          .set({ sport: null as never })
          .where(eq(games.id, game.id)),
      ),
    ).toBe(NOT_NULL_VIOLATION);
    expect(
      await failureCode(
        db
          .update(groups)
          .set({ type: null as never })
          .where(eq(groups.id, group!.id)),
      ),
    ).toBe(NOT_NULL_VIOLATION);
  });
});

const LEVEL_CHANGE = {
  muBefore: 1500,
  phiBefore: 350,
  sigmaBefore: 0.06,
  levelBandBefore: "C1",
  muAfter: 1600,
  phiAfter: 300,
  sigmaAfter: 0.06,
  levelBandAfter: "B3",
} as const;

async function insertGroup(createdBy: string) {
  const [group] = await db
    .insert(groups)
    .values({ name: "Crew", createdBy })
    .returning({ id: groups.id });
  return group!.id;
}

describe("deleting a User who authored other people's records", () => {
  const authored: Record<
    string,
    (author: string, owner: string) => Promise<unknown>
  > = {
    "a Game": (author) => insertGame(author),
    "a Group": (author) => insertGroup(author),
    "a Season": async (author, owner) =>
      db.insert(groupSeasons).values({
        groupId: await insertGroup(owner),
        name: "Autumn",
        startsOn: "2026-09-01",
        endsOn: "2026-11-30",
        createdBy: author,
      }),
    "a Level": (author, owner) =>
      db.insert(levelOverrides).values({
        ...LEVEL_CHANGE,
        userId: owner,
        setByUserId: author,
        sport: "padel",
        hadRating: true,
      }),
    "a Group Level": async (author, owner) =>
      db.insert(groupLevelOverrides).values({
        ...LEVEL_CHANGE,
        userId: owner,
        setByUserId: author,
        groupId: await insertGroup(owner),
      }),
  };

  for (const [record, insert] of Object.entries(authored)) {
    it(`is refused while they authored ${record}`, async () => {
      const author = await insertUser("author");
      const owner = await insertUser("owner");
      await insert(author, owner);

      expect(
        await failureCode(db.delete(user).where(eq(user.id, author))),
      ).toBe(RESTRICT_VIOLATION);
    });
  }
});

describe("Game team seats", () => {
  it("refuses a second Game team for the same Game player", async () => {
    const organizer = await insertUser("organizer");
    const game = await insertGame(organizer);
    const [first, second] = await insertGameTeams(game.id, 2);
    const [player] = await db
      .insert(gamePlayers)
      .values({ gameId: game.id, userId: organizer })
      .returning({ id: gamePlayers.id });
    await db
      .insert(gameTeamPlayers)
      .values({ gameTeamId: first!.id, gamePlayerId: player!.id });

    expect(
      await failureCode(
        db
          .insert(gameTeamPlayers)
          .values({ gameTeamId: second!.id, gamePlayerId: player!.id }),
      ),
    ).toBe(UNIQUE_VIOLATION);
  });
});

describe("posted tournament Matches", () => {
  it("refuses two Knockout Matches in one place", async () => {
    const organizer = await insertUser("organizer");
    const game = await insertGame(organizer);
    const place = { gameId: game.id, knockoutRound: 1, knockoutPosition: 1 };
    await db.insert(matches).values({ ...place, roundNumber: 4 });

    expect(
      await failureCode(
        db.insert(matches).values({ ...place, roundNumber: 4 }),
      ),
    ).toBe(UNIQUE_VIOLATION);
    await db
      .insert(matches)
      .values({ ...place, knockoutPosition: 2, roundNumber: 4 });
  });

  it("refuses the same Pool pairing twice in a Round, either way round", async () => {
    const organizer = await insertUser("organizer");
    const game = await insertGame(organizer);
    const [a, b, c] = await insertGameTeams(game.id, 3);
    await db.insert(matches).values({
      gameId: game.id,
      roundNumber: 1,
      slot1GameTeamId: a!.id,
      slot2GameTeamId: b!.id,
    });

    expect(
      await failureCode(
        db.insert(matches).values({
          gameId: game.id,
          roundNumber: 1,
          slot1GameTeamId: b!.id,
          slot2GameTeamId: a!.id,
        }),
      ),
    ).toBe(UNIQUE_VIOLATION);
    await db.insert(matches).values([
      {
        gameId: game.id,
        roundNumber: 2,
        slot1GameTeamId: a!.id,
        slot2GameTeamId: b!.id,
      },
      {
        gameId: game.id,
        roundNumber: 1,
        slot1GameTeamId: a!.id,
        slot2GameTeamId: c!.id,
      },
      { gameId: game.id },
      { gameId: game.id },
    ]);
  });
});
