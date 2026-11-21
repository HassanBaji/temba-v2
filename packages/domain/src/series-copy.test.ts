import { describe, expect, it } from "vitest";

import {
  seriesProfileMeta,
  seriesRowLine,
  seriesRuleLine,
  seriesWinOrdinal,
  seriesWinStanding,
  seriesWinWho,
  seriesWinWithLine,
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

describe("seriesWinStanding", () => {
  it("says a first win is new on the profile", () => {
    const winner = { standing: "new", levelWith: null } as const;
    expect(seriesWinStanding(winner, "en")).toBe("new on the profile");
    expect(seriesWinStanding(winner, "ar")).toBe("شارة جديدة على الملف الشخصي");
  });

  it("says a sole leader has the most", () => {
    const winner = { standing: "most", levelWith: null } as const;
    expect(seriesWinStanding(winner, "en")).toBe("most of anyone");
    expect(seriesWinStanding(winner, "ar")).toBe("الأكثر فوزًا");
  });

  it("names the one player level with the leader by first name", () => {
    const winner = {
      standing: "level",
      levelWith: { name: "Layla Haddad" },
    } as const;
    expect(seriesWinStanding(winner, "en")).toBe(
      "most of anyone, level with Layla",
    );
    expect(seriesWinStanding(winner, "ar")).toBe(
      `الأكثر فوزًا، بالتساوي مع ${isolated("Layla")}`,
    );
  });

  it.each([
    [1, "most of anyone, level with 1 other", "بالتساوي مع شخص آخر"],
    [2, "most of anyone, level with 2 others", "بالتساوي مع شخصين آخرين"],
    [3, "most of anyone, level with 3 others", "بالتساوي مع 3 آخرين"],
    [11, "most of anyone, level with 11 others", "بالتساوي مع 11 آخرين"],
  ])("counts %i others level with the leader", (count, en, ar) => {
    const winner = { standing: "level", levelWith: { count } } as const;
    expect(seriesWinStanding(winner, "en")).toBe(en);
    expect(seriesWinStanding(winner, "ar")).toBe(`الأكثر فوزًا، ${ar}`);
  });

  it("says nothing for a player behind the leader", () => {
    const winner = { standing: null, levelWith: null };
    expect(seriesWinStanding(winner, "en")).toBeNull();
    expect(seriesWinStanding(winner, "ar")).toBeNull();
  });
});

describe("seriesProfileMeta", () => {
  it.each([
    [1, 1, "1 win in 1"],
    [2, 2, "2 wins in 2"],
    [3, 3, "3 wins in 3"],
    [11, 11, "11 wins in 11"],
    [5, 3, "5 wins in 3"],
  ])("counts %i wins in %i series in English", (wins, count, line) => {
    expect(seriesProfileMeta(wins, count, "en")).toBe(line);
  });

  it.each([
    [1, 1, "فوز واحد في سلسلة واحدة"],
    [2, 2, "فوزان في سلسلتين"],
    [3, 3, "3 انتصارات في 3 سلاسل"],
    [11, 11, "11 فوزًا في 11 سلسلة"],
  ])("counts %i wins in %i series in Arabic", (wins, count, line) => {
    expect(seriesProfileMeta(wins, count, "ar")).toBe(line);
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
