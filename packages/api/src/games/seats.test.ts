import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  gameTeamPlayers,
  gameTeams,
  groups,
  user,
  venues,
} from "@repo/db/schema";
import { createPgliteDb, type TestDatabase } from "@repo/db/testing";

import type { GameRow } from "#src/games/access";
import { createFriendlyGame } from "#src/games/create-friendly";
import { isIndividualSeatGame, occupySeat } from "#src/games/seats";

type Shape = Pick<GameRow, "format" | "registrationMode" | "sport">;

function seatGame(shape: Shape) {
  return isIndividualSeatGame(shape as GameRow);
}

describe("isIndividualSeatGame", () => {
  const cases: (Shape & { seats: boolean })[] = [
    {
      format: "friendly_game",
      registrationMode: "individual",
      sport: "padel",
      seats: true,
    },
    {
      format: "friendly_game",
      registrationMode: "individual",
      sport: null,
      seats: true,
    },
    {
      format: "friendly_game",
      registrationMode: "individual",
      sport: "football",
      seats: false,
    },
    {
      format: "friendly_tournament",
      registrationMode: "individual",
      sport: "padel",
      seats: true,
    },
    {
      format: "friendly_tournament",
      registrationMode: "team_only",
      sport: "padel",
      seats: false,
    },
    {
      format: "friendly_game",
      registrationMode: "team_only",
      sport: "padel",
      seats: false,
    },
    {
      format: "americano",
      registrationMode: "individual",
      sport: "padel",
      seats: false,
    },
    {
      format: "americano",
      registrationMode: "individual",
      sport: "football",
      seats: false,
    },
  ];

  it.each(cases)(
    "$format / $registrationMode / $sport seats: $seats",
    ({ seats, ...shape }) => {
      expect(seatGame(shape)).toBe(seats);
    },
  );
});

type Tx = Parameters<Parameters<TestDatabase["transaction"]>[0]>[0];

/** A transaction whose first Game team lookup misses, as when another register commits the side first. */
function missingFirstGameTeamLookup(tx: Tx): Tx {
  let missed = false;
  const gameTeamsQuery = new Proxy(tx.query.gameTeams, {
    get(target, property, receiver) {
      if (property === "findFirst" && !missed) {
        missed = true;
        return async () => undefined;
      }
      return Reflect.get(target, property, receiver);
    },
  });
  const query = new Proxy(tx.query, {
    get(target, property, receiver) {
      return property === "gameTeams"
        ? gameTeamsQuery
        : Reflect.get(target, property, receiver);
    },
  });
  return new Proxy(tx, {
    get(target, property, receiver) {
      return property === "query"
        ? query
        : Reflect.get(target, property, receiver);
    },
  });
}

describe("occupySeat", () => {
  it("joins the Game team another register created first, inside the same transaction", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const [owner] = await db
        .insert(user)
        .values({ name: "Owner", email: "owner@example.com" })
        .returning({ id: user.id });
      const [venue] = await db
        .insert(venues)
        .values({ name: "Venue", city: "Lisbon", country: "PT" })
        .returning({ id: venues.id });
      const [group] = await db
        .insert(groups)
        .values({ name: "Group", createdBy: owner!.id })
        .returning({ id: groups.id });
      const windowStart = new Date(Date.now() + 60 * 60 * 1000);
      const { game } = await createFriendlyGame(db, {
        createdBy: owner!.id,
        groupId: group!.id,
        venueId: venue!.id,
        windowStart,
        windowEnd: new Date(windowStart.getTime() + 90 * 60 * 1000),
      });

      const seated = await db.transaction(async (tx) => {
        const [winner] = await tx
          .insert(gameTeams)
          .values({ gameId: game.id, sideIndex: 1 })
          .returning({ id: gameTeams.id });
        const team = await occupySeat(
          missingFirstGameTeamLookup(tx) as never,
          game,
          owner!.id,
          1,
          "left",
        );
        return { winnerId: winner!.id, teamId: team.id };
      });

      expect(seated.teamId).toBe(seated.winnerId);
      const links = await db.query.gameTeamPlayers.findMany({
        where: eq(gameTeamPlayers.gameTeamId, seated.winnerId),
      });
      expect(links.map((link) => link.position)).toEqual(["left"]);
    } finally {
      await close();
    }
  });
});
