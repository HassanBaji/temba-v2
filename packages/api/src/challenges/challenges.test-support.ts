import { eq } from "drizzle-orm";

import {
  challengeProposals,
  challenges,
  courts,
  ratings,
  teamMembers,
  teams,
  user,
  venues,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import { type db } from "#src/db";

export type Fixture = { database: TestDatabase; db: typeof db };

/** The doors type their client as Postgres; PGlite runs the same queries. */
export async function withDb(run: (fixture: Fixture) => Promise<void>) {
  const { db: database, close } = await createPgliteDb();
  try {
    await run({ database, db: database as unknown as typeof db });
  } finally {
    await close();
  }
}

export async function makeUsers(
  database: TestDatabase,
  prefix: string,
  n: number,
) {
  const rows = await database
    .insert(user)
    .values(
      Array.from({ length: n }, (_, index) => ({
        name: `${prefix} ${index + 1}`,
        email: `${prefix.toLowerCase().replace(/\s+/g, "-")}-${index + 1}-${crypto.randomUUID()}@example.com`,
        clerkId: `clerk_${crypto.randomUUID()}`,
      })),
    )
    .returning({ id: user.id });
  return rows.map((row) => row.id);
}

/** A Team whose first User is the Captain. */
export async function makeTeam(
  database: TestDatabase,
  args: {
    name: string;
    sport: "padel" | "football";
    userIds: string[];
    groupId?: string;
  },
) {
  const [captain] = args.userIds;
  if (!captain) {
    throw new Error("A Team needs a Captain");
  }
  const [team] = await database
    .insert(teams)
    .values({
      name: args.name,
      sport: args.sport,
      createdBy: captain,
      groupId: args.groupId ?? null,
    })
    .returning();
  await database
    .insert(teamMembers)
    .values(args.userIds.map((userId) => ({ teamId: team!.id, userId })));
  return team!;
}

/** mu 1400 reads as Level 2.8; 2000 as 4.0; 1000 as 2.0. */
export async function rate(
  database: TestDatabase,
  userIds: readonly string[],
  sport: "padel" | "football",
  mu: number,
) {
  await database.insert(ratings).values(
    userIds.map((userId) => ({
      userId,
      sport,
      mu,
      phi: 150,
      sigma: 0.06,
      levelBand: "C2" as const,
    })),
  );
}

export async function makeVenue(
  database: TestDatabase,
  args: { name: string; city: string; sport: "padel" | "football" },
) {
  const [venue] = await database
    .insert(venues)
    .values({ name: args.name, city: args.city, country: "BH" })
    .returning({ id: venues.id, name: venues.name, city: venues.city });
  await database
    .insert(courts)
    .values({ venueId: venue!.id, name: "Court 1", sport: args.sport });
  return venue!;
}

export async function challengeRow(database: TestDatabase, id: string) {
  const row = await database.query.challenges.findFirst({
    where: eq(challenges.id, id),
  });
  if (!row) {
    throw new Error("Challenge missing");
  }
  return row;
}

/** A pending Proposal written straight to the table: proposing lands in a later door. */
export async function addPendingProposal(
  database: TestDatabase,
  args: {
    challengeId: string;
    teamId: string;
    proposedBy: string;
    venueId: string;
    expiresAt: Date;
  },
) {
  const [proposal] = await database
    .insert(challengeProposals)
    .values({
      challengeId: args.challengeId,
      teamId: args.teamId,
      proposedBy: args.proposedBy,
      venueId: args.venueId,
      startsAt: new Date(args.expiresAt.getTime() + 24 * 60 * 60 * 1000),
      expiresAt: args.expiresAt,
    })
    .returning();
  return proposal!;
}
