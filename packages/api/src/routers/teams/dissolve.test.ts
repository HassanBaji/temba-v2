import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { games, matches, teams } from "@repo/db/schema";
import { messagesFor } from "@repo/i18n/messages";

import {
  addPendingProposal,
  padelMatchup,
  refusal,
  withDb,
} from "#src/challenges/challenges.test-support";
import { recordJobs } from "#src/jobs/job-sink.test-support";
import { confirmProposal } from "#src/routers/challenges/confirmProposal";
import { proposeOnChallenge } from "#src/routers/challenges/propose";
import { withdrawChallenge } from "#src/routers/challenges/withdraw";
import { withdrawProposal } from "#src/routers/challenges/withdrawProposal";

import { dissolve } from "./dissolve";

const HOUR = 60 * 60 * 1000;
const blocked = messagesFor("en").team.dissolveBlocked;

async function teamExists(
  database: Parameters<Parameters<typeof withDb>[0]>[0]["database"],
  teamId: string,
) {
  const row = await database.query.teams.findFirst({
    where: eq(teams.id, teamId),
    columns: { id: true },
  });
  return row != null;
}

describe("teams.dissolve with Challenges", () => {
  recordJobs();

  it("refuses while the Team has an open Challenge or a pending Proposal, and dissolves once both are withdrawn", async () => {
    await withDb(async ({ database, db }) => {
      const now = new Date();
      const match = await padelMatchup(database, now);
      const proposal = await addPendingProposal(database, {
        challengeId: match.challenge.id,
        teamId: match.riffa.id,
        proposedBy: match.proposer.rafi,
        venueId: match.venue.id,
        expiresAt: new Date(now.getTime() + 48 * HOUR),
      });

      expect(
        await refusal(
          dissolve(db, { teamId: match.seef.id, userId: match.poster.ali }),
        ),
      ).toEqual({ code: "BAD_REQUEST", message: blocked.openChallenge });
      expect(
        await refusal(
          dissolve(db, { teamId: match.riffa.id, userId: match.proposer.rafi }),
        ),
      ).toEqual({ code: "BAD_REQUEST", message: blocked.pendingProposal });

      await withdrawProposal(db, {
        proposalId: proposal.id,
        userId: match.proposer.rafi,
      });
      await dissolve(db, {
        teamId: match.riffa.id,
        userId: match.proposer.rafi,
      });
      expect(await teamExists(database, match.riffa.id)).toBe(false);

      await withdrawChallenge(db, {
        challengeId: match.challenge.id,
        userId: match.poster.ali,
      });
      await dissolve(db, { teamId: match.seef.id, userId: match.poster.ali });
      expect(await teamExists(database, match.seef.id)).toBe(false);
    });
  });

  it("refuses either Team while their Challenge Game is unplayed, and allows it once the Game is cancelled or played", async () => {
    await withDb(async ({ database, db }) => {
      const sentAt = new Date(Date.now() - 4 * 24 * HOUR);
      const kickOff = new Date(sentAt.getTime() + 48 * HOUR);
      const match = await padelMatchup(database, sentAt);
      const { id: proposalId } = await proposeOnChallenge(db, {
        challengeId: match.challenge.id,
        teamId: match.riffa.id,
        venueId: match.venue.id,
        courtId: match.court.id,
        startsAt: kickOff,
        userId: match.proposer.rafi,
        now: sentAt,
      });
      const { gameId } = await confirmProposal(db, {
        proposalId,
        userId: match.poster.ali,
        now: sentAt,
      });

      for (const [teamId, userId] of [
        [match.seef.id, match.poster.ali],
        [match.riffa.id, match.proposer.rafi],
      ] as const) {
        expect(await refusal(dissolve(db, { teamId, userId }))).toEqual({
          code: "BAD_REQUEST",
          message: blocked.challengeGame,
        });
      }
      const game = await database.query.games.findFirst({
        where: eq(games.id, gameId),
        columns: { challengeId: true, cancelledAt: true },
      });
      expect(game).toEqual({
        challengeId: match.challenge.id,
        cancelledAt: null,
      });

      await database
        .update(matches)
        .set({ status: "completed" })
        .where(eq(matches.gameId, gameId));
      await dissolve(db, {
        teamId: match.riffa.id,
        userId: match.proposer.rafi,
      });
      expect(await teamExists(database, match.riffa.id)).toBe(false);
    });
  });

  it("allows dissolving once the Challenge Game is cancelled", async () => {
    await withDb(async ({ database, db }) => {
      const sentAt = new Date(Date.now() - 4 * 24 * HOUR);
      const match = await padelMatchup(database, sentAt);
      const { id: proposalId } = await proposeOnChallenge(db, {
        challengeId: match.challenge.id,
        teamId: match.riffa.id,
        venueId: match.venue.id,
        courtId: match.court.id,
        startsAt: new Date(sentAt.getTime() + 48 * HOUR),
        userId: match.proposer.rafi,
        now: sentAt,
      });
      const { gameId } = await confirmProposal(db, {
        proposalId,
        userId: match.poster.ali,
        now: sentAt,
      });
      await database
        .update(games)
        .set({ cancelledAt: new Date() })
        .where(eq(games.id, gameId));

      await dissolve(db, { teamId: match.seef.id, userId: match.poster.ali });
      expect(await teamExists(database, match.seef.id)).toBe(false);
    });
  });
});
