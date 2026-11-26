import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  latestMark,
  latestSeriesWin,
  latestUpdate,
  type LatestCabinet,
  type LatestSeriesWins,
} from "./home-latest";

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

function seriesWins(
  wonAt: string,
  win: Partial<
    Extract<LatestSeriesWins, { hidden: false }>["wins"][number]
  > = {},
): LatestSeriesWins {
  return {
    hidden: false,
    badges: [
      {
        seriesId: "s1",
        name: "Friday Classic",
        emblem: "ball",
        colour: "teal",
      },
    ],
    wins: [
      {
        gameId: "g30",
        seriesId: "s1",
        edition: 30,
        wonAt: new Date(wonAt),
        ordinal: 2,
        with: { names: [], bib: "black", score: { mine: 5, theirs: 3 } },
        ...win,
      },
      {
        gameId: "g12",
        seriesId: "s1",
        edition: 12,
        wonAt: new Date("2026-09-01T18:00:00.000Z"),
        ordinal: 1,
        with: { names: [], bib: null, score: null },
      },
    ],
  };
}

describe("latestSeriesWin", () => {
  it("names the newest win, its Edition, who it was won with and which win it was", () => {
    const latest = latestSeriesWin(
      seriesWins("2026-11-04T19:00:00.000Z"),
      NOW,
      "en",
    );
    assert.deepEqual(latest, {
      type: "series",
      key: "series:g30",
      gameId: "g30",
      emblem: "ball",
      colour: "teal",
      title: "Series win: Friday Classic",
      line: "Edition 30 with Black, 5–3. Your 2nd",
      at: new Date("2026-11-04T19:00:00.000Z"),
    });
  });

  it("uses the partner's short name, and leaves out who when there is nobody", () => {
    const partner = latestSeriesWin(
      seriesWins("2026-11-04T19:00:00.000Z", {
        with: { names: ["Khalid Janahi"], bib: null, score: null },
      }),
      NOW,
      "en",
    );
    assert.equal(partner?.line, "Edition 30 with Khalid J. Your 2nd");
    const nobody = latestSeriesWin(
      seriesWins("2026-11-04T19:00:00.000Z", {
        edition: 12,
        ordinal: 1,
        with: { names: [], bib: null, score: null },
      }),
      NOW,
      "en",
    );
    assert.equal(nobody?.line, "Edition 12. Your 1st");
  });

  it("reads in Arabic", () => {
    const latest = latestSeriesWin(
      seriesWins("2026-11-04T19:00:00.000Z"),
      NOW,
      "ar",
    );
    assert.equal(latest?.title, "فوز في سلسلة: \u2068Friday Classic\u2069");
    assert.equal(
      latest?.line,
      "النسخة 30 مع \u2068أسود، \u20685–3\u2069\u2069. فوزك الثاني",
    );
  });

  it("is old news after two weeks, and absent when hidden", () => {
    assert.equal(
      latestSeriesWin(seriesWins("2026-10-27T08:59:00.000Z"), NOW, "en"),
      null,
    );
    assert.notEqual(
      latestSeriesWin(seriesWins("2026-10-28T09:00:00.000Z"), NOW, "en"),
      null,
    );
    assert.equal(latestSeriesWin({ hidden: true }, NOW, "en"), null);
    assert.equal(latestSeriesWin(undefined, NOW, "en"), null);
  });
});

describe("latestUpdate", () => {
  const mark = latestMark(
    cabinet("2026-11-09T18:00:00.000Z", "Khalid Jassim"),
    ["padel"],
    NOW,
    "en",
  );
  const olderWin = latestSeriesWin(
    seriesWins("2026-11-04T19:00:00.000Z"),
    NOW,
    "en",
  );
  const newerWin = latestSeriesWin(
    seriesWins("2026-11-10T19:00:00.000Z"),
    NOW,
    "en",
  );

  it("picks the newer of a Mark and a Series win", () => {
    assert.equal(latestUpdate(mark, olderWin)?.type, "mark");
    assert.equal(latestUpdate(mark, olderWin)?.title, "New mark from Khalid");
    assert.equal(latestUpdate(mark, newerWin)?.type, "series");
    assert.equal(latestUpdate(mark, newerWin)?.key, "series:g30");
  });

  it("takes the one that exists, or nothing", () => {
    assert.equal(latestUpdate(null, olderWin)?.type, "series");
    assert.equal(latestUpdate(mark, null)?.type, "mark");
    assert.equal(latestUpdate(null, null), null);
  });

  it("does not bring back a win older than two weeks", () => {
    const stale = latestSeriesWin(
      seriesWins("2026-10-01T19:00:00.000Z"),
      NOW,
      "en",
    );
    assert.equal(latestUpdate(mark, stale)?.type, "mark");
  });
});
