import type {
  PlayerOverallInput,
  PlayerPositionInput,
  PlayerStreaksInput,
} from "./player-profile";
import type { PlayerLevelInput } from "./player-profile-level";
import type {
  PlayerMatchGame,
  PlayerMatchInput,
  PlayerMatchPlayer,
  PlayerMatchRating,
} from "./player-profile-matches";

export type PlayerProfileFixture = {
  player: { id: string; name: string; image: string | null; isViewer: boolean };
  venue: { name: string } | null;
  rating: PlayerLevelInput | null;
  overall: PlayerOverallInput;
  streaks: PlayerStreaksInput;
  position: PlayerPositionInput;
  trend: { levelChange: number } | null;
  lastMatches: PlayerMatchInput[];
};

const EMPTY_OVERALL: PlayerOverallInput = {
  played: 0,
  won: 0,
  lost: 0,
  drawn: 0,
  setsWon: 0,
  setsPlayed: 0,
};

const NO_STREAKS: PlayerStreaksInput = {
  current: 0,
  best: 0,
  bestReachedAt: null,
};

const NO_POSITION: PlayerPositionInput = {
  declared: null,
  recordedCount: 0,
  leftCount: 0,
  rightCount: 0,
};

const ELIN = {
  id: "8c0f1f4e-2d0c-4f49-9a55-6a1f3b1f0a01",
  name: "Elin Nilsson",
  image: null,
  isViewer: false,
};

const ELIN_PLAYER: PlayerMatchPlayer = {
  userId: ELIN.id,
  name: ELIN.name,
  image: null,
  levelBand: "B3",
  level: "4.8",
  provisional: false,
};

const JONAS: PlayerMatchPlayer = {
  userId: "8c0f1f4e-2d0c-4f49-9a55-6a1f3b1f0a02",
  name: "Jonas Berg",
  image: null,
  levelBand: "B3",
  level: "4.5",
  provisional: false,
};

const SOFIA: PlayerMatchPlayer = {
  userId: "8c0f1f4e-2d0c-4f49-9a55-6a1f3b1f0a03",
  name: "Sofia Lindqvist",
  image: null,
  levelBand: "B3",
  level: "4.3",
  provisional: false,
};

const ADAM: PlayerMatchPlayer = {
  userId: "8c0f1f4e-2d0c-4f49-9a55-6a1f3b1f0a04",
  name: "Adam Ross",
  image: null,
  levelBand: "C2",
  level: "3.4",
  provisional: true,
};

const TUESDAY_CREW: PlayerMatchGame = {
  name: "Tuesday padel",
  format: "friendly_game",
  groupName: "Tuesday Crew",
  roundNumber: null,
  knockoutRound: null,
  venueName: "Padelhuset Bromma",
};

const OPEN_FRIENDLY: PlayerMatchGame = {
  ...TUESDAY_CREW,
  name: null,
  groupName: null,
};

const AUTUMN_CUP_POOL: PlayerMatchGame = {
  name: "Autumn Cup",
  format: "friendly_tournament",
  groupName: null,
  roundNumber: 2,
  knockoutRound: null,
  venueName: "Padelhuset Bromma",
};

const AUTUMN_CUP_SEMI: PlayerMatchGame = {
  ...AUTUMN_CUP_POOL,
  roundNumber: null,
  knockoutRound: { round: 1, roundCount: 2 },
};

const AMERICANO: PlayerMatchGame = {
  name: "Friday Americano",
  format: "americano",
  groupName: null,
  roundNumber: 3,
  knockoutRound: null,
  venueName: "Padel Zone",
};

const WON_SETS = [
  { slot1GamesWon: 6, slot2GamesWon: 4 },
  { slot1GamesWon: 6, slot2GamesWon: 3 },
];

const LOST_SETS = [
  { slot1GamesWon: 3, slot2GamesWon: 6 },
  { slot1GamesWon: 4, slot2GamesWon: 6 },
];

function rated(
  levelBefore: number,
  levelAfter: number,
  bandBefore: PlayerMatchRating["bandBefore"] = "B3",
  bandAfter: PlayerMatchRating["bandAfter"] = "B3",
): PlayerMatchRating {
  return {
    levelBefore,
    levelAfter,
    bandBefore,
    bandAfter,
    levelChange: Math.round((levelAfter - levelBefore) * 10) / 10,
  };
}

function lastMatch(
  day: string,
  outcome: "won" | "lost",
  game: PlayerMatchGame,
  rating: PlayerMatchRating | null,
): PlayerMatchInput {
  return {
    matchId: `match-${day}`,
    gameId: `game-${day}`,
    playedAt: new Date(`${day}T17:00:00.000Z`),
    outcome,
    game,
    ownerSlot: 1,
    slot1: [ELIN_PLAYER, JONAS],
    slot2: [SOFIA, ADAM],
    sets: outcome === "won" ? WON_SETS : LOST_SETS,
    rating,
    canOpenGame: true,
  };
}

