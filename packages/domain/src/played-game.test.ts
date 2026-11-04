import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { messagesFor } from "@repo/i18n/messages";

import type { BoardPlayer } from "./football-board";
import type { FriendlyGameDetailsSide } from "./friendly-game-details";
import {
  gameIsPlayed,
  padelPairLine,
  playedDurationLabel,
  playedFootballModel,
  playedPadelModel,
  playedRatingLine,
  playedTagLabel,
  playedWhenLine,
  playedWordLabel,
} from "./played-game";

const VIEWER = "user-you";

function seat(userId: string, name: string, levelBand: "C1" | "C2" | "B2") {
  return { userId, name, image: null, levelBand } as const;
}

const sides: FriendlyGameDetailsSide[] = [
  {
    sideIndex: 1,
    gameTeamId: "team-1",
    left: seat("user-hassan", "Hassan Ali", "B2"),
    right: seat("user-khalid", "Khalid Mansoor", "C1"),
  },
  {
    sideIndex: 2,
    gameTeamId: "team-2",
    left: seat("user-maryam", "Maryam Khalaf", "C2"),
    right: seat(VIEWER, "Elin Larsson", "C1"),
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
    { id: "s4", slot1GamesWon: null, slot2GamesWon: null },
  ],
  outcome: { slot1SetWins: 1, slot2SetWins: 2, result: "slot2" as const },
};

const place = {
  windowStart: new Date("2026-10-10T17:00:00.000Z"),
  windowEnd: new Date("2026-10-10T18:30:00.000Z"),
  venue: { name: "Padel Hub", city: "Janabiyah" },
  courtName: "Court 3",
};

describe("playedPadelModel", () => {
  const model = playedPadelModel(
    {
      ...place,
      sides,
      viewerUserId: VIEWER,
      match,
      groupName: null,
      rated: true,
      ratingImpact: { levelChange: 0.2, newLevelBand: "C1" },
      confirmation: { confirmedByOrganizer: false },
    },
    "en",
  );

  it("leads with the viewer's pair and reads the sets from their side", () => {
    assert.equal(model.dateLine, "Played, Sat 10 Oct");
    assert.equal(model.tag, "PADEL");
    assert.deepEqual(model.setLabels, ["S1", "S2", "S3"]);
    const [you, them] = model.board;
    assert.equal(you.line, "You & Maryam K");
    assert.equal(you.word, "Won");
    assert.deepEqual(
      you.sets.map((set) => [set.value, set.won]),
      [
        [6, true],
        [3, false],
        [7, true],
      ],
    );
    assert.equal(them.line, "Hassan A & Khalid M");
    assert.equal(them.word, "Lost");
    assert.deepEqual(
      them.sets.map((set) => set.value),
      [4, 6, 5],
    );
  });

  it("writes the result, place and your line", () => {
    assert.equal(model.result.line, "You & Maryam win 2–1 in sets");
    assert.equal(model.venueLine, "Padel Hub, Court 3");
    assert.equal(model.whenLine, "8:00 PM, 90 min, Janabiyah");
    assert.deepEqual(model.you, {
      line: "You played with Maryam K",
      ratingLine: "Counts for rating, C+ moves up",
      tag: "WON",
      won: true,
    });
  });

  it("lists your pair in ink and the opponents on paper", () => {
    const [pair, opponents] = model.columns;
    assert.equal(pair.title, "Your pair");
    assert.equal(pair.fill, "ink");
    assert.deepEqual(
      pair.players.map((row) => [row.name, row.meta, row.level, row.isYou]),
      [
        ["Maryam K", "LEFT", "C", false],
        ["You", "RIGHT", "C+", true],
      ],
    );
    assert.equal(opponents.title, "Opponents");
    assert.equal(opponents.word, "Lost");
    assert.equal(opponents.fill, "paper");
  });

  it("states the facts", () => {
    assert.deepEqual(model.facts, [
      { label: "Confirmed", value: "By both pairs" },
      { label: "Format", value: "3 sets" },
      { label: "Rating", value: "Counts for Temba rating" },
    ]);
  });

  it("names a group rated Match by its Rating scope", () => {
    const group = playedPadelModel(
      {
        ...place,
        sides,
        viewerUserId: VIEWER,
        match,
        groupName: "Tuesday padel",
        rated: false,
        ratingScope: "group",
        ratingImpact: null,
        confirmation: { confirmedByOrganizer: false },
      },
      "en",
    );
    assert.equal(group.you?.ratingLine, "Counts for group rating");
    assert.deepEqual(group.facts.at(-1), {
      label: "Rating",
      value: "Counts for group rating",
    });
  });

  it("falls back to team labels for a viewer who did not play", () => {
    const watcher = playedPadelModel(
      {
        ...place,
        sides,
        viewerUserId: "user-organizer",
        match,
        groupName: "Tuesday padel",
        rated: false,
        ratingImpact: null,
        confirmation: { confirmedByOrganizer: true },
      },
      "en",
    );
    assert.equal(watcher.board[0].line, "Hassan A & Khalid M");
    assert.equal(watcher.board[0].word, "Lost");
    assert.equal(watcher.result.line, "Maryam & Elin win 2–1 in sets");
    assert.equal(watcher.you, null);
    assert.deepEqual(
      watcher.columns.map((column) => column.title),
      ["Team A", "Team B"],
    );
    assert.deepEqual(watcher.facts[0], {
      label: "Group",
      value: "Tuesday padel",
    });
    assert.deepEqual(watcher.facts[1], {
      label: "Confirmed",
      value: "By the organizer",
    });
    assert.deepEqual(watcher.facts[3], {
      label: "Rating",
      value: "Unrated",
    });
  });

  it("writes the padel model in Arabic", () => {
    const arabic = playedPadelModel(
      {
        ...place,
        sides,
        viewerUserId: VIEWER,
        match,
        groupName: null,
        rated: true,
        ratingImpact: { levelChange: 0.2, newLevelBand: "C1" },
        confirmation: { confirmedByOrganizer: false },
      },
      "ar",
    );
    assert.equal(arabic.dateLine.startsWith("لُعبت، "), true);
    assert.equal(arabic.tag, "بادل");
    assert.deepEqual(arabic.setLabels, ["ش1", "ش2", "ش3"]);
    assert.equal(arabic.board[0].line, "أنت وMaryam K");
    assert.equal(arabic.board[0].word, "Won");
    assert.equal(playedWordLabel(arabic.board[0].word, "ar"), "فوز");
    assert.equal(arabic.result.line, "أنت وMaryam يفوزون 2–1 في الأشواط");
    assert.equal(arabic.you?.ratingLine, "تُحتسب في التصنيف، C+ يرتفع");
    assert.equal(arabic.you?.tag, "WON");
    assert.equal(playedTagLabel("WON", "ar"), "فوز");
    assert.equal(arabic.columns[0].players[0]?.meta, "يسار");
    assert.deepEqual(arabic.facts[2], {
      label: messagesFor("ar").you.ratingScope.title,
      value: messagesFor("ar").you.ratingScope.temba,
    });
  });
});

