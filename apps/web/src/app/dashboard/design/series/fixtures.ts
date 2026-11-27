import type { SeriesPageData } from "~/components/series/series-page-model";

type Edition = SeriesPageData["editions"][number];
type Winner = SeriesPageData["mostWins"][number];

const VIEWER = "user-hassan-haji";

function person(name: string) {
  const userId = `user-${name.toLowerCase().replace(/ /g, "-")}`;
  return { userId, name, image: null, isViewer: userId === VIEWER };
}

function won(
  number: number,
  day: string,
  names: readonly [string, string],
  teams: number,
  points: number | null,
): Edition {
  return {
    gameId: `game-${number}`,
    edition: number,
    startsAt: new Date(`${day}T15:00:00Z`),
    state: "won",
    winners: names.map((name) => ({ ...person(name), isGuest: false })),
    winnerBib: null,
    field: { unit: "teams", count: teams },
    points,
    score: null,
  };
}

function upcoming(number: number, startsAt: Date): Edition {
  return {
    gameId: `game-${number}`,
    edition: number,
    startsAt,
    state: "upcoming",
    winners: [],
    winnerBib: null,
    field: { unit: "teams", count: 0 },
    points: null,
    score: null,
  };
}

function winner(name: string, wins: number, lastWonEdition: number): Winner {
  const { userId, image, isViewer } = person(name);
  return { userId, name, image, wins, lastWonEdition, isViewer };
}

/** Thursday 26 November 2026, 8:30 PM in Bahrain. */
export const SERIES_PREVIEW_NOW = new Date("2026-11-26T17:30:00Z");

const LIVE_START = new Date("2026-11-26T17:00:00Z");

/** 5a: after one Edition, the second on now. */
export const seriesAfterOneEdition: SeriesPageData = {
  id: "series-king",
  name: "King of the court",
  emblem: "crown",
  colour: "gold",
  sport: "padel",
  group: { id: "group-wpa", name: "WPA Bahrain" },
  endedAt: null,
  createdAt: new Date("2026-11-02T09:00:00Z"),
  canEnd: true,
  endRemoves: false,
  playedCount: 1,
  differentWinners: 2,
  mostWins: [winner("Ali Hasan", 1, 1), winner("Ali Habib", 1, 1)],
  holders: {
    edition: 1,
    players: [person("Ali Hasan"), person("Ali Habib")],
  },
  nextEdition: {
    gameId: "game-2",
    edition: 2,
    startsAt: LIVE_START,
    endsAt: new Date("2026-11-26T19:00:00Z"),
    state: "live",
    venueName: "World Padel Academy",
    taken: 12,
    capacity: 12,
  },
  viewer: {
    name: "Hassan Haji",
    image: null,
    played: 1,
    decided: 1,
    wins: 0,
    lastWonEdition: null,
  },
  editions: [
    upcoming(2, LIVE_START),
    won(1, "2026-11-19", ["Ali Hasan", "Ali Habib"], 6, null),
  ],
};

/** 5b: after a year of Editions, the thirteenth next Sunday. */
export const seriesAfterAYear: SeriesPageData = {
  id: "series-sunday",
  name: "Sunday Social",
  emblem: "cup",
  colour: "gold",
  sport: "padel",
  group: { id: "group-tnp", name: "Tuesday Night Padel" },
  endedAt: null,
  createdAt: new Date("2026-01-03T09:00:00Z"),
  canEnd: true,
  endRemoves: false,
  playedCount: 12,
  differentWinners: 15,
  mostWins: [
    winner("Qasim Albaqali", 3, 12),
    winner("Layla Haddad", 3, 11),
    winner("Hassan Haji", 2, 10),
    winner("Khalid Janahi", 2, 10),
    winner("Yousif Ali", 2, 9),
    winner("Maryam Saleh", 2, 8),
    winner("Omar Saleh", 2, 7),
    winner("Ahmed Buhazza", 1, 12),
    winner("Nora Newman", 1, 11),
    winner("Reem Faraj", 1, 6),
    winner("Jassim Kamal", 1, 5),
    winner("Fatima Isa", 1, 4),
    winner("Sara Ahmed", 1, 3),
    winner("Ali Hasan", 1, 2),
    winner("Ali Habib", 1, 1),
  ],
  holders: {
    edition: 12,
    players: [person("Qasim Albaqali"), person("Ahmed Buhazza")],
  },
  nextEdition: {
    gameId: "game-13",
    edition: 13,
    startsAt: new Date("2026-12-06T08:00:00Z"),
    endsAt: new Date("2026-12-06T11:00:00Z"),
    state: "upcoming",
    venueName: "World Padel Academy",
    taken: 9,
    capacity: 16,
  },
  viewer: {
    name: "Hassan Haji",
    image: null,
    played: 9,
    decided: 12,
    wins: 2,
    lastWonEdition: 10,
  },
  editions: [
    upcoming(13, new Date("2026-12-06T08:00:00Z")),
    won(12, "2026-11-08", ["Qasim Albaqali", "Ahmed Buhazza"], 8, 19),
    won(11, "2026-10-11", ["Layla Haddad", "Nora Newman"], 8, 17),
    won(10, "2026-09-13", ["Hassan Haji", "Khalid Janahi"], 6, 13),
    won(9, "2026-08-16", ["Qasim Albaqali", "Yousif Ali"], 8, 18),
    won(8, "2026-07-19", ["Layla Haddad", "Maryam Saleh"], 8, 16),
    won(7, "2026-06-21", ["Khalid Janahi", "Omar Saleh"], 6, 12),
    won(6, "2026-05-24", ["Qasim Albaqali", "Reem Faraj"], 8, 19),
    won(5, "2026-04-26", ["Layla Haddad", "Jassim Kamal"], 8, 17),
    won(4, "2026-03-29", ["Hassan Haji", "Fatima Isa"], 6, 14),
    won(3, "2026-03-01", ["Yousif Ali", "Sara Ahmed"], 8, 18),
    won(2, "2026-02-01", ["Maryam Saleh", "Ali Hasan"], 6, 12),
    won(1, "2026-01-04", ["Omar Saleh", "Ali Habib"], 6, 13),
  ],
};
