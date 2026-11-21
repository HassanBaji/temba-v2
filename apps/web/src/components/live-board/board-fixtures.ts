import {
  ROUND_CLOCK_ON_SCHEDULE,
  type FootballScoreboard,
  type LiveBoardMatch,
  type LiveBoardRound,
  type LiveBoardRoundMark,
  type LiveBoardTableRow,
  type PadelScoreboard,
  type SocialBoardContent,
} from "@repo/domain/live-board";

import type { LiveBoardSnapshot } from "./board-kit";

const MINUTE = 60_000;

/** Round 4 of the Sunday Social starts here, at 12:00 in the product timezone. */
export const PREVIEW_ROUND_START = new Date("2026-11-09T09:00:00.000Z");

/** 18 minutes 22 seconds into the Round: 11:38 left on the clock. */
export const PREVIEW_NOW = new Date(
  PREVIEW_ROUND_START.getTime() + 18 * MINUTE + 22_000,
);

const TEAMS: Record<string, [string, string]> = {
  qa: ["Qasim Albaqali", "Ahmed Buhazza"],
  kh: ["Khalid Janahi", "Hassan Haji"],
  oj: ["Omar Mansoor", "Jassim Fakhro"],
  ln: ["Layla Abbas", "Nora Bader"],
  rn: ["Reem Saleh", "Noor Ali"],
  ry: ["Rashed Ebrahim", "Yousif Saleh"],
  sm: ["Sara Chahine", "Mariam Zayani"],
  da: ["Dana Kanoo", "Ali Khalaf"],
};

function side(id: string) {
  return { id, players: [...(TEAMS[id] ?? [id, id])] };
}

function roundStart(roundNumber: number) {
  return new Date(
    PREVIEW_ROUND_START.getTime() + (roundNumber - 4) * 40 * MINUTE,
  );
}

function round(
  roundNumber: number,
  state: LiveBoardRound["state"],
  pairs: [string, string, number | null, number | null][],
  matchState?: LiveBoardMatch["state"][],
): LiveBoardRound {
  const startTime = roundStart(roundNumber);
  return {
    roundNumber,
    state,
    startTime,
    matches: pairs.map(([first, second, score1, score2], index) => ({
      id: `r${roundNumber}-${index}`,
      courtName: `Court ${index + 1}`,
      startTime,
      state:
        matchState?.[index] ??
        (state === "played"
          ? "confirmed"
          : state === "scheduled"
            ? "scheduled"
            : score1 == null
              ? "on_court"
              : "awaiting_confirmation"),
      side1: side(first),
      side2: side(second),
      score1,
      score2,
    })),
  };
}

function row(
  place: number,
  id: string,
  record: [number, number, number, number],
  games: [number, number],
  points: number,
  rounds: string,
): LiveBoardTableRow {
  const marks: Record<string, LiveBoardRoundMark> = {
    W: "won",
    L: "lost",
    D: "drawn",
    "-": "none",
  };
  return {
    id,
    players: [...(TEAMS[id] ?? [id])],
    place,
    played: record[0],
    won: record[1],
    drawn: record[2],
    lost: record[3],
    gamesFor: games[0],
    gamesAgainst: games[1],
    difference: games[0] - games[1],
    points,
    rounds: rounds.split("").map((mark) => marks[mark] ?? "none"),
  };
}

const LIVE_ROUNDS: LiveBoardRound[] = [
  round(1, "played", [
    ["qa", "da", 6, 2],
    ["kh", "sm", 5, 3],
    ["oj", "ry", 4, 3],
    ["ln", "rn", 5, 4],
  ]),
  round(2, "played", [
    ["qa", "sm", 5, 3],
    ["rn", "kh", 4, 3],
    ["ln", "oj", 5, 3],
    ["ry", "da", 6, 3],
  ]),
  round(3, "played", [
    ["qa", "ln", 5, 4],
    ["kh", "ry", 7, 4],
    ["oj", "da", 4, 1],
    ["rn", "sm", 3, 3],
  ]),
  round(4, "on_court", [
    ["ln", "sm", 4, 3],
    ["ry", "oj", 2, 5],
    ["kh", "rn", null, null],
    ["da", "qa", 3, 3],
  ]),
  round(5, "scheduled", [
    ["ln", "oj", null, null],
    ["sm", "rn", null, null],
    ["ry", "qa", null, null],
    ["kh", "da", null, null],
  ]),
  round(6, "scheduled", [
    ["ln", "rn", null, null],
    ["oj", "qa", null, null],
    ["sm", "da", null, null],
    ["ry", "kh", null, null],
  ]),
  { roundNumber: 7, state: "not_made", startTime: roundStart(7), matches: [] },
];

