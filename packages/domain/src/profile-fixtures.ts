import type { HomeFormOutcome } from "./home-fixtures";
import type { ProfileAllTimeInput } from "./profile-all-time";
import type { ProfileLevelInput } from "./profile-level";
import type { PreferredPosition } from "./preferred-position";

export type ProfileFixture = {
  userName: string;
  pendingInviteCount: number;
  teamCount: number;
  preferredPosition: PreferredPosition | null;
  level: ProfileLevelInput | null;
  recentForm: HomeFormOutcome[];
  allTime: ProfileAllTimeInput;
};

const EMPTY_ALL_TIME: ProfileAllTimeInput = {
  matchesPlayed: 0,
  matchesWon: 0,
  matchesLost: 0,
  setsWon: 0,
  setsLost: 0,
  longestWinStreak: 0,
  mostPlayedPartnerName: null,
  firstMatchAt: null,
};

/**
 * Preview data for the Profile states, shared by the mobile gallery and the
 * tests. Pages and components render props.
 */
export function createProfileFixtures(): {
  provisional: ProfileFixture;
  confirmed: ProfileFixture;
  topBand: ProfileFixture;
  newPlayer: ProfileFixture;
} {
  const provisional: ProfileFixture = {
    userName: "Alex Rivera",
    pendingInviteCount: 2,
    teamCount: 1,
    preferredPosition: "left",
    level: {
      band: "C2",
      level: "3.4",
      provisional: true,
      ratedMatchCount: 3,
      ratedMatchesRemaining: 4,
      progressPercent: 16,
      history: ["3.1", "3.2", "3.4"],
    },
    recentForm: ["won", "lost", "won", "draw"],
    allTime: {
      matchesPlayed: 6,
      matchesWon: 3,
      matchesLost: 2,
      setsWon: 8,
      setsLost: 6,
      longestWinStreak: 2,
      mostPlayedPartnerName: "Sam Carter",
      firstMatchAt: new Date(2025, 8, 12),
    },
  };

  const confirmed: ProfileFixture = {
    ...provisional,
    pendingInviteCount: 0,
    teamCount: 0,
    preferredPosition: "either",
    level: {
      band: "C2",
      level: "3.6",
      provisional: false,
      ratedMatchCount: 14,
      ratedMatchesRemaining: 0,
      progressPercent: 42,
      history: ["3.8", "3.6"],
    },
    recentForm: ["won", "won", "lost", "won", "lost", "draw", "won", "won"],
    allTime: {
      matchesPlayed: 31,
      matchesWon: 19,
      matchesLost: 10,
      setsWon: 44,
      setsLost: 29,
      longestWinStreak: 5,
      mostPlayedPartnerName: "Riley Okafor",
      firstMatchAt: new Date(2023, 1, 4),
    },
  };

  const topBand: ProfileFixture = {
    ...confirmed,
    level: {
      band: "A",
      level: "6.8",
      provisional: false,
      ratedMatchCount: 60,
      ratedMatchesRemaining: 0,
      progressPercent: null,
      history: ["6.8", "6.8"],
    },
  };

  const newPlayer: ProfileFixture = {
    userName: "Alex Rivera",
    pendingInviteCount: 0,
    teamCount: 0,
    preferredPosition: null,
    level: null,
    recentForm: [],
    allTime: EMPTY_ALL_TIME,
  };

  return { provisional, confirmed, topBand, newPlayer };
}
