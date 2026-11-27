import assert from "node:assert/strict";
import { describe, it } from "vitest";

import type { LatestCabinet, LatestSeriesWins } from "@repo/domain/home-latest";

import {
  homeLatest,
  latestTarget,
  levelFromApi,
  noLevelCopy,
  standingInSport,
} from "./home-model";
import type { RouterOutputs } from "../trpc/react";

type ApiRating = RouterOutputs["ratings"]["me"];

describe("levelFromApi", () => {
  it("has no Level before the first Rating in a sport", () => {
    const data = {
      face: "level",
      ovr: null,
      levelValue: null,
      rating: null,
      canSelfDeclare: true,
      progressPercent: null,
      nextBand: null,
      history: [],
      historySteps: [],
      historyMatchCount: 0,
      ratedMatchCount: 0,
      changeOverLast: null,
      lastMatch: null,
      reliability: null,
    } as ApiRating;
    assert.deepEqual(levelFromApi(data), { kind: "none" });
    assert.equal(
      noLevelCopy("football", "en"),
      "Play a rated football game and your football Level appears.",
    );
  });

  it("carries what the Ratings screen reads: the Level, its status and the last counting Matches", () => {
    const data = {
      face: "level",
      rating: {
        levelBand: "C3",
        level: "2.8",
        provisional: true,
        ratedMatchesRemaining: 3,
      },
      levelValue: 2.79,
      ratedMatchCount: 2,
      changeOverLast: { matches: 2, delta: -0.4, points: [3.19, 2.79] },
      lastMatch: null,
      history: ["3.19", "2.79"],
      historySteps: ["lost"],
      historyMatchCount: 1,
    } as unknown as ApiRating;
    assert.deepEqual(levelFromApi(data), {
      kind: "rated",
      input: {
        sport: "padel",
        face: "level",
        levelValue: 2.79,
        rating: {
          levelBand: "C3",
          provisional: true,
          ratedMatchesRemaining: 3,
        },
        ratedMatchCount: 2,
        changeOverLast: { matches: 2, delta: -0.4, points: [3.19, 2.79] },
        lastMatch: null,
        history: ["3.19", "2.79"],
        historySteps: ["lost"],
        historyMatchCount: 1,
      },
    });
  });

  it("reads a football Level on the OVR face", () => {
    const data = {
      face: "ovr",
      ovr: 72,
      rating: {
        levelBand: "C1",
        level: "3.9",
        provisional: true,
        ratedMatchesRemaining: 5,
      },
      levelValue: 3.9,
      ratedMatchCount: 0,
      changeOverLast: null,
      lastMatch: null,
    } as unknown as ApiRating;
    const level = levelFromApi(data);
    if (level.kind !== "rated") throw new Error("Expected a rated Level");
    assert.equal(level.input.sport, "football");
    assert.equal(level.input.face, "ovr");
  });
});

describe("per-sport sections", () => {
  it("keeps the Standing of Groups in the chosen sport, a Group with no sport being padel", () => {
    const rows = [
      {
        groupId: "a",
        groupName: "Ladder",
        sport: "padel",
        position: 2,
        memberCount: 8,
      },
      {
        groupId: "b",
        groupName: "First football",
        sport: "football",
        position: 1,
        memberCount: 1,
      },
      {
        groupId: "c",
        groupName: "Old group",
        sport: null,
        position: 3,
        memberCount: 4,
      },
    ];
    assert.deepEqual(
      standingInSport(rows, "padel").map((row) => row.groupId),
      ["a", "c"],
    );
    assert.deepEqual(
      standingInSport(rows, "football").map((row) => row.groupId),
      ["b"],
    );
  });

  it("reads its labels from the Arabic catalog", () => {
    assert.equal(
      noLevelCopy("padel", "ar"),
      "العب مباراة بادل مصنّفة ويظهر مستواك في البادل.",
    );
  });
});

describe("homeLatest", () => {
  const NOW = new Date("2026-11-21T09:00:00.000Z");

  function cabinet(playedAt: string): LatestCabinet {
    const kind = {
      kind: "clutch" as const,
      lastFrom: {
        giverName: "Khalid Jassim",
        gameId: "mark-game",
        game: {
          name: "Tuesday Night Padel",
          hasCustomName: true,
          format: "friendly_game",
          windowStart: null,
          windowEnd: null,
          groupName: "Tuesday Night Padel",
        },
        playedAt: new Date(playedAt),
      },
    };
    return {
      hidden: false,
      perSport: { padel: { kinds: [kind] }, football: { kinds: [] } },
    };
  }

  function seriesWins(wonAt: string): LatestSeriesWins {
    return {
      hidden: false,
      badges: [
        {
          seriesId: "friday",
          name: "Friday Classic",
          emblem: "flame",
          colour: "red",
        },
      ],
      wins: [
        {
          gameId: "friday-30",
          seriesId: "friday",
          edition: 30,
          wonAt: new Date(wonAt),
          ordinal: 2,
          with: { names: [], bib: "black", score: { mine: 5, theirs: 3 } },
        },
      ],
    };
  }

  const input = {
    sports: ["padel" as const],
    seen: null,
    now: NOW,
  };

  it("shows the Mark when it is newer than the Series win, and opens the marks", () => {
    const latest = homeLatest(
      {
        ...input,
        cabinet: cabinet("2026-11-19T18:00:00.000Z"),
        seriesWins: seriesWins("2026-11-13T20:00:00.000Z"),
      },
      "en",
    );
    assert.equal(latest?.type, "mark");
    assert.equal(latest?.title, "New mark from Khalid");
    assert.deepEqual(latest && latestTarget(latest, "me"), {
      kind: "marks",
      userId: "me",
      sport: "padel",
    });
  });

  it("shows the Series win when it is the newest news, and opens its Game", () => {
    const latest = homeLatest(
      {
        ...input,
        cabinet: cabinet("2026-11-10T18:00:00.000Z"),
        seriesWins: seriesWins("2026-11-13T20:00:00.000Z"),
      },
      "en",
    );
    assert.deepEqual(latest && { ...latest, at: undefined }, {
      type: "series",
      key: "series:friday-30",
      gameId: "friday-30",
      emblem: "flame",
      colour: "red",
      title: "Series win: Friday Classic",
      line: "Edition 30 with Black, 5–3. Your 2nd",
      at: undefined,
    });
    assert.deepEqual(latest && latestTarget(latest, "me"), {
      kind: "game",
      gameId: "friday-30",
    });
  });

  it("hides the row once this device opened it, and a Series win past 14 days", () => {
    assert.equal(
      homeLatest(
        {
          ...input,
          seen: "series:friday-30",
          cabinet: undefined,
          seriesWins: seriesWins("2026-11-13T20:00:00.000Z"),
        },
        "en",
      ),
      null,
    );
    assert.equal(
      homeLatest(
        {
          ...input,
          cabinet: { hidden: true },
          seriesWins: seriesWins("2026-11-01T20:00:00.000Z"),
        },
        "en",
      ),
      null,
    );
  });
});
