import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  HISTORY_PAGE_SIZE,
  matchHistoryCardModel,
  nextHistoryCursor,
  setTally,
  viewerFirst,
  viewerSets,
  type HistoryRowInput,
} from "./match-history-card";

const member = (id: string, name: string, isViewer = false) => ({
  id,
  name,
  image: null,
  isViewer,
});

function row(overrides: Partial<HistoryRowInput> = {}): HistoryRowInput {
  return {
    name: null,
    hasCustomName: false,
    format: "friendly_game",
    windowStart: null,
    windowEnd: null,
    sport: "padel",
    groupName: " Tuesday ",
    venue: { name: "Padelhuset" },
    displayTime: new Date("2020-01-01T10:00:00Z"),
    slot1Members: [member("a", "Ada Lovelace"), member("v", "Vi Viewer", true)],
    slot2Members: [member("c", "Cy Dee")],
    scoredSets: [
      { slot1GamesWon: 6, slot2GamesWon: 3 },
      { slot1GamesWon: 4, slot2GamesWon: 6 },
    ],
    viewerSlot: 1,
    outcome: "won",
    rated: true,
    ...overrides,
  };
}

describe("matchHistoryCardModel unrated mark", () => {
  it("leaves a rated Match unmarked", () => {
    const model = matchHistoryCardModel(row(), "en");
    assert.equal(model.unrated, false);
    assert.ok(!model.meta.includes("Unrated"));
  });

  it("marks an unrated Match in the meta line", () => {
    const model = matchHistoryCardModel(row({ rated: false }), "en");
    assert.equal(model.unrated, true);
    assert.ok(model.meta.endsWith(" · Unrated"));
  });
});

describe("viewerSets", () => {
  it("reads scores off the viewer's slot", () => {
    assert.deepEqual(viewerSets(row({ viewerSlot: 2 })), [
      { us: 3, them: 6 },
      { us: 6, them: 4 },
    ]);
  });
});

describe("setTally", () => {
  it("ignores drawn sets", () => {
    assert.deepEqual(
      setTally([
        { us: 6, them: 3 },
        { us: 5, them: 5 },
        { us: 1, them: 6 },
      ]),
      { won: 1, lost: 1 },
    );
  });
});

describe("viewerFirst", () => {
  it("moves the viewer to the front", () => {
    const members = [member("a", "A"), member("v", "V", true)];
    assert.deepEqual(
      viewerFirst(members).map((entry) => entry.id),
      ["v", "a"],
    );
  });
});

describe("nextHistoryCursor", () => {
  it("is undefined on a short page", () => {
    assert.equal(
      nextHistoryCursor([{ displayTime: new Date(), matchId: "m" }]),
      undefined,
    );
  });

  it("points at the last row of a full page", () => {
    const page = Array.from({ length: HISTORY_PAGE_SIZE }, (_, index) => ({
      displayTime: new Date(index),
      matchId: `m${index}`,
    }));
    assert.deepEqual(nextHistoryCursor(page), {
      displayTime: new Date(HISTORY_PAGE_SIZE - 1),
      matchId: `m${HISTORY_PAGE_SIZE - 1}`,
    });
  });
});

describe("matchHistoryCardModel", () => {
  it("leads with the viewer's team on a win and mutes the losers", () => {
    const model = matchHistoryCardModel(row(), "en");
    assert.deepEqual(
      model.teams.map((team) => [team.side, team.lost, team.note]),
      [
        ["mine", false, "Your team, won"],
        ["theirs", true, "Lost"],
      ],
    );
    assert.equal(model.teams[0]!.label, "You, Ada L");
    assert.equal(model.groupName, "Tuesday");
    assert.equal(model.sport, "Padel");
    assert.equal(model.scoreLine, "1–1 in sets");
  });

  it("keeps the viewer's team first on a loss", () => {
    const model = matchHistoryCardModel(row({ outcome: "lost" }), "en");
    assert.deepEqual(
      model.teams.map((team) => [team.side, team.lost, team.note]),
      [
        ["mine", true, "Your team"],
        ["theirs", false, "Won"],
      ],
    );
  });

  it("mutes neither side on a draw", () => {
    const model = matchHistoryCardModel(row({ outcome: "draw" }), "en");
    assert.deepEqual(
      model.teams.map((team) => team.lost),
      [false, false],
    );
    assert.equal(model.teams[1]!.note, "Drew");
  });

  it("mutes each lost set on its own side", () => {
    const model = matchHistoryCardModel(row(), "en");
    assert.deepEqual(model.teams[0]!.scores, [
      { games: 6, lostSet: false },
      { games: 4, lostSet: true },
    ]);
  });

  it("reads one set as its own score", () => {
    const model = matchHistoryCardModel(
      row({
        sport: "football",
        scoredSets: [{ slot1GamesWon: 12, slot2GamesWon: 9 }],
      }),
      "en",
    );
    assert.equal(model.scoreLine, "12–9");
    assert.equal(model.sport, "Football");
  });

  it("stacks three avatars and counts the rest in the label", () => {
    const model = matchHistoryCardModel(
      row({
        slot1Members: [
          member("a", "Ada Lovelace"),
          member("v", "Vi Viewer", true),
          member("b", "Bo Fareed"),
          member("c", "Cy Dee"),
          member("d", "Di Eve"),
        ],
      }),
      "en",
    );
    assert.deepEqual(
      model.teams[0]!.avatars.map((entry) => entry.id),
      ["v", "a", "b"],
    );
    assert.equal(model.teams[0]!.label, "You, Ada L +3");
  });

  it("has no scores until a set is scored", () => {
    const model = matchHistoryCardModel(row({ scoredSets: [] }), "en");
    assert.equal(model.scored, false);
    assert.equal(model.scoreLine, "No score yet");
    assert.equal(model.teams[0]!.scores, null);
  });

  it("names the venue only when the Game name matches it", () => {
    assert.ok(
      matchHistoryCardModel(row({ name: "Padelhuset" }), "en").meta.endsWith(
        ", Padelhuset",
      ),
    );
    const named = matchHistoryCardModel(row({ name: "Cup" }), "en");
    assert.ok(named.meta.endsWith(", Padelhuset · Cup"));
    assert.equal(named.place, "Padelhuset · Cup");
  });

  it("names a Game by its window in the viewer's locale", () => {
    const model = matchHistoryCardModel(
      row({
        name: "Wed 10:30 AM - 12:00 PM",
        windowStart: "2026-11-04T07:30:00.000Z",
        windowEnd: "2026-11-04T09:00:00.000Z",
      }),
      "ar",
    );
    assert.ok(model.place.endsWith("الأربعاء، 10:30 ص – 12:00 م"));
  });

  it("marks an unrated Match on the place line", () => {
    assert.equal(
      matchHistoryCardModel(row({ rated: false }), "en").place,
      "Padelhuset · Unrated",
    );
  });

  it("reads in Arabic", () => {
    const model = matchHistoryCardModel(row({ rated: false }), "ar");
    assert.ok(model.place.endsWith(" · غير مصنّفة"));
    assert.equal(model.teams[0]!.note, "فريقك، فاز");
    assert.equal(model.teams[1]!.note, "خسر");
  });
});
