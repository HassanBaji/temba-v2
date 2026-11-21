import { isolate } from "@repo/i18n/bidi";
import { describe, expect, it } from "vitest";

import {
  SERIES_SCREEN_ROWS,
  seriesScreenModel,
  type SeriesScreenData,
} from "./series-screen-model";

const NOW = new Date("2026-11-21T10:00:00Z");
const FOLDED = { winners: false, editions: false };

type Edition = SeriesScreenData["editions"][number];
type Winner = SeriesScreenData["mostWins"][number];

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

function series(overrides: Partial<SeriesScreenData> = {}): SeriesScreenData {
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

describe("seriesScreenModel", () => {
  it("reads the three figures, the month running since without this year", () => {
    expect(seriesScreenModel(series(), FOLDED, "en", NOW).figures).toEqual([
      { value: "3", label: "played" },
      { value: "2", label: "different winners" },
      { value: "Jan", label: "running since" },
    ]);
  });

  it("reads the month an ended Series ended as the third figure", () => {
    const model = seriesScreenModel(
      series({ endedAt: new Date("2026-11-02T12:00:00Z") }),
      FOLDED,
      "en",
      NOW,
    );
    expect(model.figures[2]).toEqual({ value: "Nov", label: "ended" });
  });

  it("agrees the Arabic figure labels with the count", () => {
    const model = seriesScreenModel(
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
    const rows = seriesScreenModel(series(), FOLDED, "en", NOW).editions?.rows;
    expect(rows?.map((row) => [row.edition, row.line, row.hatched])).toEqual([
      ["13", "Not played yet", true],
      ["12", "Qasim A and Ahmed B", false],
      ["11", "Nobody won", false],
      ["10", "No result yet", false],
    ]);
    expect(rows?.[0]).toMatchObject({
      gameId: "game-13",
      date: "Sun 6 Dec",
      spoken: "Edition 13. Not played yet. Sun 6 Dec",
    });
    expect(rows?.[1]?.spoken).toBe(
      "Edition 12. Qasim A and Ahmed B. Sun 8 Nov",
    );
  });

  it("leaves the date out of a row's label when the Edition has no day", () => {
    const rows = seriesScreenModel(
      series({ editions: [edition(3, "awaiting", { startsAt: null })] }),
      FOLDED,
      "en",
      NOW,
    ).editions?.rows;
    expect(rows?.[0]).toMatchObject({
      date: "",
      spoken: "Edition 3. No result yet",
    });
  });

  it("names a football side by its Bib", () => {
    const rows = seriesScreenModel(
      series({
        editions: [edition(4, "won", { winners: [qasim], winnerBib: "black" })],
      }),
      FOLDED,
      "en",
      NOW,
    ).editions?.rows;
    expect(rows?.[0]?.line).toBe("Black");
  });

  it("marks the viewer's Most wins row and reads each row aloud", () => {
    const model = seriesScreenModel(series(), FOLDED, "en", NOW);
    expect(model.mostWins?.of).toBe("of 3");
    expect(
      model.mostWins?.rows.map((row) => [row.line, row.isViewer, row.userId]),
    ).toEqual([
      ["Last won edition 12", false, "user-Qasim Albaqali"],
      ["You. Last won edition 10", true, "user-Hassan Haji"],
    ]);
    expect(model.mostWins?.rows[0]).toMatchObject({
      wins: "1",
      spoken: "Qasim Albaqali. Last won edition 12. 1 win",
    });
  });

  it("reads the Arabic row labels with the count agreed", () => {
    const model = seriesScreenModel(
      series({ mostWins: [winner("Qasim Albaqali", 2, 12)] }),
      FOLDED,
      "ar",
      NOW,
    );
    expect(model.mostWins?.rows[0]?.spoken).toBe(
      "Qasim Albaqali. آخر فوز في النسخة 12. فوزان",
    );
    expect(model.editions?.rows[2]?.spoken).toMatch(
      /^النسخة 11\. لم يفز أحد\. /,
    );
  });

  it("hides Most wins when nobody has won", () => {
    const model = seriesScreenModel(
      series({ mostWins: [], differentWinners: 0 }),
      FOLDED,
      "en",
      NOW,
    );
    expect(model.mostWins).toBeNull();
  });

  it("offers All N only when there are more than four, and expands in place", () => {
    const four = Array.from({ length: SERIES_SCREEN_ROWS }, (_, index) =>
      winner(`Player ${index}`, 1, index + 1),
    );
    expect(
      seriesScreenModel(series({ mostWins: four }), FOLDED, "en", NOW).mostWins
        ?.more,
    ).toBeNull();

    const fifteen = Array.from({ length: 15 }, (_, index) =>
      winner(`Player ${index}`, 1, index + 1),
    );
    const twelve = Array.from({ length: 12 }, (_, index) =>
      edition(12 - index, "no_winner"),
    );
    const folded = seriesScreenModel(
      series({ mostWins: fifteen, editions: twelve }),
      FOLDED,
      "en",
      NOW,
    );
    expect(folded.mostWins?.rows).toHaveLength(SERIES_SCREEN_ROWS);
    expect(folded.mostWins?.more).toBe("All 15 winners");
    expect(folded.editions?.rows).toHaveLength(SERIES_SCREEN_ROWS);
    expect(folded.editions?.more).toBe("All 12 editions");

    const open = seriesScreenModel(
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
    const model = seriesScreenModel(
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
    expect(seriesScreenModel(series(), FOLDED, "en", NOW).end).toBeNull();
    expect(
      seriesScreenModel(series({ canEnd: true }), FOLDED, "en", NOW).end,
    ).toEqual({
      title: "End Sunday Social?",
      description:
        "Nothing can be attached to it any more. Badges already won stay on profiles.",
      confirm: "End series",
    });
  });

  it("says a Series with no Edition is removed when ended", () => {
    const model = seriesScreenModel(
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
    const model = seriesScreenModel(
      series({ canEnd: true }),
      FOLDED,
      "ar",
      NOW,
    );
    expect(model.end?.title).toBe(`إنهاء ${isolate("Sunday Social")}؟`);
  });
});
