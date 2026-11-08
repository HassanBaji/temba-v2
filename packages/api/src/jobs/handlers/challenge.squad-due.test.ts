import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  gamePlayers,
  gameTeamPlayers,
  games,
  notifications,
} from "@repo/db/schema";
import type { TestDatabase } from "@repo/db/testing";

import {
  footballMatchup,
  withDb,
  type Fixture,
} from "#src/challenges/challenges.test-support";
import { recordJobs } from "#src/jobs/job-sink.test-support";
import { challengeSquadDueJobKey } from "#src/jobs/specs";
import { confirmProposal } from "#src/routers/challenges/confirmProposal";
import { proposeOnChallenge } from "#src/routers/challenges/propose";

import { handle } from "./challenge.squad-due";

const HOUR = 60 * 60 * 1000;
const sentAt = new Date("2026-11-08T10:00:00Z");
const kickOff = new Date(sentAt.getTime() + 72 * HOUR);
const dueAt = new Date(kickOff.getTime() - 24 * HOUR);

async function sixASideGame({ database, db }: Fixture) {
  const match = await footballMatchup(database, sentAt, { sideSize: 6 });
  const { id: proposalId } = await proposeOnChallenge(db, {
    challengeId: match.challenge.id,
    teamId: match.arad.id,
    venueId: match.venue.id,
    startsAt: kickOff,
    userId: match.aradIds[0]!,
    now: sentAt,
  });
  const { gameId } = await confirmProposal(db, {
    proposalId,
    userId: match.hiddIds[0]!,
    now: sentAt,
  });
  return { match, gameId };
}

async function nameOnSide(
  database: TestDatabase,
  gameId: string,
  sideIndex: 1 | 2,
  userIds: readonly string[],
) {
  const side = await database.query.gameTeams.findFirst({
    where: (table, { and }) =>
      and(eq(table.gameId, gameId), eq(table.sideIndex, sideIndex)),
  });
  for (const userId of userIds) {
    const [player] = await database
      .insert(gamePlayers)
      .values({ gameId, userId })
      .returning({ id: gamePlayers.id });
    await database
      .insert(gameTeamPlayers)
      .values({ gameTeamId: side!.id, gamePlayerId: player!.id });
  }
}

async function squadDue(database: TestDatabase) {
  return database.query.notifications.findMany({
    where: eq(notifications.type, "challenge_squad_due"),
  });
}

describe("challenge.squad-due", () => {
  const jobs = recordJobs();

  it("tells who acts for a side with 4 of 6 named, and not a side with 6", async () => {
    await withDb(async (fixture) => {
      const { database, db } = fixture;
      const { match, gameId } = await sixASideGame(fixture);
      await nameOnSide(database, gameId, 1, match.hiddIds.slice(0, 4));
      await nameOnSide(database, gameId, 2, match.aradIds.slice(0, 6));

      await handle(db, { gameId }, undefined, dueAt);
      await handle(db, { gameId }, undefined, dueAt);

      const rows = await squadDue(database);
      expect(rows.map((row) => row.recipientUserId)).toEqual([
        match.hiddIds[0],
      ]);
      expect(rows[0]).toMatchObject({
        teamId: match.arad.id,
        gameId,
        challengeId: match.challenge.id,
      });
    });
  });

  it("tells both sides while neither is named", async () => {
    await withDb(async (fixture) => {
      const { match, gameId } = await sixASideGame(fixture);

      await handle(fixture.db, { gameId }, undefined, dueAt);

      expect(
        (await squadDue(fixture.database))
          .map((row) => row.recipientUserId)
          .sort(),
      ).toEqual([match.hiddIds[0], match.aradIds[0]].sort());
    });
  });

  it("sends nothing on a cancelled Game", async () => {
    await withDb(async (fixture) => {
      const { gameId } = await sixASideGame(fixture);
      await fixture.database
        .update(games)
        .set({ cancelledAt: sentAt })
        .where(eq(games.id, gameId));

      await handle(fixture.db, { gameId }, undefined, dueAt);

      expect(await squadDue(fixture.database)).toHaveLength(0);
    });
  });

  it("waits for a kick-off moved later instead of sending early", async () => {
    await withDb(async (fixture) => {
      const { gameId } = await sixASideGame(fixture);
      const later = new Date(kickOff.getTime() + 48 * HOUR);
      await fixture.database
        .update(games)
        .set({ windowStart: later })
        .where(eq(games.id, gameId));
      jobs.clear();

      await handle(fixture.db, { gameId }, undefined, dueAt);

      expect(await squadDue(fixture.database)).toHaveLength(0);
      expect(jobs.added).toEqual([
        expect.objectContaining({
          key: challengeSquadDueJobKey(gameId),
          runAt: new Date(later.getTime() - 24 * HOUR),
        }),
      ]);
    });
  });
});
