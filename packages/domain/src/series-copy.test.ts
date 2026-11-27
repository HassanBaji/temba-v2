import { describe, expect, it } from "vitest";

import {
  seriesEditionFieldLine,
  seriesNextEditionLines,
  seriesPageSince,
  seriesRowLine,
  seriesRuleLine,
  seriesViewerLine,
  seriesWinOrdinal,
  seriesWinTally,
  seriesWinWho,
  seriesWinWithLine,
  seriesWinnerLine,
  seriesWinnersLine,
  seriesWonLastLine,
} from "./series-copy";

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

describe("seriesPageSince", () => {
  it("names the month a running Series was created", () => {
    const series = { createdAt: MARCH, endedAt: null };
    expect(seriesPageSince(series, "en", NOW)).toEqual({
      value: "Mar",
      label: "running since",
    });
    expect(seriesPageSince(series, "ar", NOW).label).toBe("جارية منذ");
  });

  it("adds the year when it is not this year", () => {
    expect(
      seriesPageSince({ createdAt: LAST_MARCH, endedAt: null }, "en", NOW),
    ).toEqual({ value: "Mar 2025", label: "running since" });
  });

  it("names the month an ended Series ended", () => {
    const series = { createdAt: LAST_MARCH, endedAt: MARCH };
    expect(seriesPageSince(series, "en", NOW)).toEqual({
      value: "Mar",
      label: "ended",
    });
    expect(seriesPageSince(series, "ar", NOW)).toEqual({
      value: "مارس",
      label: "انتهت",
    });
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

describe("seriesRuleLine", () => {
  it.each([
    [
      "side",
      "Every player on the winning side gets the badge. A draw gives it to nobody.",
      "ينال الشارة كل لاعب في الجانب الفائز. التعادل لا يمنحها لأحد.",
    ],
    [
      "table",
      "Top of the table wins edition 12 and the badge.",
      "متصدّر الجدول يفوز بالنسخة 12 وبالشارة.",
    ],
    [
      "tables",
      "Top of each group wins edition 12 and the badge.",
      "متصدّر كل مجموعة يفوز بالنسخة 12 وبالشارة.",
    ],
    [
      "champion",
      "The champion wins edition 12 and the badge.",
      "البطل يفوز بالنسخة 12 وبالشارة.",
    ],
    [
      "king",
      "The king of the court wins edition 12 and the badge.",
      "ملك الملعب يفوز بالنسخة 12 وبالشارة.",
    ],
    [
      "americano",
      "Top of the standings wins edition 12 and the badge.",
      "متصدّر الترتيب يفوز بالنسخة 12 وبالشارة.",
    ],
  ] as const)("says what wins by the %s rule", (rule, en, ar) => {
    expect(seriesRuleLine(rule, 12, "en")).toBe(en);
    expect(seriesRuleLine(rule, 12, "ar")).toBe(ar);
  });
});

describe("seriesWonLastLine", () => {
  it("names who won the last Edition", () => {
    const last = { winners: [layla, nora], winnerBib: null };
    expect(seriesWonLastLine(last, "en")).toBe(
      "Layla H and Nora N won the last one.",
    );
    expect(seriesWonLastLine(last, "ar")).toBe(
      `النسخة السابقة كانت من نصيب ${isolated(
        `${isolated("Layla H")} و${isolated("Nora N")}`,
      )}.`,
    );
  });

  it("names a football side by its Bib", () => {
    expect(
      seriesWonLastLine({ winners: [qasim], winnerBib: "black" }, "en"),
    ).toBe("Black won the last one.");
  });

  it("is null with no earlier winner", () => {
    expect(seriesWonLastLine(null, "en")).toBeNull();
    expect(seriesWonLastLine({ winners: [], winnerBib: null }, "ar")).toBe(
      null,
    );
  });
});

describe("seriesWinOrdinal", () => {
  it.each([
    [1, "Qasim’s 1st", "Your 1st"],
    [2, "Qasim’s 2nd", "Your 2nd"],
    [3, "Qasim’s 3rd", "Your 3rd"],
    [11, "Qasim’s 11th", "Your 11th"],
  ])("counts the %i win in English", (n, named, own) => {
    expect(seriesWinOrdinal("Qasim", n, "en")).toBe(named);
    expect(seriesWinOrdinal(null, n, "en")).toBe(own);
  });

  it.each([
    [1, "الأول"],
    [2, "الثاني"],
    [3, "الثالث"],
    [11, "رقم 11"],
  ])("counts the %i win in Arabic", (n, place) => {
    expect(seriesWinOrdinal("Qasim", n, "ar")).toBe(
      `الفوز ${place} لـ${isolated("Qasim")}`,
    );
    expect(seriesWinOrdinal(null, n, "ar")).toBe(`فوزك ${place}`);
  });
});

describe("seriesWinTally", () => {
  it("says a first win is new on the profile", () => {
    const winner = { tally: "new", levelWith: null } as const;
    expect(seriesWinTally(winner, "en")).toBe("new on the profile");
    expect(seriesWinTally(winner, "ar")).toBe("شارة جديدة على الملف الشخصي");
  });

  it("says a sole leader has the most", () => {
    const winner = { tally: "most", levelWith: null } as const;
    expect(seriesWinTally(winner, "en")).toBe("most of anyone");
    expect(seriesWinTally(winner, "ar")).toBe("الأكثر فوزًا");
  });

  it("names the one player level with the leader by first name", () => {
    const winner = {
      tally: "level",
      levelWith: { name: "Layla Haddad" },
    } as const;
    expect(seriesWinTally(winner, "en")).toBe(
      "most of anyone, level with Layla",
    );
    expect(seriesWinTally(winner, "ar")).toBe(
      `الأكثر فوزًا، بالتساوي مع ${isolated("Layla")}`,
    );
  });

  it.each([
    [1, "most of anyone, level with 1 other", "بالتساوي مع شخص آخر"],
    [2, "most of anyone, level with 2 others", "بالتساوي مع شخصين آخرين"],
    [3, "most of anyone, level with 3 others", "بالتساوي مع 3 آخرين"],
    [11, "most of anyone, level with 11 others", "بالتساوي مع 11 آخرين"],
  ])("counts %i others level with the leader", (count, en, ar) => {
    const winner = { tally: "level", levelWith: { count } } as const;
    expect(seriesWinTally(winner, "en")).toBe(en);
    expect(seriesWinTally(winner, "ar")).toBe(`الأكثر فوزًا، ${ar}`);
  });

  it("says nothing for a player behind the leader", () => {
    const winner = { tally: null, levelWith: null };
    expect(seriesWinTally(winner, "en")).toBeNull();
    expect(seriesWinTally(winner, "ar")).toBeNull();
  });
});

const withKhalid = { names: ["Khalid Janahi"], bib: null, score: null };
const withBlack = {
  names: [],
  bib: "black" as const,
  score: { mine: 5, theirs: 3 },
};
const alone = { names: [], bib: null, score: null };

describe("seriesWinWho", () => {
  it("names the partner in full or short", () => {
    expect(seriesWinWho(withKhalid, "full", "en")).toBe("Khalid Janahi");
    expect(seriesWinWho(withKhalid, "short", "en")).toBe("Khalid J");
    expect(seriesWinWho(withKhalid, "short", "ar")).toBe("Khalid J");
  });

  it("names a football side by its Bib and the score from that side", () => {
    expect(seriesWinWho(withBlack, "short", "en")).toBe("Black, 5–3");
    expect(seriesWinWho(withBlack, "full", "ar")).toBe(
      `أسود، ${isolated("5–3")}`,
    );
    expect(seriesWinWho({ ...withBlack, score: null }, "full", "en")).toBe(
      "Black",
    );
  });

  it("is null with nobody to name", () => {
    expect(seriesWinWho(alone, "full", "en")).toBeNull();
  });
});

describe("seriesWinWithLine", () => {
  it("reads the row form", () => {
    expect(seriesWinWithLine(withKhalid, "en")).toBe("With Khalid Janahi");
    expect(seriesWinWithLine(withBlack, "en")).toBe("With Black, 5–3");
    expect(seriesWinWithLine(withKhalid, "ar")).toBe(
      `مع ${isolated("Khalid Janahi")}`,
    );
  });

  it("is null on an Americano", () => {
    expect(seriesWinWithLine(alone, "en")).toBeNull();
    expect(seriesWinWithLine(alone, "ar")).toBeNull();
  });
});

describe("seriesWinnerLine", () => {
  it("names the one Edition won, else the latest", () => {
    expect(seriesWinnerLine({ wins: 1, lastWonEdition: 1 }, "en")).toBe(
      "Won edition 1",
    );
    expect(seriesWinnerLine({ wins: 3, lastWonEdition: 12 }, "en")).toBe(
      "Last won edition 12",
    );
    expect(seriesWinnerLine({ wins: 1, lastWonEdition: 4 }, "ar")).toBe(
      "فاز بالنسخة 4",
    );
  });
});

describe("seriesEditionFieldLine", () => {
  it("counts teams, with the winners' points on a table", () => {
    expect(
      seriesEditionFieldLine(
        { field: { unit: "teams", count: 8 }, points: 19, score: null },
        "en",
      ),
    ).toBe("8 teams, 19 points");
    expect(
      seriesEditionFieldLine(
        { field: { unit: "teams", count: 6 }, points: null, score: null },
        "en",
      ),
    ).toBe("6 teams");
  });

  it("counts players and games won on an Americano", () => {
    expect(
      seriesEditionFieldLine(
        { field: { unit: "players", count: 8 }, points: 32, score: null },
        "en",
      ),
    ).toBe("8 players, 32 games won");
  });

  it("gives a football Game's score from the winning side, and nothing with neither", () => {
    expect(
      seriesEditionFieldLine(
        { field: null, points: null, score: { winner: 5, loser: 3 } },
        "en",
      ),
    ).toBe("5–3");
    expect(
      seriesEditionFieldLine({ field: null, points: null, score: null }, "en"),
    ).toBeNull();
    expect(
      seriesEditionFieldLine(
        { field: { unit: "teams", count: 2 }, points: null, score: null },
        "ar",
      ),
    ).toBe("فريقان");
  });
});

describe("seriesNextEditionLines", () => {
  const next = {
    edition: 13,
    startsAt: new Date("2026-12-06T08:00:00Z"),
    state: "upcoming" as const,
    venueName: "World Padel Academy",
    taken: 9,
    capacity: 16,
  };

  it("says which Edition and when, where, and how full it is", () => {
    expect(seriesNextEditionLines(next, "en", NOW)).toEqual({
      title: "Edition 13, Sun 6 Dec",
      line: "11:00 AM, World Padel Academy. 9 of 16 in.",
    });
    expect(
      seriesNextEditionLines(
        { ...next, venueName: null, capacity: null },
        "en",
        NOW,
      ).line,
    ).toBe("11:00 AM. 9 in.");
  });

  it("says it is on now, today, and that its winners become holders", () => {
    const today = new Date("2026-11-21T17:00:00Z");
    expect(
      seriesNextEditionLines(
        { ...next, edition: 2, startsAt: today, state: "live" },
        "en",
        new Date("2026-11-21T17:30:00Z"),
      ),
    ).toEqual({
      title: "Edition 2 is on now",
      line: "Today, 8:00 PM. Winners become holders.",
    });
  });

  it("says it is waiting for its result once its window is over", () => {
    expect(
      seriesNextEditionLines({ ...next, state: "awaiting" }, "en", NOW).title,
    ).toBe("Edition 13 is waiting for its result");
  });
});

describe("seriesViewerLine", () => {
  it("reads what the viewer won and played", () => {
    expect(
      seriesViewerLine(
        { played: 9, decided: 12, wins: 2, lastWonEdition: 10 },
        "en",
      ),
    ).toBe("Won 2 of 9 played. Last in edition 10.");
    expect(
      seriesViewerLine(
        { played: 1, decided: 1, wins: 0, lastWonEdition: null },
        "en",
      ),
    ).toBe("Played 1 of 1. No win yet.");
    expect(
      seriesViewerLine(
        { played: 0, decided: 3, wins: 0, lastWonEdition: null },
        "en",
      ),
    ).toBe("Not played yet.");
  });
});
