import { LOCALES } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";
import { describe, expect, it } from "vitest";

import {
  DEFAULT_SERIES_COLOUR,
  DEFAULT_SERIES_EMBLEM,
  SERIES_COLOURS,
  SERIES_EMBLEMS,
  SERIES_NAME_MAX_LENGTH,
  carriesSeries,
  seriesEditionNumbers,
  seriesNameError,
  seriesWinRule,
  type SeriesCarrierGame,
} from "./series";

describe("Series badge lists", () => {
  it("opens the picker on Cup and Gold", () => {
    expect(SERIES_EMBLEMS[0]).toBe(DEFAULT_SERIES_EMBLEM);
    expect(SERIES_COLOURS[0]).toBe(DEFAULT_SERIES_COLOUR);
    expect(DEFAULT_SERIES_EMBLEM).toBe("cup");
    expect(DEFAULT_SERIES_COLOUR).toBe("gold");
  });

  it.each(LOCALES)("names every emblem and colour in %s", (locale) => {
    const { emblems, colours } = messagesFor(locale).series;
    expect(Object.keys(emblems)).toEqual([...SERIES_EMBLEMS]);
    expect(Object.keys(colours)).toEqual([...SERIES_COLOURS]);
  });
});

describe("seriesNameError", () => {
  const errors = messagesFor("en").series.errors;

  it("accepts a free name", () => {
    expect(seriesNameError("Sunday Social", ["Friday Classic"], "en")).toBe(
      null,
    );
  });

  it("refuses an empty name", () => {
    expect(seriesNameError("   ", [], "en")).toBe(errors.nameRequired);
  });

  it("refuses a name over the limit, counted after trimming", () => {
    const longest = "a".repeat(SERIES_NAME_MAX_LENGTH);
    expect(seriesNameError(`  ${longest}  `, [], "en")).toBe(null);
    expect(seriesNameError(`${longest}a`, [], "en")).toBe(
      errors.nameTooLong(SERIES_NAME_MAX_LENGTH),
    );
  });

  it("refuses a running Series' name, trimmed and without case", () => {
    expect(seriesNameError(" sunday social ", ["Sunday Social"], "en")).toBe(
      errors.nameTaken,
    );
  });

  it("answers in Arabic", () => {
    expect(seriesNameError("", [], "ar")).toBe(
      messagesFor("ar").series.errors.nameRequired,
    );
  });
});

describe("carriesSeries", () => {
  const groupGame: SeriesCarrierGame = {
    format: "friendly_game",
    groupId: "group-1",
    challengeId: null,
    poolCount: null,
    tournamentShape: null,
  };
  const social = (
    tournamentShape: string | null,
    poolCount: number | null,
  ): SeriesCarrierGame => ({
    ...groupGame,
    format: "friendly_tournament",
    tournamentShape,
    poolCount,
  });

  it.each([
    ["a padel Friendly game", groupGame],
    ["a football Game", groupGame],
    ["a Rounds Social", social("rounds", 1)],
    ["a Groups only Social", social("groups_only", 2)],
    ["a Groups then knockout Social", social("groups_then_knockout", 2)],
    ["a Knockout only Social", social("knockout_only", null)],
    ["a King of the court Social", social("king_of_the_court", null)],
    ["an Americano Social", social("americano", null)],
    ["a drawn tournament from before Tournament shapes", social(null, 2)],
  ])("carries a Series on %s", (_kind, game) => {
    expect(carriesSeries(game)).toBe(true);
  });

  it.each([
    ["the legacy Americano Game format", { ...groupGame, format: "americano" }],
    ["a hand-built legacy tournament", social(null, null)],
    ["a Challenge Game", { ...groupGame, challengeId: "challenge-1" }],
    ["a Booking Game", { ...groupGame, groupId: null }],
    ["a Public Game", { ...groupGame, groupId: null }],
    ["a groupless Social", { ...social("rounds", 1), groupId: null }],
  ])("carries no Series on %s", (_kind, game) => {
    expect(carriesSeries(game)).toBe(false);
  });
});

describe("seriesWinRule", () => {
  const social = (
    tournamentShape: string | null,
    poolCount: number | null,
  ) => ({
    format: "friendly_tournament",
    tournamentShape,
    poolCount,
  });

  it.each([
    [
      "a Friendly game",
      { format: "friendly_game", tournamentShape: null, poolCount: null },
      "side",
    ],
    ["a Rounds Social", social("rounds", 1), "table"],
    ["a Groups only Social with one Pool", social("groups_only", 1), "table"],
    ["a Groups only Social with two Pools", social("groups_only", 2), "tables"],
    [
      "a Groups then knockout Social",
      social("groups_then_knockout", 2),
      "champion",
    ],
    ["a Knockout only Social", social("knockout_only", null), "champion"],
    ["King of the court", social("king_of_the_court", null), "king"],
    ["an Americano", social("americano", null), "americano"],
  ] as const)("reads the rule of %s", (_kind, game, rule) => {
    expect(seriesWinRule(game)).toBe(rule);
  });
});

describe("seriesEditionNumbers", () => {
  const at = (iso: string) => new Date(iso);

  it("numbers from 1 by window start", () => {
    const numbers = seriesEditionNumbers([
      {
        id: "c",
        windowStart: at("2026-12-20T18:00:00Z"),
        createdAt: at("2026-11-01T00:00:00Z"),
      },
      {
        id: "a",
        windowStart: at("2026-12-06T18:00:00Z"),
        createdAt: at("2026-11-03T00:00:00Z"),
      },
      {
        id: "b",
        windowStart: at("2026-12-13T18:00:00Z"),
        createdAt: at("2026-11-02T00:00:00Z"),
      },
    ]);
    expect(Object.fromEntries(numbers)).toEqual({ a: 1, b: 2, c: 3 });
  });

  it("breaks a tie on the start by creation time, then by id", () => {
    const start = at("2026-12-06T18:00:00Z");
    const numbers = seriesEditionNumbers([
      {
        id: "later",
        windowStart: start,
        createdAt: at("2026-11-02T00:00:00Z"),
      },
      { id: "y", windowStart: start, createdAt: at("2026-11-01T00:00:00Z") },
      { id: "x", windowStart: start, createdAt: at("2026-11-01T00:00:00Z") },
    ]);
    expect(Object.fromEntries(numbers)).toEqual({ x: 1, y: 2, later: 3 });
  });

  it("returns an empty map for a Series with no Games", () => {
    expect(seriesEditionNumbers([]).size).toBe(0);
  });
});
