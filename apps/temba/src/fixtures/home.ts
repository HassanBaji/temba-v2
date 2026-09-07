import { GroupSportEnum } from "@repo/db";

import type { LevelBand } from "~/lib/level-bands";

export type HomeSeat = {
  id: string;
  name: string | null;
  filled: boolean;
  sideLabel?: string;
};

export type HomeNextGame = {
  id: string;
  phase: "upcoming" | "ongoing" | "needs_results";
  venueName: string;
  courtLabel: string | null;
  formatLabel: string;
  sportLabel: string;
  startsAt: string;
  seats: HomeSeat[];
};

export type HomeComingUpGame = {
  id: string;
  venueName: string;
  startsAt: string;
  seatsTaken: number;
  seatsTotal: number;
};

export type HomeLevel = {
  band: LevelBand | null;
  level: string | null;
  provisional: boolean;
  ratedMatchesRemaining: number;
  history: string[];
  progressPercent: number | null;
  nextBand: LevelBand | null;
  canSelfDeclare: boolean;
};

export type HomeFormOutcome = "won" | "lost" | "draw";

export type HomeStandingRow = {
  groupId: string;
  groupName: string;
  sport: GroupSportEnum;
  position: number;
  memberCount: number;
};

export type HomeFixture = {
  userName: string;
  pendingInviteCount: number;
  bookedGameCount: number;
  unreadNotifications: boolean;
  nextGame: HomeNextGame | null;
  comingUp: HomeComingUpGame[];
  level: HomeLevel;
  recentForm: HomeFormOutcome[];
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  standing: HomeStandingRow[];
};

function isoMinutesFrom(now: Date, minutes: number) {
  return new Date(now.getTime() + minutes * 60 * 1000).toISOString();
}

function fourSeats(openLast: boolean): HomeSeat[] {
  return [
    { id: "seat-a1", name: "Alex", filled: true, sideLabel: "A" },
    { id: "seat-a2", name: "Sam", filled: true, sideLabel: "A" },
    { id: "seat-b1", name: "Riley", filled: true, sideLabel: "B" },
    {
      id: "seat-b2",
      name: openLast ? null : "Jordan",
      filled: !openLast,
      sideLabel: "B",
    },
  ];
}

/**
 * Dev-only Home preview data. This file is the only place in the Home
 * redesign that holds fixture records — pages and components render props.
 */
export function createHomeFixtures(now = new Date()): {
  provisional: HomeFixture;
  confirmed: HomeFixture;
  empty: HomeFixture;
} {
  const nextStart = isoMinutesFrom(now, 5 * 60 + 42);
  const laterStart = isoMinutesFrom(now, 26 * 60);
  const weekendStart = isoMinutesFrom(now, 50 * 60);

  const nextGame: HomeNextGame = {
    id: "game-next",
    phase: "upcoming",
    venueName: "Padel Club",
    courtLabel: "Court 1",
    formatLabel: "Doubles",
    sportLabel: "Padel",
    startsAt: nextStart,
    seats: fourSeats(true),
  };

  const comingUp: HomeComingUpGame[] = [
    {
      id: "game-later",
      venueName: "Riverside Hall",
      startsAt: laterStart,
      seatsTaken: 3,
      seatsTotal: 4,
    },
    {
      id: "game-weekend",
      venueName: "North Courts",
      startsAt: weekendStart,
      seatsTaken: 2,
      seatsTotal: 4,
    },
  ];

  const standing: HomeStandingRow[] = [
    {
      groupId: "group-weekday",
      groupName: "Weekday ladder",
      sport: GroupSportEnum.PADEL,
      position: 4,
      memberCount: 13,
    },
  ];

  const provisional: HomeFixture = {
    userName: "Alex Rivera",
    pendingInviteCount: 2,
    bookedGameCount: 3,
    unreadNotifications: true,
    nextGame,
    comingUp,
    level: {
      band: "C2",
      level: "3.4",
      provisional: true,
      ratedMatchesRemaining: 4,
      history: ["3.1", "3.2", "3.4"],
      progressPercent: 16,
      nextBand: "C1",
      canSelfDeclare: false,
    },
    recentForm: ["won", "lost", "won", "draw"],
    gamesPlayed: 6,
    gamesWon: 3,
    gamesLost: 2,
    standing,
  };

  const confirmed: HomeFixture = {
    userName: "Alex Rivera",
    pendingInviteCount: 0,
    bookedGameCount: 3,
    unreadNotifications: false,
    nextGame: {
      ...nextGame,
      phase: "ongoing",
      seats: fourSeats(false),
    },
    comingUp,
    level: {
      band: "C1",
      level: "4.2",
      provisional: false,
      ratedMatchesRemaining: 0,
      history: ["3.8", "3.9", "4.0", "4.1", "4.2"],
      progressPercent: 40,
      nextBand: "B3",
      canSelfDeclare: false,
    },
    recentForm: [
      "won",
      "won",
      "won",
      "lost",
      "won",
      "draw",
      "won",
      "lost",
      "won",
      "won",
    ],
    gamesPlayed: 18,
    gamesWon: 11,
    gamesLost: 6,
    standing,
  };

  const empty: HomeFixture = {
    userName: "Alex Rivera",
    pendingInviteCount: 0,
    bookedGameCount: 0,
    unreadNotifications: false,
    nextGame: null,
    comingUp: [],
    level: {
      band: null,
      level: null,
      provisional: false,
      ratedMatchesRemaining: 0,
      history: [],
      progressPercent: null,
      nextBand: null,
      canSelfDeclare: true,
    },
    recentForm: [],
    gamesPlayed: 0,
    gamesWon: 0,
    gamesLost: 0,
    standing: [],
  };

  return { provisional, confirmed, empty };
}
