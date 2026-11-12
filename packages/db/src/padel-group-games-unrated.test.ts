import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { eq, sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createPgliteDb, type TestDatabase } from "./testing";
import { games, groups, matches, user, venues } from "./schema";

const migration = readFileSync(
  join(
    dirname(fileURLToPath(import.meta.url)),
    "../drizzle/0108_padel_group_games_unrated.sql",
  ),
  "utf8",
);

let db: TestDatabase;
let close: () => Promise<void>;

beforeEach(async () => {
  ({ db, close } = await createPgliteDb());
});

afterEach(async () => {
  await close();
});

async function insertGame(args: {
  sport: "padel" | "football";
  matchStatus: "pending" | "completed";
}) {
  const [owner] = await db
    .insert(user)
    .values({ name: "Owner", email: `${crypto.randomUUID()}@example.com` })
    .returning({ id: user.id });
  const [venue] = await db
    .insert(venues)
    .values({
      name: `Club ${crypto.randomUUID()}`,
      city: "Manama",
      country: "BH",
    })
    .returning({ id: venues.id });
  const [group] = await db
    .insert(groups)
    .values({ name: "Crew", createdBy: owner!.id, sport: args.sport })
    .returning({ id: groups.id });
  const [game] = await db
    .insert(games)
    .values({
      venueId: venue!.id,
      createdBy: owner!.id,
      groupId: group!.id,
      sport: args.sport,
      sideSize: args.sport === "football" ? 5 : null,
      groupRated: true,
    })
    .returning({ id: games.id });
  await db
    .insert(matches)
    .values({ gameId: game!.id, status: args.matchStatus });
  return game!.id;
}

async function groupRated(gameId: string) {
  const row = await db.query.games.findFirst({
    where: eq(games.id, gameId),
    columns: { groupRated: true },
  });
  return row?.groupRated;
}

describe("0108 padel Group Games unrated", () => {
  it("clears group_rated on a padel Game with no completed Match", async () => {
    const upcoming = await insertGame({
      sport: "padel",
      matchStatus: "pending",
    });
    const completed = await insertGame({
      sport: "padel",
      matchStatus: "completed",
    });
    const football = await insertGame({
      sport: "football",
      matchStatus: "pending",
    });

    await db.execute(sql.raw(migration));

    expect(await groupRated(upcoming)).toBe(false);
    expect(await groupRated(completed)).toBe(true);
    expect(await groupRated(football)).toBe(true);
  });
});
