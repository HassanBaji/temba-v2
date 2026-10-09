import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { friendlyGameDetailsPlan } from "./friendly-game-details";
import { createFriendlyGameDetailsFixtures } from "./friendly-game-details-fixtures";
import {
  friendlyGameHeroInput,
  friendlyGameHeroModel,
  friendlyGameViewerPerspective,
} from "./friendly-game-hero";

const NOW = new Date("2026-10-04T12:00:00Z");
const fixtures = createFriendlyGameDetailsFixtures(NOW);

function hero(key: keyof typeof fixtures) {
  const input = friendlyGameHeroInput(fixtures[key]);
  assert.ok(input);
  return friendlyGameHeroModel(input, NOW);
}

describe("friendlyGameHeroInput", () => {
  it("has no hero for a cancelled Game", () => {
    assert.equal(friendlyGameHeroInput(fixtures.cancelled), null);
  });
});

describe("friendlyGameHeroModel", () => {
  it("keeps the upcoming hero on ink with price and duration", () => {
    const model = hero("registered");
    assert.equal(model?.kind, "scheduled");
    if (model?.kind !== "scheduled") {
      return;
    }
    assert.equal(model.tone, "ink");
    assert.equal(model.leftLabel.length > 0, true);
    assert.deepEqual(
      model.figures.map((figure) => [figure.label, figure.value]),
      [
        ["Price", "12.000 BD"],
        ["Duration", "90m"],
      ],
    );
  });

  it("says Seats booked and names the partner when seated beside someone", () => {
    const model = hero("partnerBooked");
    assert.equal(model?.kind, "scheduled");
    if (model?.kind !== "scheduled") {
      return;
    }
    assert.equal(model.leftLabel, "Seats booked");
    assert.equal(model.partnerName, "Sam Chen");
  });

  it("asks for a score on the needs-results hero, still on ink", () => {
    const model = hero("needsScore");
    assert.equal(model?.kind, "scheduled");
    if (model?.kind !== "scheduled") {
      return;
    }
    assert.equal(model.tone, "ink");
    assert.deepEqual(model.figures[0], {
      key: "score",
      value: "No score",
      label: "Nobody has added one",
    });
  });

  it("turns paper and reads the viewer's verdict once final", () => {
    const model = hero("final");
    assert.equal(model?.kind, "final");
    if (model?.kind !== "final") {
      return;
    }
    assert.equal(model.tone, "paper");
    assert.equal(model.verdictWord, "Win");
    assert.equal(model.setLine, "6–4  6–3");
    assert.deepEqual(model.figures[1], {
      key: "won-by",
      value: "2–0",
      label: "Won by",
    });
  });

  it("falls back to an unset time", () => {
    const input = friendlyGameHeroInput({
      ...fixtures.registered,
      windowStart: null,
    });
    assert.ok(input);
    assert.deepEqual(friendlyGameHeroModel(input, NOW), {
      kind: "time_unset",
      tone: "ink",
    });
  });
});

describe("friendlyGameViewerPerspective", () => {
  const match = {
    startTime: null,
    durationInMinutes: 90,
    slot1GameTeamId: "a",
    slot2GameTeamId: "b",
    sets: [
      { id: "1", slot1GamesWon: 6, slot2GamesWon: 3 },
      { id: "2", slot1GamesWon: null, slot2GamesWon: null },
    ],
    outcome: { slot1SetWins: 1, slot2SetWins: 0, result: "slot1" as const },
  };

  it("reads a loss from the second slot and drops never-played Sets", () => {
    const view = friendlyGameViewerPerspective(match, "b");
    assert.equal(view.verdict, "lost");
    assert.equal(view.viewerSetWins, 0);
    assert.deepEqual(view.sets, [
      { id: "1", viewerGames: 3, opponentGames: 6 },
    ]);
  });

  it("falls back to slot 1 for a viewer on neither team", () => {
    assert.equal(friendlyGameViewerPerspective(match, null).verdict, "won");
  });

  it("has no verdict without a result", () => {
    const none = {
      ...match,
      outcome: { slot1SetWins: 0, slot2SetWins: 0, result: "none" as const },
    };
    assert.equal(friendlyGameViewerPerspective(none, "a").verdict, null);
  });
});

describe("hero plan wiring", () => {
  it("takes the viewer's team from the plan", () => {
    const input = friendlyGameHeroInput(fixtures.final);
    assert.equal(
      input?.viewerGameTeamId,
      friendlyGameDetailsPlan(fixtures.final).viewerGameTeamId,
    );
  });
});
