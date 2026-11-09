import { describe, expect, it } from "vitest";

import {
  GameFormatEnum,
  GameRegistrationModeEnum,
  challenges,
  games,
  teams,
  user,
  venues,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";
import { messagesFor } from "@repo/i18n/messages";

import { closeRegistration } from "#src/routers/games/closeRegistration";
import { reopenRegistration } from "#src/routers/games/reopenRegistration";

async function challengeGame(database: TestDatabase) {
  const [captain] = await database
    .insert(user)
    .values({ name: "Captain", email: "captain@example.com" })
    .returning({ id: user.id });
  const [venue] = await database
    .insert(venues)
    .values({ name: "Venue", city: "Lisbon", country: "PT" })
    .returning({ id: venues.id });
  if (!captain || !venue) {
    throw new Error("Failed to insert captain or Venue");
  }
  const [team] = await database
    .insert(teams)
    .values({ name: "Team", createdBy: captain.id })
    .returning({ id: teams.id });
  if (!team) {
    throw new Error("Failed to insert Team");
  }
  const [challenge] = await database
    .insert(challenges)
    .values({
      teamId: team.id,
      sport: "padel",
      postedBy: captain.id,
      durationMinutes: 90,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    })
    .returning({ id: challenges.id });
  if (!challenge) {
    throw new Error("Failed to insert Challenge");
  }
  const windowStart = new Date(Date.now() + 60 * 60 * 1000);
  const [game] = await database
    .insert(games)
    .values({
      format: GameFormatEnum.FRIENDLY_GAME,
      registrationMode: GameRegistrationModeEnum.TEAM_ONLY,
      venueId: venue.id,
      createdBy: captain.id,
      challengeId: challenge.id,
      windowStart,
      windowEnd: new Date(windowStart.getTime() + 90 * 60 * 1000),
    })
    .returning({ id: games.id });
  if (!game) {
    throw new Error("Failed to insert Game");
  }
  return { captainId: captain.id, gameId: game.id };
}

describe("closeRegistration and reopenRegistration on a Challenge Game", () => {
  it("refuses both: the Challenge sets who plays", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const { captainId, gameId } = await challengeGame(db);
      const message = messagesFor("en").challenge.errors.setByChallenge;
      await expect(
        closeRegistration(db, { gameId, userId: captainId }),
      ).rejects.toThrow(message);
      await expect(
        reopenRegistration(db, { gameId, userId: captainId }),
      ).rejects.toThrow(message);
    } finally {
      await close();
    }
  });
});
