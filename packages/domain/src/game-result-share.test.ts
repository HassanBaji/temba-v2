import assert from "node:assert/strict";
import { isolate } from "@repo/i18n/bidi";
import { describe, it } from "vitest";

import type { BoardPlayer } from "./football-board";
import type { FriendlyGameDetailsSide } from "./friendly-game-details";
import {
  footballResultCard,
  formatFootballResultShareMessage,
  formatPadelResultShareMessage,
  gameResultPath,
  padelResultCard,
  padelStickerLine,
  resultShareCard,
  type ResultShareGame,
} from "./game-result-share";

const VIEWER = "user-you";

function seat(userId: string, name: string) {
  return { userId, name, image: null, levelBand: "C1" as const };
}

const sides: FriendlyGameDetailsSide[] = [
  {
    sideIndex: 1,
    gameTeamId: "team-1",
    left: seat("user-hassan", "Hassan Ali"),
    right: seat("user-khalid", "Khalid Mansoor"),
  },
  {
    sideIndex: 2,
    gameTeamId: "team-2",
    left: seat(VIEWER, "Elin Larsson"),
    right: seat("user-maryam", "Maryam Khalaf"),
  },
];

const match = {
  startTime: null,
  durationInMinutes: 90,
  slot1GameTeamId: "team-1",
  slot2GameTeamId: "team-2",
  sets: [
    { id: "s1", slot1GamesWon: 4, slot2GamesWon: 6 },
    { id: "s2", slot1GamesWon: 6, slot2GamesWon: 3 },
    { id: "s3", slot1GamesWon: 5, slot2GamesWon: 7 },
  ],
  outcome: { slot1SetWins: 1, slot2SetWins: 2, result: "slot2" as const },
};

const place = {
  windowStart: new Date("2026-10-10T17:00:00.000Z"),
  windowEnd: new Date("2026-10-10T18:30:00.000Z"),
  venue: { name: "Padel Hub", city: "Janabiyah" },
  courtName: "Court 3",
};

describe("padelResultCard", () => {
  const card = padelResultCard(
    {
      ...place,
      sides,
      viewerUserId: VIEWER,
      match,
      rated: true,
    },
    "en",
  );

  it("puts the winners first with the sets read from their side", () => {
    assert.equal(card.typeLine, "FRIENDLY · PADEL");
    assert.equal(card.typeNote, "RATED MATCH");
    assert.deepEqual(
      card.winners.map((row) => [row.init, row.name, row.isYou]),
      [
        ["EL", "Elin Larsson", true],
        ["MK", "Maryam Khalaf", false],
      ],
    );
    assert.deepEqual(
      card.losers.map((row) => row.name),
      ["Hassan Ali", "Khalid Mansoor"],
    );
    assert.equal(card.winCount, 2);
    assert.equal(card.loseCount, 1);
    assert.equal(card.winnerLine, "You & Maryam");
    assert.equal(card.loserLine, "Hassan & Khalid");
    assert.equal(card.winnerShort, "EM");
    assert.equal(card.loserShort, "HK");
    assert.deepEqual(
      card.setRows.map((row) => [row.label, row.w, row.l, row.note]),
      [
        ["SET 1", 6, 4, "won"],
        ["SET 2", 3, 6, "lost"],
        ["SET 3", 7, 5, "won"],
      ],
    );
    assert.equal(card.venue, "Padel Hub, Court 3");
    assert.equal(card.when, "Sat 10 Oct 2026, 8:00 PM");
    assert.equal(card.whenShort, "Sat 10 Oct");
    assert.equal(card.draw, false);
  });

  it("writes the sticker line and the message", () => {
    assert.equal(padelStickerLine(card, "en"), "YOU & MARYAM WIN 2–1");
    assert.equal(
      formatPadelResultShareMessage(
        card,
        "https://temba.app/dashboard/games/g1",
        "en",
      ),
      [
        "🎾 Padel result",
        "🏆 You & Maryam beat Hassan & Khalid 2–1",
        "SET 1 6–4 · SET 2 3–6 · SET 3 7–5",
        "📍 Padel Hub, Court 3",
        "📅 Sat 10 Oct 2026, 8:00 PM",
        "🔗 https://temba.app/dashboard/games/g1",
      ].join("\n"),
    );
  });

  it("names both pairs in full for a viewer who did not play", () => {
    const watcher = padelResultCard(
      {
        ...place,
        sides,
        viewerUserId: "user-organizer",
        match,
        rated: false,
      },
      "en",
    );
    assert.equal(watcher.winnerLine, "Elin & Maryam");
    assert.equal(watcher.typeNote, "FRIENDLY MATCH");
    assert.equal(watcher.winners[0]?.isYou, false);
  });

  it("writes the card and the message in Arabic", () => {
    const arabic = padelResultCard(
      { ...place, sides, viewerUserId: VIEWER, match, rated: true },
      "ar",
    );
    assert.equal(arabic.typeLine, "ودية · بادل");
    assert.equal(arabic.typeNote, "مباراة مصنّفة");
    assert.equal(arabic.winnerLine, `${isolate("أنت")} و${isolate("Maryam")}`);
    assert.equal(arabic.setRows[0]?.label, "الشوط 1");
    assert.equal(
      padelStickerLine(arabic, "ar"),
      `${isolate("أنت")} و${isolate("MARYAM")} يفوزون 2–1`,
    );
    assert.equal(
      formatPadelResultShareMessage(arabic, "https://temba.app/g", "ar").split(
        "\n",
      )[1],
      `🏆 ${isolate("أنت")} و${isolate("Maryam")} تغلّبوا على ${isolate("Hassan")} و${isolate("Khalid")} 2–1`,
    );
  });
});