describe("padelPairLine", () => {
  it("puts the viewer first and names an open seat", () => {
    assert.equal(
      padelPairLine(sides[1] ?? null, VIEWER, "en"),
      "You & Maryam K",
    );
    assert.equal(
      padelPairLine(
        { sideIndex: 1, gameTeamId: null, left: null, right: sides[0]!.right },
        VIEWER,
        "en",
        "first",
      ),
      "Open & Khalid",
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

const footballPlayers: BoardPlayer[] = [
  player("u1", "Jassim Ahmed", 1, { role: "keeper", position: null }),
  player("u2", "Nematulla Said", 1, { goals: 4, levelBand: "B2" }),
  player("u3", "Mohamed Jaber", 1, { goals: 2 }),
  player("u4", "Hassan Ibrahim", 2, { role: "keeper", position: null }),
  player(VIEWER, "Elin Larsson", 2, { goals: 3, isViewer: true }),
  player("u6", "Ali Hussain", 2, { position: "fwd", goals: 4 }),
  player("u7", "Karim Saleh", null),
];

describe("playedFootballModel", () => {
  const model = playedFootballModel(
    {
      windowStart: new Date("2026-11-02T16:00:00.000Z"),
      windowEnd: new Date("2026-11-02T17:30:00.000Z"),
      venue: { name: "Fantasy FC", city: "Arad" },
      courtName: "Pitch 2",
      players: footballPlayers,
      bibs: { slot1: "black", slot2: "white" },
      score: { slot1: 6, slot2: 7 },
      confirmed: { slot1: true, slot2: true },
      enteredByName: "Nematulla Said",
      teamsMethod: "manual",
      sideSize: 6,
      groupName: null,
      rated: false,
      ratingImpact: null,
    },
    "en",
  );

  it("scores both teams and names the winner", () => {
    assert.equal(model.dateLine, "Played, Mon 2 Nov");
    assert.equal(model.tag, "6-A-SIDE");
    assert.deepEqual(
      model.board.map((side) => [side.name, side.score, side.won]),
      [
        ["Black", 6, false],
        ["White", 7, true],
      ],
    );
    assert.equal(model.result.line, "White win by 1");
    assert.equal(model.whenLine, "7:00 PM, 90 min, Arad");
  });

  it("lists scorers per side with the viewer as You", () => {
    assert.deepEqual(
      model.scorers?.a.map((scorer) => [scorer.name, scorer.count]),
      [
        ["Nematulla S", "×4"],
        ["Mohamed J", "×2"],
      ],
    );
    assert.deepEqual(
      model.scorers?.b.map((scorer) => [scorer.name, scorer.count]),
      [
        ["Ali H", "×4"],
        ["You", "×3"],
      ],
    );
  });

  it("writes your line and the roster columns", () => {
    assert.deepEqual(model.you, {
      line: "You played MID for White",
      ratingLine: "Friendly, does not count for rating",
      tag: "WON",
      won: true,
    });
    const [black, white] = model.columns;
    assert.equal(black.bib, "black");
    assert.equal(black.word, "Lost");
    assert.deepEqual(
      black.players.map((row) => [row.name, row.meta, row.trailing]),
      [
        ["Jassim A", "GK", null],
        ["Nematulla S", "MID", "4 goals"],
        ["Mohamed J", "MID", "2 goals"],
      ],
    );
    assert.equal(white.word, "Won");
    assert.deepEqual(
      model.unplaced.map((row) => row.name),
      ["Karim S"],
    );
  });

  it("states the facts", () => {
    assert.deepEqual(model.facts, [
      { label: "Score", value: "Entered by Nematulla Said" },
      { label: "Confirmed", value: "By both sides" },
      { label: "Teams", value: "Set by organizer" },
      { label: "Bibs", value: "Black and White, organizer brings" },
      { label: "Counts for rating", value: "No" },
    ]);
  });

  it("calls a level score a draw with no scorers", () => {
    const draw = playedFootballModel(
      {
        windowStart: null,
        windowEnd: null,
        venue: null,
        courtName: null,
        players: footballPlayers.map((row) => ({ ...row, goals: 0 })),
        bibs: { slot1: "red", slot2: "sky" },
        score: { slot1: 2, slot2: 2 },
        confirmed: { slot1: true, slot2: false },
        enteredByName: null,
        teamsMethod: "level",
        sideSize: null,
        groupName: null,
        rated: true,
        ratingImpact: { levelChange: 0, newLevelBand: "C1" },
      },
      "en",
    );
    assert.equal(draw.dateLine, "Played");
    assert.equal(draw.tag, null);
    assert.equal(draw.scorers, null);
    assert.equal(draw.result.line, "Draw, both sides level");
    assert.equal(draw.result.hasWinner, false);
    assert.equal(draw.you?.tag, "DRAW");
    assert.equal(draw.you?.ratingLine, "Counts for rating, C+ holds");
    assert.deepEqual(
      draw.columns.map((column) => column.word),
      ["Draw", "Draw"],
    );
    assert.deepEqual(draw.facts[0], {
      label: "Confirmed",
      value: "By the organizer",
    });
  });
});

describe("played lines", () => {
  it("formats the duration and rating lines", () => {
    assert.equal(
      playedDurationLabel(place.windowStart, place.windowEnd, "en"),
      "90 min",
    );
    assert.equal(playedDurationLabel(place.windowStart, null, "en"), null);
    assert.equal(
      playedWhenLine({ ...place, venue: null }, "en"),
      "8:00 PM, 90 min",
    );
    assert.equal(
      playedRatingLine(true, { levelChange: -0.3, newLevelBand: "C2" }, "en"),
      "Counts for rating, C moves down",
    );
  });
});

describe("gameIsPlayed", () => {
  const now = new Date("2026-11-03T12:00:00.000Z");

  it("is played once the window has ended or a Match is completed", () => {
    assert.equal(
      gameIsPlayed({ windowEnd: new Date("2026-11-03T11:00:00.000Z") }, now),
      true,
    );
    assert.equal(
      gameIsPlayed({ windowEnd: new Date("2026-11-03T13:00:00.000Z") }, now),
      false,
    );
    assert.equal(
      gameIsPlayed(
        { windowEnd: null, matches: [{ status: "completed" }] },
        now,
      ),
      true,
    );
    assert.equal(gameIsPlayed({ windowEnd: null }, now), false);
  });
});
