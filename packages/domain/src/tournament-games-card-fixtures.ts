import type {
  MyTournament,
  MyTournamentPair,
  MyTournamentRound,
} from "./hub-game-row";

const MINUTE = 60_000;

function pair(first: string, second: string, viewer = false): MyTournamentPair {
  return {
    left: { userId: first, name: first, image: null, isViewer: viewer },
    right: { userId: second, name: second, image: null, isViewer: false },
  };
}

const OPPONENTS = [
  pair("Layla Hassan", "Mariam Zayed"),
  pair("Omar Tariq", "Sara Mansoor"),
  pair("Dana Ali", "Yousif Khalil"),
  pair("Ahmed Bader", "Faisal Jamal"),
];

function rounds(
  start: Date,
  results: readonly ([number, number] | null)[],
): MyTournamentRound[] {
  return OPPONENTS.map((opponent, index) => {
    const result = results[index] ?? null;
    return {
      matchId: `fixture-match-${index + 1}`,
      roundNumber: index + 1,
      startTime: new Date(start.getTime() + index * 30 * MINUTE),
      courtName: `Court ${(index % 3) + 1}`,
      completed: result != null,
      cancelled: false,
      outcome: result == null ? null : result[0] > result[1] ? "won" : "lost",
      viewerSets: result ? [{ viewer: result[0], opponent: result[1] }] : [],
      opponent,
    };
  });
}

function myTournament(
  start: Date,
  results: readonly ([number, number] | null)[],
  overrides: Partial<MyTournament> = {},
): MyTournament {
  return {
    viewerTeam: pair("Hassan Haji", "Khalid Jaber", true),
    poolLabel: "A",
    poolSize: 6,
    poolCount: 1,
    viewerPosition: null,
    poolFinished: false,
    winner: null,
    rounds: rounds(start, results),
    ...overrides,
  };
}

function base(id: string, start: Date) {
  return {
    id,
    name: "Tuesday Night Padel",
    sport: "padel",
    format: "friendly_tournament",
    startTime: start,
    windowStart: start,
    windowEnd: new Date(start.getTime() + 120 * MINUTE),
    venue: { name: "World Padel Academy Bahrain" },
  };
}

/** Design 1a to 2d of the one-card tournament, for the design previews. */
export function createTournamentGamesCardFixtures(now: Date) {
  const soon = new Date(now.getTime() + 55 * MINUTE);
  const running = new Date(now.getTime() - 40 * MINUTE);
  const past = new Date(now.getTime() - 3 * 24 * 60 * MINUTE);
  const finished = (
    results: readonly ([number, number] | null)[],
    overrides: Partial<MyTournament>,
  ) => ({
    ...base("fixture-played", past),
    displayTime: past,
    myTournament: myTournament(past, results, overrides),
  });
  return {
    upcoming: {
      ...base("fixture-upcoming", soon),
      myTournament: myTournament(soon, []),
    },
    live: {
      ...base("fixture-live", running),
      myTournament: myTournament(running, [[6, 2]], { viewerPosition: 2 }),
    },
    played: finished(
      [
        [6, 2],
        [2, 6],
        [6, 2],
        [6, 4],
      ],
      {
        viewerPosition: 2,
        poolFinished: true,
        winner: OPPONENTS[0]!,
      },
    ),
    playedWon: finished(
      [
        [6, 2],
        [6, 4],
        [6, 1],
        [6, 3],
      ],
      {
        viewerPosition: 1,
        poolFinished: true,
        winner: pair("Hassan Haji", "Khalid Jaber", true),
      },
    ),
    playedMissing: finished([[6, 2], [2, 6], [6, 2], null], {
      viewerPosition: 3,
    }),
  };
}
