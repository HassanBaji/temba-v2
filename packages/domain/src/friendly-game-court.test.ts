import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  courtFigures,
  courtSeatName,
  courtSeatRow,
  courtSeatSubline,
  courtSpotsLabel,
  scoreDeciderNote,
  scoreLeadLine,
  scoreLockedLine,
  scoreSetsMeta,
  scoreTeamFirstNames,
} from "./friendly-game-court";
import type { FriendlyGameHeroMatch } from "./friendly-game-hero";

function match(
  slot1SetWins: number,
  slot2SetWins: number,
  sets: [number | null, number | null][],
): FriendlyGameHeroMatch {
  return {
    startTime: null,
    durationInMinutes: 90,
    slot1GameTeamId: "team-a",
    slot2GameTeamId: "team-b",
    sets: sets.map(([slot1GamesWon, slot2GamesWon], index) => ({
      id: `set-${index}`,
      slot1GamesWon,
      slot2GamesWon,
    })),
    outcome: { slot1SetWins, slot2SetWins, result: "none" },
  };
}

describe("courtSpotsLabel", () => {
  it("counts open spots and says when the court is full", () => {
    assert.equal(courtSpotsLabel(4, "en"), "4 spots open");
    assert.equal(courtSpotsLabel(1, "en"), "1 spot open");
    assert.equal(courtSpotsLabel(0, "en"), "Court full");
  });
});

describe("courtSeatSubline", () => {
  it("names the side of the court, then the level when there is one", () => {
    assert.equal(courtSeatSubline("left", null, "en"), "Left");
    assert.match(courtSeatSubline("right", "B", "en"), /^Right · /);
  });

  it("puts the side first in Arabic, with the band isolated and no middle dot", () => {
    const subline = courtSeatSubline("left", "C", "ar");
    assert.match(subline, /^يسار، \u2068.+\u2069$/u);
    assert.doesNotMatch(subline, /·/);
  });
});

describe("courtSeatRow", () => {
  it("calls the viewer You and keeps the full name for the sheet", () => {
    const row = courtSeatRow(
      {
        userId: "u1",
        name: "Hassan Baji",
        image: null,
        levelBand: null,
      },
      "left",
      "u1",
      "en",
    );
    assert.equal(row.name, "You");
    assert.equal(row.fullName, "Hassan Baji");
    assert.equal(row.meta, "LEFT");
    assert.equal(row.unclaimed, false);
    assert.equal(courtSeatName(row, "en"), "Hassan B (You)");
  });
});

describe("courtFigures", () => {
  it("shows players, duration and a placeholder price", () => {
    const figures = courtFigures({
      seatedCount: 0,
      seatCount: 4,
      durationInMinutes: 90,
      pricePerPlayerFils: null,
      locale: "en",
    });
    assert.deepEqual(
      figures.map((figure) => [figure.value, figure.label, figure.unset]),
      [
        ["0/4", "Players", false],
        ["90m", "Duration", false],
        ["Not set", "Price", true],
      ],
    );
  });

  it("labels a set price per player", () => {
    const price = courtFigures({
      seatedCount: 4,
      seatCount: 4,
      durationInMinutes: null,
      pricePerPlayerFils: 0,
      locale: "en",
    })[2];
    assert.equal(price?.value, "Free");
    assert.equal(price?.label, "Per player");
  });

  it("puts the unset price in the value and Price in the label in Arabic", () => {
    const price = courtFigures({
      seatedCount: 1,
      seatCount: 4,
      durationInMinutes: 90,
      pricePerPlayerFils: null,
      locale: "ar",
    })[2];
    assert.equal(price?.value, "غير محدد");
    assert.equal(price?.label, "السعر");
  });
});

describe("score copy", () => {
  it("says why the score is locked", () => {
    assert.match(scoreLockedLine(false, "en"), /court is full/);
    assert.doesNotMatch(scoreLockedLine(true, "en"), /court is full/);
  });

  it("describes the Set count and the decider", () => {
    assert.equal(scoreSetsMeta(3, "en"), "Best of 3 sets");
    assert.equal(scoreSetsMeta(1, "en"), "1 set");
    assert.equal(scoreSetsMeta(2, "en"), "2 sets");
    assert.equal(scoreDeciderNote(3, "en"), "Set 3 only if it's 1–1.");
    assert.equal(scoreDeciderNote(1, "en"), null);
  });
});

describe("scoreTeamFirstNames", () => {
  it("pairs first names and marks an open spot", () => {
    assert.equal(
      scoreTeamFirstNames(
        {
          left: { name: "Hassan Baji" },
          right: { name: "Ali Mahmood" },
        },
        "en",
      ),
      "Hassan & Ali",
    );
    assert.equal(
      scoreTeamFirstNames({ left: { name: "Maya" }, right: null }, "en"),
      "Maya & Open",
    );
  });
});

describe("scoreLeadLine", () => {
  it("is empty before any Set is entered", () => {
    assert.equal(
      scoreLeadLine(
        match(0, 0, [
          [null, null],
          [null, null],
        ]),
        "team-a",
        "en",
      ),
      null,
    );
  });

  it("reads from the viewer's team", () => {
    const oneNil = match(1, 0, [
      [6, 4],
      [null, null],
    ]);
    assert.equal(scoreLeadLine(oneNil, "team-a", "en"), "Your team leads 1–0");
    assert.equal(scoreLeadLine(oneNil, "team-b", "en"), "Your team trails 0–1");
  });

  it("reads from Team A for someone who did not play", () => {
    const nilOne = match(0, 1, [[3, 6]]);
    assert.equal(scoreLeadLine(nilOne, null, "en"), "Team A trails 0–1");
    assert.equal(
      scoreLeadLine(
        match(1, 1, [
          [6, 4],
          [4, 6],
        ]),
        "x",
        "en",
      ),
      "Level at 1–1",
    );
  });
});

describe("court copy in Arabic", () => {
  it("counts spots and reads the lead in Arabic", () => {
    assert.equal(courtSpotsLabel(2, "ar"), "مكانان شاغران");
    assert.equal(courtSpotsLabel(0, "ar"), "الملعب ممتلئ");
    assert.equal(
      scoreLeadLine(match(1, 0, [[6, 4]]), "team-a", "ar"),
      "فريقك متقدم 1–0",
    );
  });
});