function player(
  userId: string,
  name: string,
  sideIndex: 1 | 2 | null,
  extra: Partial<BoardPlayer> = {},
): BoardPlayer {
  return {
    userId,
    name,
    image: null,
    role: "outfield",
    position: "mid",
    levelBand: "C1",
    sideIndex,
    goals: 0,
    isViewer: false,
    ...extra,
  };
}

describe("footballResultCard", () => {
  const card = footballResultCard(
    {
      windowStart: new Date("2026-10-18T17:00:00.000Z"),
      windowEnd: new Date("2026-10-18T18:30:00.000Z"),
      venue: { name: "Karbabad Turf", city: null },
      courtName: "Pitch 2",
      players: [
        player("u1", "Hassan Ali", 1, { goals: 2, isViewer: true }),
        player("u2", "Omar Mahmood", 1, { goals: 1 }),
        player("u3", "Yousif Salman", 1, { role: "keeper", position: null }),
        player("u4", "Maryam Khalaf", 2),
        player("u5", "Tariq Nasser", 2, { goals: 1 }),
        player("u6", "Jaber Ahmed", 2, { goals: 1, position: "fwd" }),
      ],
      bibs: { slot1: "orange", slot2: "white" },
      score: { slot1: 4, slot2: 2 },
      sideSize: 6,
      rated: false,
    },
    "en",
  );

  it("puts the winning bib first and lists scorers winners first", () => {
    assert.equal(card.typeLine, "FRIENDLY · FOOTBALL · 6-A-SIDE");
    assert.deepEqual(card.win, { name: "Orange", bib: "orange", score: 4 });
    assert.deepEqual(card.lose, { name: "White", bib: "white", score: 2 });
    assert.equal(card.draw, false);
    assert.deepEqual(
      card.scorers.map((row) => [row.name, row.goals, row.onWinningSide]),
      [
        ["Hassan Ali", 2, true],
        ["Omar Mahmood", 1, true],
        ["Tariq Nasser", 1, false],
        ["Jaber Ahmed", 1, false],
      ],
    );
    assert.deepEqual(
      card.lineups.win.map((row) => row.init),
      ["YS", "HA", "OM"],
    );
    assert.deepEqual(card.you, {
      init: "HA",
      name: "Hassan Ali",
      goals: 2,
      code: "MID",
    });
    assert.equal(card.venue, "Karbabad Turf, Pitch 2");
    assert.equal(card.whenShort, "Sun 18 Oct");
  });

  it("writes the message", () => {
    assert.equal(
      formatFootballResultShareMessage(card, "https://temba.app/g", "en"),
      [
        "⚽ Football result",
        "🏆 Orange 4–2 White",
        "⚽ Hassan A ×2, Omar M, Tariq N, Jaber A",
        "📍 Karbabad Turf, Pitch 2",
        "📅 Sun 18 Oct 2026, 8:00 PM",
        "🔗 https://temba.app/g",
      ].join("\n"),
    );
  });

  it("keeps slot order on a draw", () => {
    const draw = footballResultCard(
      {
        windowStart: null,
        windowEnd: null,
        venue: null,
        courtName: null,
        players: [],
        bibs: { slot1: "black", slot2: "white" },
        score: { slot1: 1, slot2: 1 },
        sideSize: null,
        rated: true,
      },
      "en",
    );
    assert.equal(draw.draw, true);
    assert.equal(draw.win.name, "Black");
    assert.equal(draw.typeLine, "FRIENDLY · FOOTBALL");
    assert.equal(draw.venue, "Temba");
    assert.equal(draw.when, "");
    assert.equal(draw.you, null);
  });
});

