import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import {
  challengeProposals,
  challengeVenues,
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

/** A pending Proposal written straight to the table, for clock tests. */
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

export async function courtOf(database: TestDatabase, venueId: string) {
  const court = await database.query.courts.findFirst({
    where: eq(courts.venueId, venueId),
    columns: { id: true, name: true },
  });
  if (!court) {
    throw new Error("Court missing");
  }
  return court;
}

export async function proposalRow(database: TestDatabase, id: string) {
  const row = await database.query.challengeProposals.findFirst({
    where: eq(challengeProposals.id, id),
  });
  if (!row) {
    throw new Error("Proposal missing");
  }
  return row;
}

/** A refused door's code and message; fails the test when the door succeeds. */
export async function refusal(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    if (error instanceof TRPCError) {
      return { code: error.code, message: error.message };
    }
    throw error;
  }
  throw new Error("Expected a refusal");
}

/** An open Challenge written straight to the table, seven days from `postedAt`. */
export async function addOpenChallenge(
  database: TestDatabase,
  args: {
    teamId: string;
    postedBy: string;
    sport: "padel" | "football";
    postedAt: Date;
    sideSize?: number | null;
    levelMinTenths?: number | null;
    levelMaxTenths?: number | null;
    venueIds?: string[];
  },
) {
  const [challenge] = await database
    .insert(challenges)
    .values({
      teamId: args.teamId,
      sport: args.sport,
      postedBy: args.postedBy,
      sideSize: args.sideSize ?? null,
      levelMinTenths: args.levelMinTenths ?? null,
      levelMaxTenths: args.levelMaxTenths ?? null,
      durationMinutes: args.sport === "padel" ? 90 : 60,
      expiresAt: new Date(args.postedAt.getTime() + 7 * 24 * 60 * 60 * 1000),
      createdAt: args.postedAt,
      updatedAt: args.postedAt,
    })
    .returning();
  if (args.venueIds?.length) {
    await database.insert(challengeVenues).values(
      args.venueIds.map((venueId, rank) => ({
        challengeId: challenge!.id,
        venueId,
        rank,
      })),
    );
  }
  return challenge!;
}

/**
 * Seef Smashers (Ali, Omar) post a padel Challenge at Padel Central; Riffa
 * Rackets (Rafi, Saad) may answer it.
 */
export async function padelMatchup(database: TestDatabase, postedAt: Date) {
  const [ali, omar, rafi, saad] = await makeUsers(database, "Player", 4);
  const seef = await makeTeam(database, {
    name: "Seef Smashers",
    sport: "padel",
    userIds: [ali!, omar!],
  });
  const riffa = await makeTeam(database, {
    name: "Riffa Rackets",
    sport: "padel",
    userIds: [rafi!, saad!],
  });
  const venue = await makeVenue(database, {
    name: "Padel Central",
    city: "Manama",
    sport: "padel",
  });
  const challenge = await addOpenChallenge(database, {
    teamId: seef.id,
    postedBy: ali!,
    sport: "padel",
    postedAt,
    venueIds: [venue.id],
  });
  return {
    challenge,
    seef,
    riffa,
    venue,
    court: await courtOf(database, venue.id),
    poster: { ali: ali!, omar: omar! },
    proposer: { rafi: rafi!, saad: saad! },
  };
}
