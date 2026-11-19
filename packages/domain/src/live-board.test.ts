import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  boardMinutesPlayed,
  boardPage,
  boardScoreLead,
  boardSideLabel,
  formatBoardClock,
  formatBoardCode,
  formatBoardMatchTime,
  isLiveBoardOpen,
  liveBoardKind,
  liveBoardScene,
  matchBoardPhase,
  normalizeBoardMessage,
  padelBoardSets,
  padelBoardSetsWon,
  parseBoardCode,
  socialBoardView,
  type LiveBoardMatch,
  type LiveBoardRound,
  type SocialBoardContent,
} from "./live-board";

describe("liveBoardKind", () => {
  it("gives a Social with Rounds and a table the three screens", () => {
    assert.equal(
      liveBoardKind({
        format: "friendly_tournament",
        poolCount: 1,
        tournamentShape: "rounds",
      }),
      "social",
    );
    assert.equal(
      liveBoardKind({
        format: "friendly_tournament",
        poolCount: 3,
        tournamentShape: "groups_only",
      }),
      "social",
    );
    assert.equal(
      liveBoardKind({
        format: "friendly_tournament",
        poolCount: null,
        tournamentShape: "americano",
      }),
      "social",
    );
  });

  it("gives a Friendly game and a football Game one scoreboard", () => {
    assert.equal(
      liveBoardKind({ format: "friendly_game", sport: "padel" }),
      "padel_match",
    );
    assert.equal(
      liveBoardKind({ format: "friendly_game", sport: "football" }),
      "football",
    );
  });

  it("has no board for a Knockout or King of the court", () => {
    for (const tournamentShape of [
      "knockout_only",
      "groups_then_knockout",
      "king_of_the_court",
    ]) {
      assert.equal(
        liveBoardKind({
          format: "friendly_tournament",
          poolCount: tournamentShape === "groups_then_knockout" ? 2 : null,
          tournamentShape,
        }),
        null,
      );
    }
    assert.equal(liveBoardKind({ format: "americano" }), null);
  });
});

describe("isLiveBoardOpen", () => {
  const board = {
    stoppedAt: null,
    gameCancelledAt: null,
    windowEnd: "2026-11-09T11:30:00Z",
  };

  it("stays open for six hours after the window, so the final table stays up", () => {
    assert.equal(
      isLiveBoardOpen(board, new Date("2026-11-09T17:29:00Z")),
      true,
    );
    assert.equal(
      isLiveBoardOpen(board, new Date("2026-11-09T17:30:00Z")),
      false,
    );
  });

  it("is closed once stopped or once the Game is cancelled", () => {
    const now = new Date("2026-11-09T10:00:00Z");
    assert.equal(isLiveBoardOpen({ ...board, stoppedAt: now }, now), false);
    assert.equal(
      isLiveBoardOpen({ ...board, gameCancelledAt: now }, now),
      false,
    );
  });
});

describe("board code", () => {
  it("is shown in two groups of three", () => {
    assert.equal(formatBoardCode("482913"), "482 913");
  });

  it("is read however it was typed", () => {
    assert.equal(parseBoardCode(" 482 913 "), "482913");
    assert.equal(parseBoardCode("482-913"), "482913");
    assert.equal(parseBoardCode("٤٨٢٩١٣"), "482913");
  });

  it("refuses anything that is not six digits", () => {
    assert.equal(parseBoardCode("48291"), null);
    assert.equal(parseBoardCode("4829133"), null);
    assert.equal(parseBoardCode("48A913"), null);
  });
});

describe("normalizeBoardMessage", () => {
  it("keeps one line and drops an empty one", () => {
    assert.equal(
      normalizeBoardMessage("  Round 5 starts\nin 2 minutes. "),
      "Round 5 starts in 2 minutes.",
    );
    assert.equal(normalizeBoardMessage("   "), null);
    assert.equal(normalizeBoardMessage("x".repeat(100))?.length, 80);
  });
});

