import { isolate } from "@repo/i18n/bidi";
import { describe, expect, it } from "vitest";

import {
  profileSeriesAllModel,
  profileSeriesCardModel,
  profileSeriesSheetModel,
  type ProfileSeriesBadge,
  type SeriesPlayerWins,
  type ShownSeriesForPlayer,
} from "./profile-series-model";

type Badge = ShownSeriesForPlayer["badges"][number];
type Win = ShownSeriesForPlayer["wins"][number];

const NOBODY = { names: [], bib: null, score: null };

function badge(overrides: Partial<Badge>): Badge {
  return {
    seriesId: "series-sunday",
    name: "Sunday Social",
    emblem: "cup",
    colour: "gold",
    groupName: "Tuesday Night Padel",
    wins: 2,
    lastWonAt: new Date("2026-09-13T20:00:00Z"),
    canOpenSeries: true,
    ...overrides,
  };
}

function win(overrides: Partial<Win>): Win {
  return {
    gameId: "game-1",
    seriesId: "series-sunday",
    edition: 10,
    playedAt: new Date("2026-09-13T16:00:00Z"),
    wonAt: new Date("2026-09-13T20:00:00Z"),
    ordinal: 2,
    with: NOBODY,
    ...overrides,
  };
}

const FRIDAY = badge({
  seriesId: "series-friday",
  name: "Friday Classic",
  emblem: "flame",
  colour: "red",
  groupName: "Karbabad Friday",
  wins: 2,
  lastWonAt: new Date("2026-11-13T20:00:00Z"),
  canOpenSeries: false,
});
const SUNDAY = badge({});
const RAMADAN = badge({
  seriesId: "series-ramadan",
  name: "Ramadan Nights",
  emblem: "moon",
  colour: "purple",
  wins: 1,
  lastWonAt: new Date("2026-03-01T20:00:00Z"),
});

const THREE_SERIES: ShownSeriesForPlayer = {
  hidden: false,
  totalWins: 5,
  badges: [FRIDAY, SUNDAY, RAMADAN],
  wins: [
    win({
      gameId: "friday-30",
      seriesId: "series-friday",
      edition: 30,
      playedAt: new Date("2026-11-13T16:00:00Z"),
      wonAt: new Date("2026-11-13T20:00:00Z"),
      with: { names: [], bib: "black", score: { mine: 5, theirs: 3 } },
    }),
    win({
      gameId: "sunday-10",
      edition: 10,
      with: { names: ["Khalid Janahi"], bib: null, score: null },
    }),
    win({
      gameId: "friday-21",
      seriesId: "series-friday",
      edition: 21,
      playedAt: new Date("2026-07-10T16:00:00Z"),
      wonAt: new Date("2026-07-10T20:00:00Z"),
      ordinal: 1,
    }),
    win({
      gameId: "sunday-7",
      edition: 7,
      playedAt: new Date("2026-06-14T16:00:00Z"),
      wonAt: new Date("2026-06-14T20:00:00Z"),
      ordinal: 1,
      with: { names: ["Dana Al-Khalifa"], bib: null, score: null },
    }),
    win({
      gameId: "ramadan-2",
      seriesId: "series-ramadan",
      edition: 2,
      playedAt: new Date("2026-03-01T16:00:00Z"),
      wonAt: new Date("2026-03-01T20:00:00Z"),
      ordinal: 1,
    }),
  ],
};

function playerWins(
  overrides: Partial<SeriesPlayerWins> = {},
): SeriesPlayerWins {
  return {
    series: {
      id: "series-sunday",
      name: "Sunday Social",
      emblem: "cup",
      colour: "gold",
      groupName: "Tuesday Night Padel",
    },
    wins: 2,
    playedBySeries: 12,
    playedByPlayer: 9,
    editions: [
      {
        gameId: "sunday-10",
        edition: 10,
        playedAt: new Date("2026-09-13T16:00:00Z"),
        with: { names: ["Khalid Janahi"], bib: null, score: null },
      },
      {
        gameId: "sunday-7",
        edition: 7,
        playedAt: new Date("2026-06-14T16:00:00Z"),
        with: { names: ["Dana Al-Khalifa"], bib: null, score: null },
      },
    ],
    canOpenSeries: true,
    ...overrides,
  };
}