const LIVE_ROWS = [
  row(1, "qa", [3, 3, 0, 0], [16, 8], 9, "WWW----"),
  row(2, "kh", [3, 2, 0, 1], [15, 12], 6, "LWW----"),
  row(3, "oj", [3, 2, 0, 1], [11, 8], 6, "WLW----"),
  row(4, "ln", [3, 2, 0, 1], [14, 14], 6, "WLW----"),
  row(5, "rn", [3, 2, 0, 1], [11, 12], 6, "WWL----"),
  row(6, "ry", [3, 1, 0, 2], [13, 13], 3, "LWL----"),
  row(7, "sm", [3, 0, 0, 3], [9, 15], 0, "LLL----"),
  row(8, "da", [3, 0, 0, 3], [6, 13], 0, "LLL----"),
];

const SOCIAL: SocialBoardContent = {
  kind: "social",
  ranks: "teams",
  roundCount: 7,
  matchMinutes: 30,
  rounds: LIVE_ROUNDS,
  tables: [{ poolIndex: null, rows: LIVE_ROWS }],
  finished: false,
  finishedAt: null,
};

const FINAL: SocialBoardContent = {
  ...SOCIAL,
  rounds: LIVE_ROUNDS.map((entry) => ({
    ...entry,
    state: "played" as const,
    matches: (entry.matches.length > 0
      ? entry.matches
      : (LIVE_ROUNDS[0]?.matches ?? [])
    ).map((match) => ({ ...match, state: "confirmed" as const })),
  })),
  tables: [
    {
      poolIndex: null,
      rows: [
        row(1, "qa", [7, 6, 1, 0], [38, 19], 19, "WWWWWDW"),
        row(2, "rn", [7, 6, 0, 1], [30, 26], 18, "WWLWWWW"),
        row(3, "oj", [7, 5, 1, 1], [33, 22], 16, "WLWWWDW"),
        row(4, "kh", [7, 4, 0, 3], [31, 25], 12, "LWWLWWL"),
        row(5, "ln", [7, 3, 0, 4], [27, 33], 9, "WLWWLLL"),
        row(6, "sm", [7, 2, 0, 5], [24, 29], 6, "LLLLLWW"),
        row(7, "ry", [7, 1, 0, 6], [22, 31], 3, "LWLLLLL"),
        row(8, "da", [7, 0, 0, 7], [15, 35], 0, "LLLLLLL"),
      ],
    },
  ],
  finished: true,
  finishedAt: new Date(PREVIEW_ROUND_START.getTime() + 150 * MINUTE),
};

const WAITING: SocialBoardContent = {
  ...SOCIAL,
  rounds: [],
  tables: [],
};

const AMERICANO_PLAYERS = [
  "Qasim Albaqali",
  "Ahmed Buhazza",
  "Khalid Janahi",
  "Hassan Haji",
  "Omar Mansoor",
  "Jassim Fakhro",
  "Layla Abbas",
  "Nora Bader",
  "Reem Saleh",
  "Noor Ali",
  "Rashed Ebrahim",
  "Yousif Saleh",
];

const AMERICANO: SocialBoardContent = {
  ...SOCIAL,
  ranks: "players",
  rounds: LIVE_ROUNDS.map((entry) => ({
    ...entry,
    matches: entry.matches.slice(0, 3),
  })),
  tables: [
    {
      poolIndex: null,
      rows: AMERICANO_PLAYERS.map((name, index) => ({
        id: `p${index}`,
        players: [name],
        place: index + 1,
        played: 3,
        won: Math.max(0, 3 - Math.floor(index / 3)),
        drawn: 0,
        lost: Math.min(3, Math.floor(index / 3)),
        gamesFor: 17 - index,
        gamesAgainst: 6 + index,
        difference: 11 - 2 * index,
        points: 17 - index,
        rounds: [
          "won",
          index < 6 ? "won" : "lost",
          "lost",
          "none",
          "none",
          "none",
          "none",
        ],
      })),
    },
  ],
};

const PADEL: PadelScoreboard = {
  kind: "padel_match",
  sides: [
    [
      { name: "Hassan Haji", levelBand: "C+" },
      { name: "Khalid Janahi", levelBand: "C" },
    ],
    [
      { name: "Ahmed Buhazza", levelBand: "B" },
      { name: "Mariam Zayani", levelBand: "C-" },
    ],
  ],
  sets: [
    { score1: 6, score2: 4 },
    { score1: 3, score2: 6 },
    { score1: 4, score2: 3 },
  ],
  completed: false,
  courtName: "Court 3",
  ratingScope: "temba",
};