describe("liveBoardScene", () => {
  const started = new Date("2026-11-09T09:00:00Z");
  const rotation = {
    rotate: true,
    rotateSeconds: 10,
    heldScreen: "standings" as const,
    rotationStartedAt: started,
  };
  const at = (seconds: number) => new Date(started.getTime() + seconds * 1000);

  it("opens on On court and moves on every ten seconds", () => {
    assert.deepEqual(liveBoardScene(rotation, at(4)), {
      screen: "on_court",
      next: "standings",
      secondsToNext: 6,
      turn: 0,
    });
    assert.equal(liveBoardScene(rotation, at(10)).screen, "standings");
    assert.equal(liveBoardScene(rotation, at(29)).screen, "next_up");
    assert.equal(liveBoardScene(rotation, at(29)).next, "on_court");
  });

  it("turns the page of a long list once per full rotation", () => {
    assert.equal(liveBoardScene(rotation, at(29)).turn, 0);
    assert.equal(liveBoardScene(rotation, at(30)).turn, 1);
    assert.equal(liveBoardScene(rotation, at(30)).screen, "on_court");
  });

  it("holds one screen while rotation is off, still turning pages", () => {
    const held = { ...rotation, rotate: false };
    assert.deepEqual(liveBoardScene(held, at(25)), {
      screen: "standings",
      next: null,
      secondsToNext: null,
      turn: 2,
    });
  });

  it("starts from the first screen when a TV's clock runs behind", () => {
    assert.equal(liveBoardScene(rotation, at(-5)).screen, "on_court");
  });
});

describe("boardPage", () => {
  it("shows everything when it fits", () => {
    assert.deepEqual(boardPage([1, 2, 3], 4, 7), {
      items: [1, 2, 3],
      page: 0,
      pages: 1,
    });
  });

  it("walks the pages and comes back round", () => {
    const items = [1, 2, 3, 4, 5];
    assert.deepEqual(boardPage(items, 2, 1).items, [3, 4]);
    assert.deepEqual(boardPage(items, 2, 2).items, [5]);
    assert.deepEqual(boardPage(items, 2, 3).items, [1, 2]);
  });
});

describe("boardSideLabel", () => {
  it("joins first names", () => {
    assert.equal(
      boardSideLabel(["Layla Al Khalifa", "Nora Buhazza"], " & "),
      "Layla & Nora",
    );
    assert.equal(boardSideLabel(["Qasim"], " & "), "Qasim");
  });
});

const START = new Date("2026-11-09T09:00:00Z");

function match(overrides: Partial<LiveBoardMatch> = {}): LiveBoardMatch {
  return {
    id: "m",
    courtName: "Court 1",
    startTime: START,
    state: "on_court",
    side1: { id: "a", players: ["Layla A", "Nora B"] },
    side2: { id: "b", players: ["Sara C", "Mariam D"] },
    score1: null,
    score2: null,
    ...overrides,
  };
}

function round(
  roundNumber: number,
  state: LiveBoardRound["state"],
  minutesAfterStart: number,
  matches = 1,
): LiveBoardRound {
  const startTime = new Date(START.getTime() + minutesAfterStart * 60_000);
  return {
    roundNumber,
    state,
    startTime,
    matches: Array.from({ length: matches }, (_, index) =>
      match({ id: `r${roundNumber}m${index}`, startTime }),
    ),
  };
}

function social(rounds: LiveBoardRound[]): SocialBoardContent {
  return {
    kind: "social",
    ranks: "teams",
    roundCount: rounds.length,
    matchMinutes: 30,
    rounds,
    tables: [],
    finished: false,
    finishedAt: null,
  };
}

describe("socialBoardView", () => {
  it("waits while no Round is posted", () => {
    const view = socialBoardView(
      social([round(1, "not_made", 0, 0), round(2, "not_made", 30, 0)]),
      START,
    );
    assert.equal(view.phase, "waiting");
    assert.equal(view.current, null);
    assert.equal(view.clock, null);
  });

  it("shows the Round on court, the next two and the Round the table is after", () => {
    const view = socialBoardView(
      social([
        round(1, "played", 0),
        round(2, "played", 30),
        round(3, "on_court", 60),
        round(4, "scheduled", 90),
        round(5, "not_made", 120, 0),
      ]),
      new Date(START.getTime() + 72 * 60_000),
    );
    assert.equal(view.phase, "live");
    assert.equal(view.current?.roundNumber, 3);
    assert.equal(view.next?.roundNumber, 4);
    assert.equal(view.then?.roundNumber, 5);
    assert.equal(view.tableAfterRound, 2);
    assert.deepEqual(view.clock, { kind: "left", seconds: 18 * 60 });
  });

  it("counts down to the first Round before it starts", () => {
    const view = socialBoardView(
      social([round(1, "scheduled", 0), round(2, "scheduled", 30)]),
      new Date(START.getTime() - 5 * 60_000),
    );
    assert.equal(view.current?.roundNumber, 1);
    assert.deepEqual(view.clock, { kind: "starts", seconds: 300 });
  });

  it("runs the clock to the end of a Round played over two slots", () => {
    const twoSlots = round(1, "on_court", 0, 2);
    twoSlots.matches[1]!.startTime = new Date(START.getTime() + 30 * 60_000);
    const view = socialBoardView(social([twoSlots]), START);
    assert.deepEqual(view.clock, { kind: "left", seconds: 60 * 60 });
  });

  it("skips a cancelled Round when naming the next one", () => {
    const view = socialBoardView(
      social([
        round(1, "on_court", 0),
        round(2, "cancelled", 30),
        round(3, "scheduled", 60),
      ]),
      START,
    );
    assert.equal(view.next?.roundNumber, 3);
    assert.equal(view.then, null);
  });

  it("stops the clock at zero when a Round runs over", () => {
    const view = socialBoardView(
      social([round(1, "on_court", 0)]),
      new Date(START.getTime() + 45 * 60_000),
    );
    assert.deepEqual(view.clock, { kind: "left", seconds: 0 });
  });

  it("is final once the Social has finished", () => {
    const view = socialBoardView(
      {
        ...social([round(1, "played", 0), round(2, "played", 30)]),
        finished: true,
      },
      new Date(START.getTime() + 90 * 60_000),
    );
    assert.equal(view.phase, "final");
    assert.equal(view.tableAfterRound, 2);
    assert.equal(view.clock, null);
  });
});

