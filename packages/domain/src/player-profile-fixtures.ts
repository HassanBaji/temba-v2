import type { PlayerOverallInput } from "./player-profile";
import type { PlayerLevelInput } from "./player-profile-level";

export type PlayerProfileFixture = {
  player: { id: string; name: string; image: string | null; isViewer: boolean };
  venue: { name: string } | null;
  rating: PlayerLevelInput | null;
  overall: PlayerOverallInput;
};

const EMPTY_OVERALL: PlayerOverallInput = {
  played: 0,
  won: 0,
  lost: 0,
  drawn: 0,
  setsWon: 0,
  setsPlayed: 0,
};

const ELIN = {
  id: "8c0f1f4e-2d0c-4f49-9a55-6a1f3b1f0a01",
  name: "Elin Nilsson",
  image: null,
  isViewer: false,
};

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
  };

  const newPlayer: PlayerProfileFixture = {
    player: ELIN,
    venue: null,
    rating: null,
    overall: EMPTY_OVERALL,
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