const FOOTBALL: FootballScoreboard = {
  kind: "football",
  sides: [
    {
      bib: "black",
      goals: 3,
      players: [
        { name: "Hassan Abdulla", role: "gk" },
        { name: "Rashid Nasser", role: "def" },
        { name: "Mahmood Jaffar", role: "def" },
        { name: "Hassan Haji", role: "mid" },
        { name: "Ebrahim Saleh", role: "mid" },
        { name: "Jaber Ali", role: "mid" },
        { name: "Ali Khalaf", role: "fwd" },
        { name: "Yousif Saleh", role: "fwd" },
      ],
      scorers: [
        { name: "Ali Khalaf", goals: 2 },
        { name: "Yousif Saleh", goals: 1 },
      ],
    },
    {
      bib: "white",
      goals: 2,
      players: [
        { name: "Faisal Ahmed", role: "gk" },
        { name: "Omar Mansoor", role: "def" },
        { name: "Bader Hamad", role: "def" },
        { name: "Tariq Nabeel", role: "mid" },
        { name: "Sayed Redha", role: "mid" },
        { name: "Salman Hasan", role: "mid" },
        { name: "Khalid Fardan", role: "fwd" },
        { name: "Noor Ali", role: "fwd" },
      ],
      scorers: [
        { name: "Khalid Fardan", goals: 1 },
        { name: "Noor Ali", goals: 1 },
      ],
    },
  ],
  completed: false,
  courtName: "Pitch 2",
  sideSize: 7,
  playersAllowed: 16,
  mvpName: null,
  hasMvp: true,
};

type Settings = LiveBoardSnapshot["settings"];

const SETTINGS: Settings = {
  rotate: false,
  rotateSeconds: 10,
  heldScreen: "on_court",
  rotationStartedAt: PREVIEW_NOW,
  colorScheme: "dark",
  showQr: true,
  roundClock: ROUND_CLOCK_ON_SCHEDULE,
  message: null,
};

function snapshot(
  content: LiveBoardSnapshot["content"],
  settings: Partial<Settings> = {},
  game: Partial<LiveBoardSnapshot["game"]> = {},
): LiveBoardSnapshot {
  return {
    status: "live",
    serverNow: PREVIEW_NOW,
    game: {
      name: "Sunday Social",
      groupName: "Tuesday Night Padel",
      venueName: "World Padel Academy Bahrain",
      sport: "padel",
      windowStart: roundStart(1),
      windowEnd: new Date(roundStart(7).getTime() + 30 * MINUTE),
      followUrl: "https://temba.app/dashboard/games/preview",
      ...game,
    },
    settings: { ...SETTINGS, ...settings },
    content,
  };
}

const MATCH_WINDOW = {
  windowStart: new Date(PREVIEW_NOW.getTime() - 72 * MINUTE),
  windowEnd: new Date(PREVIEW_NOW.getTime() + 18 * MINUTE),
};

export const liveBoardPreviews: {
  title: string;
  snapshot: LiveBoardSnapshot;
}[] = [
  { title: "2a Social, On court", snapshot: snapshot(SOCIAL) },
  {
    title: "3a Social, Standings",
    snapshot: snapshot(SOCIAL, { heldScreen: "table" }),
  },
  {
    title: "3b Social, Next up",
    snapshot: snapshot(SOCIAL, { heldScreen: "next_up" }),
  },
  { title: "3c Social, final", snapshot: snapshot(FINAL) },
  {
    title: "4a Padel match",
    snapshot: snapshot(PADEL, {}, { name: "Friendly match", ...MATCH_WINDOW }),
  },
  {
    title: "4b Football game",
    snapshot: snapshot(
      FOOTBALL,
      {},
      {
        name: "Thursday 7-a-side",
        groupName: "Karbabad FC",
        venueName: "Karbabad Turf",
        sport: "football",
        windowStart: new Date(PREVIEW_NOW.getTime() - 34 * MINUTE),
        windowEnd: new Date(PREVIEW_NOW.getTime() + 26 * MINUTE),
      },
    ),
  },
  {
    title: "5a Social, light",
    snapshot: snapshot(SOCIAL, { colorScheme: "light" }),
  },
  {
    title: "Message to the room",
    snapshot: snapshot(SOCIAL, {
      message: "Round 5 starts in 2 minutes. Check your court.",
    }),
  },
  { title: "Before the Rounds are posted", snapshot: snapshot(WAITING) },
  {
    title: "Americano, twelve players",
    snapshot: snapshot(AMERICANO, { heldScreen: "table" }),
  },
  {
    title: "Football, teams not published",
    snapshot: snapshot(
      { ...FOOTBALL, sides: null },
      { colorScheme: "light" },
      {
        name: "Thursday 7-a-side",
        groupName: "Karbabad FC",
        venueName: "Karbabad Turf",
      },
    ),
  },
];