/** Newest first: 7 won, 3 lost, every format, one unrated Friendly game. */
const CONFIRMED_LAST_MATCHES: PlayerMatchInput[] = [
  lastMatch("2026-10-01", "won", TUESDAY_CREW, rated(4.7, 4.8)),
  lastMatch("2026-09-28", "won", AUTUMN_CUP_POOL, rated(4.7, 4.7)),
  lastMatch("2026-09-26", "won", AUTUMN_CUP_SEMI, rated(4.6, 4.7)),
  lastMatch("2026-09-23", "won", AMERICANO, rated(4.5, 4.6)),
  {
    ...lastMatch("2026-09-20", "lost", OPEN_FRIENDLY, null),
    canOpenGame: false,
  },
  lastMatch("2026-09-17", "won", TUESDAY_CREW, rated(4.5, 4.5)),
  lastMatch("2026-09-14", "won", TUESDAY_CREW, rated(4.4, 4.5)),
  lastMatch("2026-09-11", "lost", TUESDAY_CREW, rated(4.5, 4.4)),
  lastMatch("2026-09-08", "won", TUESDAY_CREW, rated(4.4, 4.5)),
  lastMatch("2026-09-05", "lost", TUESDAY_CREW, rated(4.5, 4.4)),
];

/**
 * Player profile states shared by both clients' tests and previews. Shapes
 * follow `users.playerProfile`.
 */
export function createPlayerProfileFixtures(): {
  confirmed: PlayerProfileFixture;
  provisional: PlayerProfileFixture;
  topBand: PlayerProfileFixture;
  hysteresis: PlayerProfileFixture;
  selfDeclared: PlayerProfileFixture;
  newPlayer: PlayerProfileFixture;
  self: PlayerProfileFixture;
} {
  const confirmed: PlayerProfileFixture = {
    player: ELIN,
    venue: { name: "Padelhuset Bromma" },
    rating: {
      levelBand: "B3",
      levelValue: 4.79,
      provisional: false,
      ratedMatchCount: 64,
      ratedMatchesRemaining: 0,
    },
    overall: {
      played: 64,
      won: 41,
      lost: 22,
      drawn: 1,
      setsWon: 85,
      setsPlayed: 139,
    },
    streaks: {
      current: 4,
      best: 7,
      bestReachedAt: new Date("2026-03-14T17:00:00.000Z"),
    },
    position: {
      declared: "left",
      recordedCount: 50,
      leftCount: 36,
      rightCount: 14,
    },
    trend: { levelChange: 0.3 },
    lastMatches: CONFIRMED_LAST_MATCHES,
  };

  const provisional: PlayerProfileFixture = {
    ...confirmed,
    venue: null,
    rating: {
      levelBand: "C2",
      levelValue: 3.42,
      provisional: true,
      ratedMatchCount: 3,
      ratedMatchesRemaining: 2,
    },
    overall: {
      played: 3,
      won: 2,
      lost: 1,
      drawn: 0,
      setsWon: 4,
      setsPlayed: 7,
    },
    streaks: {
      current: 0,
      best: 2,
      bestReachedAt: new Date("2026-09-20T17:00:00.000Z"),
    },
    position: {
      declared: "either",
      recordedCount: 3,
      leftCount: 2,
      rightCount: 1,
    },
    trend: { levelChange: 0.2 },
    lastMatches: [
      {
        ...lastMatch(
          "2026-09-30",
          "won",
          OPEN_FRIENDLY,
          rated(3.3, 3.4, "C2", "C2"),
        ),
        ownerSlot: 2,
        slot1: [SOFIA, ADAM],
        slot2: [ELIN_PLAYER, JONAS],
        sets: [
          { slot1GamesWon: 4, slot2GamesWon: 6 },
          { slot1GamesWon: 6, slot2GamesWon: 7 },
        ],
      },
      lastMatch(
        "2026-09-24",
        "lost",
        OPEN_FRIENDLY,
        rated(3.4, 3.3, "C2", "C2"),
      ),
      lastMatch(
        "2026-09-20",
        "won",
        OPEN_FRIENDLY,
        rated(3.2, 3.4, "C2", "C2"),
      ),
    ],
  };

  const topBand: PlayerProfileFixture = {
    ...confirmed,
    rating: {
      levelBand: "A",
      levelValue: 6.81,
      provisional: false,
      ratedMatchCount: 120,
      ratedMatchesRemaining: 0,
    },
  };

  const hysteresis: PlayerProfileFixture = {
    ...confirmed,
    rating: {
      levelBand: "B3",
      levelValue: 4.15,
      provisional: false,
      ratedMatchCount: 40,
      ratedMatchesRemaining: 0,
    },
  };

  const selfDeclared: PlayerProfileFixture = {
    player: ELIN,
    venue: null,
    rating: {
      levelBand: "B3",
      levelValue: 4.55,
      provisional: true,
      ratedMatchCount: 0,
      ratedMatchesRemaining: 5,
    },
    overall: EMPTY_OVERALL,
    streaks: NO_STREAKS,
    position: { ...NO_POSITION, declared: "right" },
    trend: null,
    lastMatches: [],
  };

  const newPlayer: PlayerProfileFixture = {
    player: ELIN,
    venue: null,
    rating: null,
    overall: EMPTY_OVERALL,
    streaks: NO_STREAKS,
    position: NO_POSITION,
    trend: null,
    lastMatches: [],
  };

  const self: PlayerProfileFixture = {
    ...confirmed,
    player: { ...ELIN, isViewer: true },
  };

  return {
    confirmed,
    provisional,
    topBand,
    hysteresis,
    selfDeclared,
    newPlayer,
    self,
  };
}
