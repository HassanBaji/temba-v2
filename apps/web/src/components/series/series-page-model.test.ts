import { isolate } from "@repo/i18n/bidi";
import { describe, expect, it } from "vitest";

import {
  SERIES_PAGE_ROWS,
  seriesPageModel,
  type SeriesPageData,
} from "./series-page-model";

const NOW = new Date("2026-11-21T10:00:00Z");
const FOLDED = { winners: false, editions: false };

type Edition = SeriesPageData["editions"][number];
type Winner = SeriesPageData["mostWins"][number];
type EditionWinner = Edition["winners"][number];

function edition(
  number: number,
  state: Edition["state"],
  overrides: Partial<Edition> = {},
): Edition {
  return {
    gameId: `game-${number}`,
    edition: number,
    startsAt: new Date("2026-11-08T17:00:00Z"),
    state,
    winners: [],
    winnerBib: null,
    field: { unit: "teams", count: 8 },
    points: null,
    score: null,
    ...overrides,
  };
}

function winner(
  name: string,
  wins: number,
  lastWonEdition: number,
  isViewer = false,
): Winner {
  return {
    userId: `user-${name}`,
    name,
    image: null,
    wins,
    lastWonEdition,
    isViewer,
  };
}

function editionWinner(name: string, isViewer = false): EditionWinner {
  return {
    userId: `user-${name}`,
    name,
    image: null,
    isGuest: false,
    isViewer,
  };
}

const qasim = editionWinner("Qasim Albaqali");
const ahmed = editionWinner("Ahmed Buhazza");
const hassan = editionWinner("Hassan Haji", true);

function series(overrides: Partial<SeriesPageData> = {}): SeriesPageData {
  return {
    id: "series-1",
    name: "Sunday Social",
    emblem: "cup",
    colour: "gold",
    sport: "padel",
    group: { id: "group-1", name: "Tuesday Night Padel" },
    endedAt: null,
    createdAt: new Date("2026-01-10T12:00:00Z"),
    canEnd: false,
    endRemoves: false,
    playedCount: 3,
    differentWinners: 3,
    mostWins: [
      winner("Qasim Albaqali", 1, 12),
      winner("Ahmed Buhazza", 1, 12),
      winner("Hassan Haji", 1, 10, true),
    ],
    holders: {
      edition: 12,
      players: [
        { ...qasim, isViewer: false },
        { ...ahmed, isViewer: false },
      ],
    },
    nextEdition: {
      gameId: "game-13",
      edition: 13,
      startsAt: new Date("2026-12-06T08:00:00Z"),
      endsAt: new Date("2026-12-06T10:00:00Z"),
      state: "upcoming",
      venueName: "World Padel Academy",
      taken: 9,
      capacity: 16,
    },
    viewer: {
      name: "Hassan Haji",
      image: null,
      played: 2,
      decided: 3,
      wins: 1,
      lastWonEdition: 10,
    },
    editions: [
      edition(13, "upcoming", { startsAt: new Date("2026-12-06T08:00:00Z") }),
      edition(12, "won", { winners: [qasim, ahmed], points: 19 }),
      edition(11, "no_winner", { field: { unit: "teams", count: 6 } }),
      edition(10, "won", {
        winners: [hassan, editionWinner("Khalid Janahi")],
        startsAt: new Date("2026-09-13T17:00:00Z"),
        points: 13,
      }),
    ],
    ...overrides,
  };
}