function cardBadge(locale: "en" | "ar" = "en"): ProfileSeriesBadge {
  const sunday = profileSeriesCardModel(THREE_SERIES, locale)
    ?.rows.flat()
    .find((entry) => entry.seriesId === SUNDAY.seriesId);
  if (!sunday) {
    throw new Error("no Sunday Social badge");
  }
  return sunday;
}

describe("profileSeriesCardModel", () => {
  it("is absent while loading, when hidden, and with nothing won", () => {
    expect(profileSeriesCardModel(undefined, "en")).toBeNull();
    expect(profileSeriesCardModel({ hidden: true }, "en")).toBeNull();
    expect(
      profileSeriesCardModel(
        { hidden: false, totalWins: 0, badges: [], wins: [] },
        "en",
      ),
    ).toBeNull();
  });

  it("reads the heading, every badge in the server's order with its count and label, and the last row", () => {
    expect(profileSeriesCardModel(THREE_SERIES, "en")).toEqual({
      title: "Series",
      meta: "5 wins in 3",
      rows: [
        [
          {
            seriesId: "series-friday",
            emblem: "flame",
            colour: "red",
            wins: 2,
            name: "Friday Classic",
            groupName: "Karbabad Friday",
            label: "Friday Classic, 2 wins",
          },
          {
            seriesId: "series-sunday",
            emblem: "cup",
            colour: "gold",
            wins: 2,
            name: "Sunday Social",
            groupName: "Tuesday Night Padel",
            label: "Sunday Social, 2 wins",
          },
          {
            seriesId: "series-ramadan",
            emblem: "moon",
            colour: "purple",
            wins: 1,
            name: "Ramadan Nights",
            groupName: "Tuesday Night Padel",
            label: "Ramadan Nights, 1 win",
          },
        ],
      ],
      allWins: "All series wins",
    });
  });

  it("wraps every badge past three into rows of three", () => {
    const many: ShownSeriesForPlayer = {
      ...THREE_SERIES,
      badges: Array.from({ length: 7 }, (_, index) =>
        badge({ seriesId: `series-${index}`, name: `Series ${index}` }),
      ),
    };
    const rows = profileSeriesCardModel(many, "en")?.rows ?? [];
    expect(rows.map((row) => row.length)).toEqual([3, 3, 1]);
    expect(rows.flat().map((entry) => entry.seriesId)).toEqual(
      many.badges.map((entry) => entry.seriesId),
    );
  });

  it("speaks Arabic with the name isolated", () => {
    const card = profileSeriesCardModel(THREE_SERIES, "ar");
    expect(card?.title).toBe("السلاسل");
    expect(card?.rows[0]?.[2]?.label).toBe(
      `${isolate("Ramadan Nights")}، فوز واحد`,
    );
  });
});

