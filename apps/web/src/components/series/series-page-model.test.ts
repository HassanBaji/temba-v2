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

const qasim = { userId: "user-qasim", name: "Qasim Albaqali", isGuest: false };
const ahmed = { userId: "user-ahmed", name: "Ahmed Buhazza", isGuest: false };

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
    playedCount: 3,
    differentWinners: 2,
    mostWins: [
      winner("Qasim Albaqali", 1, 12),
      winner("Hassan Haji", 1, 10, true),
    ],
    editions: [
      edition(13, "upcoming", { startsAt: new Date("2026-12-06T17:00:00Z") }),
      edition(12, "won", { winners: [qasim, ahmed] }),
      edition(11, "no_winner"),
      edition(10, "awaiting"),
    ],
    ...overrides,
  };
}

describe("seriesPageModel", () => {
  it("reads the three figures, the month running since without this year", () => {
    expect(seriesPageModel(series(), FOLDED, "en", NOW).figures).toEqual([
      { value: "3", label: "played" },
      { value: "2", label: "different winners" },
      { value: "Jan", label: "running since" },
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
      "فائزًا مختلفًا",
      "جارية منذ",
    ]);
  });

  it("reads one line per Edition state and hatches only the upcoming one", () => {
    const rows = seriesPageModel(series(), FOLDED, "en", NOW).editions?.rows;
    expect(rows?.map((row) => [row.edition, row.line, row.hatched])).toEqual([
      ["13", "Not played yet", true],
      ["12", "Qasim A and Ahmed B", false],
      ["11", "Nobody won", false],
      ["10", "No result yet", false],
    ]);
    expect(rows?.[0]).toMatchObject({
      href: "/dashboard/games/game-13",
      editionSpoken: "Edition 13",
      date: "Sun 6 Dec",
    });
  });

  it("names a football side by its Bib", () => {
    const rows = seriesPageModel(
      series({
        editions: [edition(4, "won", { winners: [qasim], winnerBib: "black" })],
      }),
      FOLDED,
      "en",
      NOW,
    ).editions?.rows;
    expect(rows?.[0]?.line).toBe("Black");
  });

  it("marks the viewer's Most wins row and links every row to the profile", () => {
    const model = seriesPageModel(series(), FOLDED, "en", NOW);
    expect(model.mostWins?.of).toBe("of 3");
    expect(
      model.mostWins?.rows.map((row) => [row.line, row.isViewer, row.href]),
    ).toEqual([
      ["Last won edition 12", false, "/dashboard/players/user-Qasim Albaqali"],
      ["You. Last won edition 10", true, "/dashboard/players/user-Hassan Haji"],
    ]);
    expect(model.mostWins?.rows[0]).toMatchObject({
      wins: "1",
      winsSpoken: "1 win",
    });
  });

  it("hides Most wins when nobody has won", () => {
    const model = seriesPageModel(
      series({ mostWins: [], differentWinners: 0 }),
      FOLDED,
      "en",
      NOW,
    );
    expect(model.mostWins).toBeNull();
  });

  it("offers All N only when there are more than four, and expands in place", () => {
    const four = Array.from({ length: SERIES_PAGE_ROWS }, (_, index) =>
      winner(`Player ${index}`, 1, index + 1),
    );
    expect(
      seriesPageModel(series({ mostWins: four }), FOLDED, "en", NOW).mostWins
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
    expect(folded.mostWins?.rows).toHaveLength(SERIES_PAGE_ROWS);
    expect(folded.mostWins?.more).toBe("All 15 winners");
    expect(folded.editions?.rows).toHaveLength(SERIES_PAGE_ROWS);
    expect(folded.editions?.more).toBe("All 12 editions");

    const open = seriesPageModel(
      series({ mostWins: fifteen, editions: twelve }),
      { winners: true, editions: true },
      "en",
      NOW,
    );
    expect(open.mostWins?.rows).toHaveLength(15);
    expect(open.mostWins?.more).toBeNull();
    expect(open.editions?.rows).toHaveLength(12);
    expect(open.editions?.more).toBeNull();
  });

  it("shows the empty line with no Edition", () => {
    const model = seriesPageModel(
      series({ editions: [], mostWins: [], playedCount: 0 }),
      FOLDED,
      "en",
      NOW,
    );
    expect(model.editions).toBeNull();
    expect(model.empty).toBe(
      "No editions yet. Attach this series when you create a game or a social.",
    );
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

  it("says a Series with no Edition is removed when ended", () => {
    const model = seriesPageModel(
      series({ canEnd: true, editions: [], mostWins: [] }),
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
