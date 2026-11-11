import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { latestMark, type LatestCabinet } from "./home-latest";

type ApiCabinet = LatestCabinet;

const NOW = new Date("2026-11-11T09:00:00.000Z");

const game = {
  name: "Tuesday Night Padel",
  hasCustomName: true,
  format: "friendly_game",
  windowStart: null,
  windowEnd: null,
  groupName: "Tuesday Night Padel",
  venueName: "Ace Padel",
};

function cabinet(playedAt: string, giverName: string | null): ApiCabinet {
  const kind = {
    kind: "clutch",
    group: "praise",
    count: 1,
    hiddenFromOthers: false,
    lastFrom: {
      giverUserId: "k",
      giverName,
      gameId: "g1",
      game,
      playedAt: new Date(playedAt),
    },
  };
  const empty = {
    total: 0,
    mvpCount: 0,
    mvpDecidedBy: {},
    kinds: [],
    kindsNotYet: 0,
  };
  return {
    hidden: false,
    isOwner: true,
    hideRoasts: false,
    sports: ["padel"],
    perSport: {
      padel: { ...empty, total: 1, kinds: [kind] },
      football: empty,
    },
  } as unknown as ApiCabinet;
}

describe("latestMark", () => {
  it("names the newest mark, who gave it and for which game", () => {
    const latest = latestMark(
      cabinet("2026-11-09T18:00:00.000Z", "Khalid Jassim"),
      ["padel"],
      NOW,
      "en",
    );
    assert.equal(latest?.title, "New mark from Khalid");
    assert.match(latest?.line ?? "", /, for Tuesday Night Padel$/);
    assert.equal(latest?.sport, "padel");
  });

  it("is old news after two weeks, and absent when the cabinet is hidden", () => {
    assert.equal(
      latestMark(
        cabinet("2026-10-01T18:00:00.000Z", "Khalid"),
        ["padel"],
        NOW,
        "en",
      ),
      null,
    );
    assert.equal(latestMark({ hidden: true }, ["padel"], NOW, "en"), null);
  });

  it("only reads the sports Home shows", () => {
    assert.equal(
      latestMark(
        cabinet("2026-11-09T18:00:00.000Z", "Khalid"),
        ["football"],
        NOW,
        "en",
      ),
      null,
    );
  });
});