describe("profileSeriesSheetModel", () => {
  it("keeps the header from the badge while the wins load", () => {
    expect(profileSeriesSheetModel(cardBadge(), undefined, "en")).toEqual({
      mode: "series",
      badge: cardBadge(),
      wins: null,
    });
  });

  it("reads won of played, played by the player, rows newest first that open their Game, and See the series", () => {
    const model = profileSeriesSheetModel(cardBadge(), playerWins(), "en");
    expect(model).toEqual({
      mode: "series",
      badge: cardBadge(),
      wins: {
        heading: "Won 2 of 12",
        played: "played 9",
        rows: [
          {
            key: "sunday-10",
            gameId: "sunday-10",
            edition: "10",
            title: "With Khalid Janahi",
            sub: "Sun 13 Sep 2026",
            spoken: "Edition 10. With Khalid Janahi. Sun 13 Sep 2026",
          },
          {
            key: "sunday-7",
            gameId: "sunday-7",
            edition: "07",
            title: "With Dana Al-Khalifa",
            sub: "Sun 14 Jun 2026",
            spoken: "Edition 7. With Dana Al-Khalifa. Sun 14 Jun 2026",
          },
        ],
        seeSeries: "See the series",
      },
    });
  });

  it("opens nothing when the viewer cannot open the Series' Group", () => {
    const model = profileSeriesSheetModel(
      cardBadge(),
      playerWins({ canOpenSeries: false }),
      "en",
    );
    expect(model.mode === "series" && model.wins).toMatchObject({
      rows: [{ gameId: null }, { gameId: null }],
      seeSeries: null,
    });
  });

  it("reads a football win as the Bib and score, and an Americano win as its date alone", () => {
    const model = profileSeriesSheetModel(
      cardBadge(),
      playerWins({
        editions: [
          {
            gameId: "football",
            edition: 30,
            playedAt: new Date("2026-11-13T16:00:00Z"),
            with: { names: [], bib: "black", score: { mine: 5, theirs: 3 } },
          },
          {
            gameId: "americano",
            edition: 3,
            playedAt: new Date("2026-02-01T16:00:00Z"),
            with: NOBODY,
          },
        ],
      }),
      "en",
    );
    expect(model.mode === "series" && model.wins?.rows).toMatchObject([
      { title: "With Black, 5–3", sub: "Fri 13 Nov 2026" },
      {
        title: "Sun 1 Feb 2026",
        sub: null,
        spoken: "Edition 3. Sun 1 Feb 2026",
      },
    ]);
  });

  it("speaks Arabic with Latin digits", () => {
    const model = profileSeriesSheetModel(cardBadge("ar"), playerWins(), "ar");
    expect(model.mode === "series" && model.wins).toMatchObject({
      heading: "الفوز بـ2 من 12",
      played: "9 مشاركات",
      rows: [
        { edition: "10", title: `مع ${isolate("Khalid Janahi")}` },
        { edition: "07" },
      ],
      seeSeries: "عرض السلسلة",
    });
  });
});

describe("profileSeriesAllModel", () => {
  it("lists every win across Series newest first, opening the Game where that Series opens", () => {
    expect(profileSeriesAllModel(THREE_SERIES, "en")).toEqual({
      mode: "all",
      heading: "Series wins",
      meta: "5 wins in 3",
      rows: [
        {
          key: "friday-30",
          gameId: null,
          emblem: "flame",
          colour: "red",
          title: "Friday Classic, edition 30",
          sub: "With Black, 5–3. Fri 13 Nov 2026",
          spoken:
            "Friday Classic, edition 30. With Black, 5–3. Fri 13 Nov 2026",
        },
        {
          key: "sunday-10",
          gameId: "sunday-10",
          emblem: "cup",
          colour: "gold",
          title: "Sunday Social, edition 10",
          sub: "With Khalid Janahi. Sun 13 Sep 2026",
          spoken:
            "Sunday Social, edition 10. With Khalid Janahi. Sun 13 Sep 2026",
        },
        {
          key: "friday-21",
          gameId: null,
          emblem: "flame",
          colour: "red",
          title: "Friday Classic, edition 21",
          sub: "Fri 10 Jul 2026",
          spoken: "Friday Classic, edition 21. Fri 10 Jul 2026",
        },
        {
          key: "sunday-7",
          gameId: "sunday-7",
          emblem: "cup",
          colour: "gold",
          title: "Sunday Social, edition 7",
          sub: "With Dana Al-Khalifa. Sun 14 Jun 2026",
          spoken:
            "Sunday Social, edition 7. With Dana Al-Khalifa. Sun 14 Jun 2026",
        },
        {
          key: "ramadan-2",
          gameId: "ramadan-2",
          emblem: "moon",
          colour: "purple",
          title: "Ramadan Nights, edition 2",
          sub: "Sun 1 Mar 2026",
          spoken: "Ramadan Nights, edition 2. Sun 1 Mar 2026",
        },
      ],
    });
  });
});