describe("formatBoardClock", () => {
  it("reads minutes and seconds, then hours", () => {
    assert.equal(formatBoardClock(698), "11:38");
    assert.equal(formatBoardClock(5), "0:05");
    assert.equal(formatBoardClock(3900), "1:05:00");
    assert.equal(formatBoardClock(-3), "0:00");
  });
});

describe("boardScoreLead", () => {
  it("names the side ahead", () => {
    assert.equal(boardScoreLead(4, 3), "side1");
    assert.equal(boardScoreLead(2, 5), "side2");
    assert.equal(boardScoreLead(3, 3), "level");
    assert.equal(boardScoreLead(null, null), "none");
  });
});

describe("padelBoardSets", () => {
  it("marks a Set won, a Set lost and the Set in play", () => {
    const sets = padelBoardSets(
      [
        { score1: 6, score2: 4 },
        { score1: 3, score2: 6 },
        { score1: 4, score2: 3 },
      ],
      false,
    );
    assert.deepEqual(
      sets.map((set) => set.state),
      ["side1", "side2", "in_play"],
    );
    assert.deepEqual(padelBoardSetsWon(sets), { side1: 1, side2: 1 });
  });

  it("counts the last Set once the Match is completed", () => {
    const sets = padelBoardSets(
      [
        { score1: 6, score2: 4 },
        { score1: 4, score2: 3 },
      ],
      true,
    );
    assert.deepEqual(padelBoardSetsWon(sets), { side1: 2, side2: 0 });
  });

  it("counts a last Set that is already won, and a tie-break Set", () => {
    assert.equal(
      padelBoardSets([{ score1: 6, score2: 2 }], false)[0]?.state,
      "side1",
    );
    assert.equal(
      padelBoardSets([{ score1: 6, score2: 7 }], false)[0]?.state,
      "side2",
    );
    assert.equal(
      padelBoardSets([{ score1: 6, score2: 5 }], false)[0]?.state,
      "in_play",
    );
  });

  it("reads an empty Set as in play", () => {
    assert.equal(
      padelBoardSets([{ score1: null, score2: null }], false)[0]?.state,
      "in_play",
    );
  });
});

describe("matchBoardPhase", () => {
  const args = {
    windowStart: "2026-11-09T09:00:00Z",
    completed: false,
    ready: true,
    now: new Date("2026-11-09T09:10:00Z"),
  };

  it("waits before the start and until the sides are ready", () => {
    assert.equal(
      matchBoardPhase({ ...args, now: new Date("2026-11-09T08:59:00Z") }),
      "waiting",
    );
    assert.equal(matchBoardPhase({ ...args, ready: false }), "waiting");
  });

  it("is live from the start and final once completed", () => {
    assert.equal(matchBoardPhase(args), "live");
    assert.equal(matchBoardPhase({ ...args, completed: true }), "final");
  });
});

describe("match time", () => {
  it("counts whole minutes and stops at the window's end", () => {
    const start = "2026-11-09T09:00:00Z";
    const end = "2026-11-09T10:00:00Z";
    assert.equal(
      boardMinutesPlayed(start, end, new Date("2026-11-09T09:34:50Z")),
      34,
    );
    assert.equal(
      boardMinutesPlayed(start, end, new Date("2026-11-09T11:00:00Z")),
      60,
    );
    assert.equal(
      boardMinutesPlayed(start, end, new Date("2026-11-09T08:00:00Z")),
      0,
    );
  });

  it("reads as hours and minutes", () => {
    assert.equal(formatBoardMatchTime(72), "1:12");
    assert.equal(formatBoardMatchTime(5), "0:05");
  });
});
