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
    ...overrides,
  };
}

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
  it("fills the winners and leads with the viewer's team on a win", () => {
    const model = matchHistoryCardModel(row());
    assert.deepEqual(
      model.teams.map((team) => [team.side, team.filled, team.outlined]),
      [
        ["mine", true, false],
        ["theirs", false, false],
      ],
    );
    assert.equal(model.teams[0]!.label, "You and Ada L");
    assert.equal(model.groupName, "Tuesday");
    assert.deepEqual(model.tally, { won: 1, lost: 1 });
  });

  it("puts the winning opponents first on a loss", () => {
    const model = matchHistoryCardModel(row({ outcome: "lost" }));
    assert.deepEqual(
      model.teams.map((team) => [team.side, team.filled, team.outlined]),
      [
        ["theirs", true, false],
        ["mine", false, true],
      ],
    );
    assert.equal(model.teams[0]!.note, "Winners");
  });

  it("has no scores until a set is scored", () => {
    const model = matchHistoryCardModel(row({ scoredSets: [] }));
    assert.equal(model.scored, false);
    assert.equal(model.teams[0]!.scores, null);
  });

  it("names the venue only when the Game name matches it", () => {
    assert.ok(
      matchHistoryCardModel(row({ name: "Padelhuset" })).meta.endsWith(
        ", Padelhuset",
      ),
    );
    assert.ok(
      matchHistoryCardModel(row({ name: "Cup" })).meta.endsWith(
        ", Padelhuset · Cup",
      ),
    );
  });
});