describe("gameResultPath", () => {
  it("opens the Game on the web", () => {
    assert.equal(gameResultPath("g1"), "/dashboard/games/g1");
  });
});

const shareMatch = {
  startTime: null,
  durationInMinutes: 90,
  courtName: "Court 3",
  slot1GameTeamId: "t1",
  slot2GameTeamId: "t2",
  sets: [{ id: "s1", slot1GamesWon: 6, slot2GamesWon: 4 }],
  outcome: { slot1SetWins: 1, slot2SetWins: 0, result: "slot1" as const },
};

const padel: ResultShareGame = {
  sport: "padel",
  roster: null,
  phase: "final",
  viewerUserId: "you",
  rated: true,
  windowStart: new Date("2026-10-10T17:00:00.000Z"),
  windowEnd: new Date("2026-10-10T18:30:00.000Z"),
  venue: { name: "Padel Hub", city: null },
  sideSize: null,
  recordedCourts: [],
  sides: [
    {
      sideIndex: 1,
      gameTeamId: "t1",
      left: {
        userId: "you",
        name: "Elin Larsson",
        image: null,
        levelBand: "C1",
      },
      right: {
        userId: "p2",
        name: "Maryam Khalaf",
        image: null,
        levelBand: "C1",
      },
    },
    {
      sideIndex: 2,
      gameTeamId: "t2",
      left: { userId: "p3", name: "Hassan Ali", image: null, levelBand: "C1" },
      right: {
        userId: "p4",
        name: "Khalid Mansoor",
        image: null,
        levelBand: "C1",
      },
    },
  ],
  matches: [shareMatch],
};

describe("resultShareCard", () => {
  it("builds the padel card from a final Match", () => {
    const card = resultShareCard(padel, null, "en");
    assert.equal(card?.kind, "padel");
    assert.equal(card?.venue, "Padel Hub, Court 3");
  });

  it("has nothing to share before the result is final", () => {
    assert.equal(
      resultShareCard({ ...padel, phase: "needs_results" }, null, "en"),
      null,
    );
  });

  it("builds the football card from a completed board", () => {
    const football: ResultShareGame = {
      ...padel,
      sport: "football",
      roster: { users: [], count: 0, cap: 12 },
      sideSize: 6,
      recordedCourts: [{ name: "Pitch 2" }],
      sides: [],
      matches: [],
    };
    assert.equal(resultShareCard(football, null, "en"), null);
    const card = resultShareCard(
      football,
      {
        players: [],
        teams: { bibs: { slot1: "black", slot2: "white" } },
        match: { status: "completed", score: { slot1: 2, slot2: 1 } },
      },
      "en",
    );
    assert.equal(card?.kind, "football");
    assert.equal(card?.venue, "Padel Hub, Pitch 2");
    assert.equal(
      resultShareCard(
        football,
        {
          players: [],
          teams: { bibs: { slot1: "black", slot2: "white" } },
          match: { status: "scheduled", score: { slot1: 2, slot2: 1 } },
        },
        "en",
      ),
      null,
    );
  });
});
