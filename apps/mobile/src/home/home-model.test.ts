import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { createHomeFixtures } from "@repo/domain/home-fixtures";

import {
  homeContentFromApi,
  homeModelFromFixture,
  levelFromApi,
} from "./home-model";
import type { RouterOutputs } from "../trpc/react";

const NOW = new Date("2026-09-07T12:00:00.000Z");
const fixtures = createHomeFixtures(NOW);

describe("homeModelFromFixture", () => {
  it("carries the next Game, Coming up rows and the Level of a Provisional User", () => {
    const model = homeModelFromFixture(fixtures.provisional);
    assert.equal(model.home.status, "ready");
    if (model.home.status !== "ready") return;
    assert.equal(model.home.value.nextGame?.kind, "game");
    assert.equal(model.home.value.comingUp.length, 4);
    assert.ok(model.home.value.comingUp[0]?.startsAt instanceof Date);
    assert.equal(
      model.level.status === "ready" && model.level.value?.provisional,
      true,
    );
  });

  it("fills the ten Recent form slots from the fixture outcomes", () => {
    const model = homeModelFromFixture(fixtures.provisional);
    assert.equal(model.recentForm.status, "ready");
    if (model.recentForm.status !== "ready") return;
    assert.equal(model.recentForm.value.playedCount, 4);
    assert.equal(model.recentForm.value.bars.length, 10);
  });

  it("offers Create Group to a creator with no Group and Create to one with a Group", () => {
    const noGroup = homeModelFromFixture(fixtures.noGroup);
    const noGames = homeModelFromFixture(fixtures.noGames);
    assert.equal(
      noGroup.home.status === "ready" && noGroup.home.value.noGamesAction?.kind,
      "group",
    );
    assert.equal(
      noGames.home.status === "ready" && noGames.home.value.noGamesAction?.kind,
      "game",
    );
  });

  it("has no Level and no next Game in the empty record", () => {
    const model = homeModelFromFixture(fixtures.noGames);
    assert.equal(model.level.status === "ready" && model.level.value, null);
    assert.equal(
      model.home.status === "ready" && model.home.value.nextGame,
      null,
    );
  });
});

describe("levelFromApi", () => {
  it("is null before the User has a Rating", () => {
    assert.equal(
      levelFromApi({
        rating: null,
        history: [],
        progressPercent: null,
        canSelfDeclare: true,
      } as never),
      null,
    );
  });
});

describe("homeContentFromApi", () => {
  function home(game: Record<string, unknown>) {
    return {
      pendingInviteCount: 0,
      gamesPlayed: 0,
      gamesWon: 0,
      gamesLost: 0,
      carouselGames: [
        {
          id: "game-1",
          matchId: null,
          phase: "upcoming",
          format: "friendly_game",
          registrationMode: "individual",
          poolCount: null,
          tournamentShape: null,
          venue: { name: "Riffa Sports" },
          courtName: null,
          roundNumber: null,
          roundCount: null,
          startTime: new Date("2026-09-08T16:00:00.000Z"),
          sides: [],
          registeredUserCount: 7,
          playersAllowed: 10,
          ...game,
        },
      ],
      standing: [],
    } as unknown as RouterOutputs["users"]["home"];
  }

  it("carries a football Game as a count with its sport instead of seats", () => {
    const content = homeContentFromApi(home({ sport: "football" }), null);
    const next = content.nextGame;
    assert.equal(next?.kind, "game");
    if (next?.kind !== "game") return;
    assert.equal(next.sport, "football");
    assert.deepEqual(next.roster, {
      filledLabel: "7/10",
      spotsLabel: "3 spots open",
    });
  });

  it("keeps the seat row for a padel Game", () => {
    const content = homeContentFromApi(
      home({ sport: "padel", registeredUserCount: 3, playersAllowed: 4 }),
      null,
    );
    const next = content.nextGame;
    assert.equal(next?.kind === "game" && next.roster, null);
    assert.equal(next?.kind === "game" && next.seats.length, 4);
  });
});