describe("seriesPageModel", () => {
  it("reads the three figures with the labels of 05", () => {
    expect(seriesPageModel(series(), FOLDED, "en", NOW).figures).toEqual([
      { value: "3", label: "editions played" },
      { value: "3", label: "players have won it" },
      { value: "Jan", label: "running since" },
    ]);
    const one = seriesPageModel(
      series({ playedCount: 1, differentWinners: 1 }),
      FOLDED,
      "en",
      NOW,
    );
    expect(one.figures.map((figure) => figure.label)).toEqual([
      "edition played",
      "player has won it",
      "running since",
    ]);
  });

  it("reads the month an ended Series ended as the third figure", () => {
    const model = seriesPageModel(
      series({ endedAt: new Date("2026-11-02T12:00:00Z") }),
      FOLDED,
      "en",
      NOW,
    );
    expect(model.figures[2]).toEqual({ value: "Nov", label: "ended" });
  });

  it("agrees the Arabic figure labels with the count", () => {
    const model = seriesPageModel(
      series({ playedCount: 2, differentWinners: 11 }),
      FOLDED,
      "ar",
      NOW,
    );
    expect(model.figures.map((figure) => figure.label)).toEqual([
      "نسختان لُعبتا",
      "لاعبًا فازوا بها",
      "جارية منذ",
    ]);
  });

  it("names the holders in full and since which Edition, or none before a win", () => {
    const model = seriesPageModel(series(), FOLDED, "en", NOW);
    expect(model.holders).toMatchObject({
      names: ["Qasim Albaqali", "Ahmed Buhazza"],
      since: "since edition 12",
    });
    expect(
      seriesPageModel(series({ holders: null }), FOLDED, "en", NOW).holders,
    ).toBeNull();
  });

  it("gives the next Edition its own card that opens the Game", () => {
    expect(seriesPageModel(series(), FOLDED, "en", NOW).next).toEqual({
      href: "/dashboard/games/game-13",
      edition: "13",
      editionWord: "edition",
      title: "Edition 13, Sun 6 Dec",
      line: "11:00 AM, World Padel Academy. 9 of 16 in.",
      action: "Open game",
    });
    expect(
      seriesPageModel(series({ nextEdition: null }), FOLDED, "en", NOW).next,
    ).toBeNull();
  });

  it("gives the viewer their own line and a badge per win", () => {
    expect(seriesPageModel(series(), FOLDED, "en", NOW).you).toMatchObject({
      title: "You in this series",
      line: "Won 1 of 2 played. Last in edition 10.",
      badges: 1,
      wins: "1",
      winsSpoken: "1 win",
    });
    const newcomer = seriesPageModel(
      series({
        viewer: {
          name: "Hassan Haji",
          image: null,
          played: 0,
          decided: 3,
          wins: 0,
          lastWonEdition: null,
        },
      }),
      FOLDED,
      "en",
      NOW,
    );
    expect(newcomer.you).toMatchObject({
      line: "Not played yet.",
      badges: 0,
      wins: "0",
    });
  });

  it("lists only decided Editions, with the winners in full, the date and the field", () => {
    const editions = seriesPageModel(series(), FOLDED, "en", NOW).editions;
    expect(editions?.meta).toBe("newest first");
    expect(
      editions?.rows.map((row) => [row.edition, row.names, row.meta]),
    ).toEqual([
      [
        "12",
        ["Qasim Albaqali", "Ahmed Buhazza"],
        "Sun 8 Nov. 8 teams, 19 points",
      ],
      ["11", ["Nobody won"], "Sun 8 Nov. 6 teams"],
      [
        "10",
        ["Hassan Haji (You)", "Khalid Janahi"],
        "Sun 13 Sep. 8 teams, 13 points",
      ],
    ]);
    expect(editions?.rows[0]).toMatchObject({
      href: "/dashboard/games/game-12",
      editionSpoken: "Edition 12",
    });
    expect(editions?.rows[2]?.people.map((person) => person.isViewer)).toEqual([
      true,
      false,
    ]);
  });

  it("says how many were played when there is one Edition", () => {
    const editions = seriesPageModel(
      series({ editions: [edition(1, "won", { winners: [qasim] })] }),
      FOLDED,
      "en",
      NOW,
    ).editions;
    expect(editions?.meta).toBe("1 played");
  });

  it("names a football side by its Bib, with the score", () => {
    const rows = seriesPageModel(
      series({
        editions: [
          edition(4, "won", {
            winners: [qasim, ahmed],
            winnerBib: "black",
            field: null,
            score: { winner: 5, loser: 3 },
          }),
        ],
      }),
      FOLDED,
      "en",
      NOW,
    ).editions?.rows;
    expect(rows?.[0]).toMatchObject({
      names: ["Black"],
      meta: "Sun 8 Nov. 5–3",
    });
  });

  it("ranks Winners with ties sharing a rank, marks the viewer and links every row", () => {
    const model = seriesPageModel(
      series({
        playedCount: 12,
        mostWins: [
          winner("Qasim Albaqali", 3, 12),
          winner("Layla Haddad", 3, 11),
          winner("Hassan Haji", 2, 10, true),
          winner("Khalid Janahi", 2, 10),
          winner("Nora Newman", 1, 4),
        ],
      }),
      FOLDED,
      "en",
      NOW,
    );
    expect(model.winners?.meta).toBe("12 editions");
    expect(
      model.winners?.rows.map((row) => [
        row.rank,
        row.name,
        row.line,
        row.badges,
        row.isViewer,
      ]),
    ).toEqual([
      ["1", "Qasim Albaqali", "Last won edition 12", 3, false],
      ["1", "Layla Haddad", "Last won edition 11", 3, false],
      ["3", "Hassan Haji (You)", "Last won edition 10", 2, true],
      ["3", "Khalid Janahi", "Last won edition 10", 2, false],
    ]);
    expect(model.winners?.rows[0]).toMatchObject({
      href: "/dashboard/players/user-Qasim Albaqali",
      rankSpoken: "Rank 1",
      winsSpoken: "3 wins",
    });
    expect(model.winners?.more).toBe("All 5 winners");
  });

  it("reads one win as the Edition won, and drops the badges past three wins", () => {
    const rows = seriesPageModel(
      series({
        playedCount: 1,
        mostWins: [winner("Ali Hasan", 1, 1), winner("Qasim Albaqali", 4, 1)],
      }),
      FOLDED,
      "en",
      NOW,
    ).winners;
    expect(rows?.meta).toBe("1 edition so far");
    expect(rows?.rows.map((row) => [row.line, row.badges])).toEqual([
      ["Won edition 1", 1],
      ["Last won edition 1", 0],
    ]);
  });

  it("hides Winners when nobody has won", () => {
    const model = seriesPageModel(
      series({ mostWins: [], differentWinners: 0 }),
      FOLDED,
      "en",
      NOW,
    );
    expect(model.winners).toBeNull();
  });

  it("offers All N only when there are more than four, and expands in place", () => {
    const four = Array.from({ length: SERIES_PAGE_ROWS }, (_, index) =>
      winner(`Player ${index}`, 1, index + 1),
    );
    expect(
      seriesPageModel(series({ mostWins: four }), FOLDED, "en", NOW).winners
        ?.more,
    ).toBeNull();

    const fifteen = Array.from({ length: 15 }, (_, index) =>
      winner(`Player ${index}`, 1, index + 1),
    );
    const twelve = Array.from({ length: 12 }, (_, index) =>
      edition(12 - index, "no_winner"),
    );
    const folded = seriesPageModel(
      series({ mostWins: fifteen, editions: twelve }),
      FOLDED,
      "en",
      NOW,
    );
    expect(folded.winners?.rows).toHaveLength(SERIES_PAGE_ROWS);
    expect(folded.winners?.more).toBe("All 15 winners");
    expect(folded.editions?.rows).toHaveLength(SERIES_PAGE_ROWS);
    expect(folded.editions?.more).toBe("All 12 editions");

    const open = seriesPageModel(
      series({ mostWins: fifteen, editions: twelve }),
      { winners: true, editions: true },
      "en",
      NOW,
    );
    expect(open.winners?.rows).toHaveLength(15);
    expect(open.winners?.more).toBeNull();
    expect(open.editions?.rows).toHaveLength(12);
    expect(open.editions?.more).toBeNull();
  });

  it("shows the empty line with neither a decided nor a next Edition", () => {
    const model = seriesPageModel(
      series({
        editions: [],
        mostWins: [],
        playedCount: 0,
        holders: null,
        nextEdition: null,
      }),
      FOLDED,
      "en",
      NOW,
    );
    expect(model.editions).toBeNull();
    expect(model.empty).toBe(
      "No editions yet. Attach this series when you create a game or a social.",
    );
    expect(
      seriesPageModel(
        series({ editions: [edition(1, "upcoming")], mostWins: [] }),
        FOLDED,
        "en",
        NOW,
      ).empty,
    ).toBeNull();
  });

  it("offers End series only when the viewer may end it", () => {
    expect(seriesPageModel(series(), FOLDED, "en", NOW).end).toBeNull();
    expect(
      seriesPageModel(series({ canEnd: true }), FOLDED, "en", NOW).end,
    ).toEqual({
      title: "End Sunday Social?",
      description:
        "Nothing can be attached to it any more. Badges already won stay on profiles.",
      confirm: "End series",
    });
  });

  it("says a Series no Game points at is removed when ended", () => {
    const model = seriesPageModel(
      series({ canEnd: true, endRemoves: true, editions: [], mostWins: [] }),
      FOLDED,
      "en",
      NOW,
    );
    expect(model.end?.description).toBe(
      "This series has no editions, so it will be removed.",
    );
  });

  it("isolates the name in the Arabic confirmation", () => {
    const model = seriesPageModel(series({ canEnd: true }), FOLDED, "ar", NOW);
    expect(model.end?.title).toBe(`إنهاء ${isolate("Sunday Social")}؟`);
  });
});
