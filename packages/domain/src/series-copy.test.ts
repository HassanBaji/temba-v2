import { describe, expect, it } from "vitest";

import { seriesRowLine, seriesWinnersLine } from "./series-copy";

const NOW = new Date("2026-11-21T10:00:00Z");
const MARCH = new Date("2026-03-14T18:00:00Z");
const LAST_MARCH = new Date("2025-03-14T18:00:00Z");

const running = {
  sport: "padel" as const,
  kind: "social" as const,
  next: null,
  endedAt: null,
};

describe("seriesRowLine", () => {
  it.each([
    [0, "Padel social. Not played yet"],
    [1, "Padel social. 1 played"],
    [2, "Padel social. 2 played"],
    [3, "Padel social. 3 played"],
    [11, "Padel social. 11 played"],
  ])("counts %i played in English", (playedCount, line) => {
    expect(seriesRowLine({ ...running, playedCount }, "en", NOW)).toBe(line);
  });

  it.each([
    [0, "سوشيال بادل. لم تُلعب بعد"],
    [1, "سوشيال بادل. لُعبت نسخة واحدة"],
    [2, "سوشيال بادل. لُعبت نسختان"],
    [3, "سوشيال بادل. لُعبت 3 نسخ"],
    [11, "سوشيال بادل. لُعبت 11 نسخة"],
  ])("counts %i played in Arabic", (playedCount, line) => {
    expect(seriesRowLine({ ...running, playedCount }, "ar", NOW)).toBe(line);
  });

  it("names the next Edition", () => {
    const row = { ...running, playedCount: 11, next: { edition: 12 } };
    expect(seriesRowLine(row, "en", NOW)).toBe(
      "Padel social. 11 played, next is edition 12",
    );
    expect(seriesRowLine(row, "ar", NOW)).toBe(
      "سوشيال بادل. لُعبت 11 نسخة، والتالية النسخة 12",
    );
  });

  it("reads the kind of the most recent Edition", () => {
    const row = { ...running, kind: "game" as const, playedCount: 31 };
    expect(seriesRowLine(row, "en", NOW)).toBe("Padel game. 31 played");
    expect(
      seriesRowLine({ ...row, sport: "football", playedCount: 2 }, "ar", NOW),
    ).toBe("مباراة كرة قدم. لُعبت نسختان");
  });

  it("says a Series with no Edition is not played yet", () => {
    const row = { ...running, kind: null, playedCount: 0 };
    expect(seriesRowLine(row, "en", NOW)).toBe("Padel series. Not played yet");
    expect(seriesRowLine(row, "ar", NOW)).toBe("سلسلة بادل. لم تُلعب بعد");
  });

  it("says when an ended Series ended, with the year when it is not this year", () => {
    const ended = { ...running, playedCount: 8, endedAt: MARCH };
    expect(seriesRowLine(ended, "en", NOW)).toBe(
      "Padel social. 8 played, ended in March",
    );
    expect(seriesRowLine({ ...ended, endedAt: LAST_MARCH }, "en", NOW)).toBe(
      "Padel social. 8 played, ended in March 2025",
    );
    expect(seriesRowLine(ended, "ar", NOW)).toBe(
      "سوشيال بادل. لُعبت 8 نسخ، وانتهت في مارس",
    );
    expect(seriesRowLine({ ...ended, endedAt: LAST_MARCH }, "ar", NOW)).toBe(
      "سوشيال بادل. لُعبت 8 نسخ، وانتهت في مارس 2025",
    );
  });

  it("does not name a next Edition on an ended Series", () => {
    const ended = {
      ...running,
      playedCount: 0,
      next: { edition: 1 },
      endedAt: MARCH,
    };
    expect(seriesRowLine(ended, "en", NOW)).toBe(
      "Padel social. 0 played, ended in March",
    );
    expect(seriesRowLine(ended, "ar", NOW)).toBe(
      "سوشيال بادل. لم تُلعب أي نسخة، وانتهت في مارس",
    );
  });
});

const qasim = { name: "Qasim Albaqali" };
const ahmed = { name: "Ahmed Buhazza" };
const layla = { name: "Layla Haddad" };
const nora = { name: "Nora Nasser" };
const reem = { name: "Reem Faraj" };

const ISOLATE_START = "⁨";
const ISOLATE_END = "⁩";
const isolated = (name: string) => `${ISOLATE_START}${name}${ISOLATE_END}`;

describe("seriesWinnersLine", () => {
  it("is empty with no winner", () => {
    expect(seriesWinnersLine([], null, "en")).toBe("");
  });

  it("names one winner by the short name", () => {
    expect(seriesWinnersLine([layla], null, "en")).toBe("Layla H");
    expect(seriesWinnersLine([layla], null, "ar")).toBe("Layla H");
  });

  it("joins two winners", () => {
    expect(seriesWinnersLine([qasim, ahmed], null, "en")).toBe(
      "Qasim A and Ahmed B",
    );
    expect(seriesWinnersLine([qasim, ahmed], null, "ar")).toBe(
      `${isolated("Qasim A")} و${isolated("Ahmed B")}`,
    );
  });

  it.each([
    [3, [qasim, ahmed, layla], "Qasim A, Ahmed B and 1 more"],
    [4, [qasim, ahmed, layla, nora], "Qasim A, Ahmed B and 2 more"],
    [5, [qasim, ahmed, layla, nora, reem], "Qasim A, Ahmed B and 3 more"],
  ])(
    "names the first two of %i winners and counts the rest in English",
    (_, winners, line) => {
      expect(seriesWinnersLine(winners, null, "en")).toBe(line);
    },
  );

  it.each([
    [3, [qasim, ahmed, layla], "وشخص آخر"],
    [4, [qasim, ahmed, layla, nora], "وشخصان آخران"],
    [5, [qasim, ahmed, layla, nora, reem], "و3 آخرين"],
  ])(
    "names the first two of %i winners and counts the rest in Arabic",
    (_, winners, rest) => {
      expect(seriesWinnersLine(winners, null, "ar")).toBe(
        `${isolated("Qasim A")} و${isolated("Ahmed B")} ${rest}`,
      );
    },
  );

  it("names a football side by its Bib colour", () => {
    expect(seriesWinnersLine([qasim, ahmed, layla], "black", "en")).toBe(
      "Black",
    );
    expect(seriesWinnersLine([qasim, ahmed, layla], "navy", "ar")).toBe(
      "أزرق داكن",
    );
  });
});
