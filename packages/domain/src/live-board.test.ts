import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  boardClockRound,
  boardMinutesPlayed,
  boardPage,
  boardRoundClock,
  boardScoreLead,
  boardTableRound,
  changeBoardRotation,
  changeRoundClock,
  isSocialBoardFinished,
  liveBoardOnShow,
  boardSideLabel,
  formatBoardClock,
  formatBoardCode,
  formatBoardMatchTime,
  liveBoardKind,
  boardScreenOnShow,
  scoreboardPhase,
  normalizeBoardMessage,
  padelScoreboardSets,
  padelScoreboardSetsWon,
  parseBoardCode,
  ROUND_CLOCK_ON_SCHEDULE,
  socialBoardView,
  type LiveBoardMatch,
  type LiveBoardRound,
  type LiveBoardRoundClock,
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

describe("boardScreenOnShow", () => {
  const started = new Date("2026-11-09T09:00:00Z");
  const rotation = {
    rotate: true,
    rotateSeconds: 10,
    heldScreen: "table" as const,
    rotationStartedAt: started,
  };
  const at = (seconds: number) => new Date(started.getTime() + seconds * 1000);

  it("opens on On court and moves on every ten seconds", () => {
    assert.deepEqual(boardScreenOnShow(rotation, at(4)), {
      screen: "on_court",
      next: "table",
      secondsToNext: 6,
      turn: 0,
    });
    assert.equal(boardScreenOnShow(rotation, at(10)).screen, "table");
    assert.equal(boardScreenOnShow(rotation, at(29)).screen, "next_up");
    assert.equal(boardScreenOnShow(rotation, at(29)).next, "on_court");
  });

  it("turns the page of a long list once per full rotation", () => {
    assert.equal(boardScreenOnShow(rotation, at(29)).turn, 0);
    assert.equal(boardScreenOnShow(rotation, at(30)).turn, 1);
    assert.equal(boardScreenOnShow(rotation, at(30)).screen, "on_court");
  });

  it("holds one screen while rotation is off, still turning pages", () => {
    const held = { ...rotation, rotate: false };
    assert.deepEqual(boardScreenOnShow(held, at(25)), {
      screen: "table",
      next: null,
      secondsToNext: null,
      turn: 2,
    });
  });

  it("rotates through only the screens with something to show", () => {
    const twoScreens = ["on_court", "table"] as const;
    assert.equal(
      boardScreenOnShow(rotation, at(20), twoScreens).screen,
      "on_court",
    );
    assert.equal(boardScreenOnShow(rotation, at(20), twoScreens).next, "table");
    assert.equal(boardScreenOnShow(rotation, at(20), twoScreens).turn, 1);
  });

  it("gives way to On court when the held screen has nothing to show", () => {
    const held = { ...rotation, rotate: false, heldScreen: "next_up" as const };
    assert.equal(
      boardScreenOnShow(held, at(5), ["on_court", "table"]).screen,
      "on_court",
    );
  });

  it("starts from the first screen when a TV's clock runs behind", () => {
    assert.equal(boardScreenOnShow(rotation, at(-5)).screen, "on_court");
  });
});

describe("changeBoardRotation", () => {
  const started = new Date("2026-11-09T09:00:00Z");
  const rotation = {
    rotate: true,
    rotateSeconds: 10,
    heldScreen: "on_court" as const,
    rotationStartedAt: started,
  };
  const now = new Date(started.getTime() + 14_000);

  it("leaves the rotation alone for a change of look", () => {
    assert.equal(changeBoardRotation(rotation, {}, now), null);
  });

  it("holds the board on a screen shown from the control", () => {
    assert.deepEqual(
      changeBoardRotation(rotation, { heldScreen: "next_up" }, now),
      {
        rotate: false,
        rotateSeconds: 10,
        heldScreen: "next_up",
        rotationStartedAt: now,
      },
    );
  });

  it("holds the screen on show when rotation is switched off", () => {
    assert.equal(
      changeBoardRotation(rotation, { rotate: false }, now)?.heldScreen,
      "table",
    );
  });

  it("starts again from On court when the pace changes", () => {
    assert.deepEqual(
      changeBoardRotation(rotation, { rotateSeconds: 20 }, now),
      {
        ...rotation,
        rotateSeconds: 20,
        rotationStartedAt: now,
      },
    );
  });
});

describe("liveBoardOnShow", () => {
  const rotation = {
    rotate: true,
    rotateSeconds: 10,
    heldScreen: "on_court" as const,
    rotationStartedAt: new Date("2026-11-09T09:00:00Z"),
  };
  const now = new Date("2026-11-09T09:00:25Z");

  it("says a one-Match board shows its scoreboard", () => {
    assert.deepEqual(liveBoardOnShow("football", null, rotation, now), {
      kind: "scoreboard",
    });
  });

  it("says a Social is waiting, or stopped on its final table, whatever the rotation", () => {
    assert.deepEqual(
      liveBoardOnShow(
        "social",
        { phase: "waiting", screens: [] },
        rotation,
        now,
      ),
      { kind: "waiting" },
    );
    assert.deepEqual(
      liveBoardOnShow("social", { phase: "final", screens: [] }, rotation, now),
      { kind: "final" },
    );
  });

  it("follows the rotation through the screens the TVs show", () => {
    assert.deepEqual(
      liveBoardOnShow(
        "social",
        { phase: "live", screens: ["on_court", "table"] },
        rotation,
        now,
      ),
      {
        kind: "screen",
        screen: "on_court",
        next: "table",
        secondsToNext: 5,
        turn: 1,
      },
    );
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
    assert.deepEqual(view.screens, ["on_court", "table", "next_up"]);
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
    assert.deepEqual(view.screens, ["on_court", "table", "next_up"]);
  });

  it("drops Next up from the rotation while no next Round is posted", () => {
    const view = socialBoardView(
      social([round(1, "on_court", 0), round(2, "not_made", 30, 0)]),
      START,
    );
    assert.deepEqual(view.screens, ["on_court", "table"]);
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

describe("the Round clock run by the Organizer", () => {
  const after = (minutes: number) =>
    new Date(START.getTime() + minutes * 60_000);
  const onCourt = boardClockRound(round(1, "on_court", 0), 30);
  const notYet = boardClockRound(round(1, "scheduled", 10), 30);

  function tap(
    clock: LiveBoardRoundClock,
    action: Parameters<typeof changeRoundClock>[1],
    at: Date,
    clockRound = onCourt,
  ) {
    const next = changeRoundClock(clock, action, clockRound, at);
    assert.ok(next, `${action} changed nothing`);
    return next;
  }

  it("follows the schedule until the Organizer takes it", () => {
    assert.deepEqual(
      boardRoundClock(ROUND_CLOCK_ON_SCHEDULE, onCourt, after(12)),
      { kind: "left", seconds: 18 * 60 },
    );
    assert.deepEqual(
      boardRoundClock(ROUND_CLOCK_ON_SCHEDULE, notYet, after(4)),
      { kind: "starts", seconds: 6 * 60 },
    );
  });

  it("starts a Round from its full length when the Organizer says, whatever its posted time", () => {
    const late = tap(ROUND_CLOCK_ON_SCHEDULE, "start", after(7));
    assert.equal(late.byHand, true);
    assert.deepEqual(boardRoundClock(late, onCourt, after(7)), {
      kind: "left",
      seconds: 30 * 60,
    });
    assert.deepEqual(boardRoundClock(late, onCourt, after(17)), {
      kind: "left",
      seconds: 20 * 60,
    });

    const early = tap(ROUND_CLOCK_ON_SCHEDULE, "start", after(2), notYet);
    assert.deepEqual(boardRoundClock(early, notYet, after(3)), {
      kind: "left",
      seconds: 29 * 60,
    });
  });

  it("holds the time left while paused and carries on from it when resumed", () => {
    const started = tap(ROUND_CLOCK_ON_SCHEDULE, "start", after(0));
    const paused = tap(started, "pause", after(10));
    assert.deepEqual(boardRoundClock(paused, onCourt, after(25)), {
      kind: "paused",
      seconds: 20 * 60,
    });
    const resumed = tap(paused, "resume", after(25));
    assert.deepEqual(boardRoundClock(resumed, onCourt, after(30)), {
      kind: "left",
      seconds: 15 * 60,
    });
    assert.deepEqual(resumed.startedAt, after(0));
  });

  it("keeps the schedule's count when the clock is paused or taken mid-Round", () => {
    const paused = tap(ROUND_CLOCK_ON_SCHEDULE, "pause", after(12));
    assert.deepEqual(boardRoundClock(paused, onCourt, after(20)), {
      kind: "paused",
      seconds: 18 * 60,
    });
    const taken = tap(ROUND_CLOCK_ON_SCHEDULE, "by_hand", after(12));
    assert.deepEqual(boardRoundClock(taken, onCourt, after(12)), {
      kind: "left",
      seconds: 18 * 60,
    });
  });

  it("waits for Start once taken before the Round's posted time", () => {
    const taken = tap(ROUND_CLOCK_ON_SCHEDULE, "by_hand", after(4), notYet);
    assert.deepEqual(boardRoundClock(taken, notYet, after(15)), {
      kind: "ready",
      seconds: 30 * 60,
    });
  });

  it("makes the next Round wait for Start", () => {
    const started = tap(ROUND_CLOCK_ON_SCHEDULE, "start", after(0));
    const second = boardClockRound(round(2, "on_court", 30), 30);
    assert.deepEqual(boardRoundClock(started, second, after(40)), {
      kind: "ready",
      seconds: 30 * 60,
    });
  });

  it("starts again from the full length", () => {
    const started = tap(ROUND_CLOCK_ON_SCHEDULE, "start", after(0));
    const again = tap(tap(started, "pause", after(10)), "start", after(12));
    assert.deepEqual(boardRoundClock(again, onCourt, after(12)), {
      kind: "left",
      seconds: 30 * 60,
    });
  });

  it("goes back to the schedule when handed back", () => {
    const started = tap(ROUND_CLOCK_ON_SCHEDULE, "start", after(7));
    assert.deepEqual(
      changeRoundClock(started, "schedule", onCourt, after(9)),
      ROUND_CLOCK_ON_SCHEDULE,
    );
  });

  it("changes nothing for a tap that has nothing to do", () => {
    const started = tap(ROUND_CLOCK_ON_SCHEDULE, "start", after(0));
    const paused = tap(started, "pause", after(5));
    assert.equal(changeRoundClock(started, "resume", onCourt, after(1)), null);
    assert.equal(changeRoundClock(paused, "pause", onCourt, after(6)), null);
    assert.equal(changeRoundClock(started, "by_hand", onCourt, after(1)), null);
    assert.equal(
      changeRoundClock(ROUND_CLOCK_ON_SCHEDULE, "schedule", onCourt, after(1)),
      null,
    );
    assert.equal(
      changeRoundClock(ROUND_CLOCK_ON_SCHEDULE, "pause", notYet, after(1)),
      null,
    );
  });

  it("shows a Round as waiting until it is started, then on court from that moment", () => {
    const content = social([
      round(1, "on_court", 0),
      round(2, "scheduled", 30),
    ]);
    const taken = tap(ROUND_CLOCK_ON_SCHEDULE, "by_hand", after(-5), notYet);
    const waiting = socialBoardView(content, after(8), taken);
    assert.equal(waiting.current?.state, "scheduled");
    assert.equal(waiting.current?.startTime, null);
    assert.deepEqual(
      waiting.current?.matches.map((match) => [match.state, match.startTime]),
      [["scheduled", null]],
    );
    assert.deepEqual(waiting.clock, { kind: "ready", seconds: 30 * 60 });

    const started = tap(taken, "start", after(8));
    const live = socialBoardView(content, after(9), started);
    assert.equal(live.current?.state, "on_court");
    assert.deepEqual(live.current?.startTime, after(8));
    assert.deepEqual(live.clock, { kind: "left", seconds: 29 * 60 });
  });

  it("shows a Round started ahead of its posted time as on court", () => {
    const content = social([round(1, "scheduled", 10)]);
    const started = tap(ROUND_CLOCK_ON_SCHEDULE, "start", after(2), notYet);
    const view = socialBoardView(content, after(3), started);
    assert.equal(view.current?.state, "on_court");
    assert.deepEqual(
      view.current?.matches.map((match) => match.state),
      ["on_court"],
    );
  });

  it("shows a Round with a score saved as on court, without a clock, when nobody started it", () => {
    const scored = round(2, "on_court", 30);
    scored.matches[0]!.state = "awaiting_confirmation";
    const started = tap(ROUND_CLOCK_ON_SCHEDULE, "start", after(0));
    const view = socialBoardView(
      social([round(1, "played", 0), scored]),
      after(40),
      started,
    );
    assert.equal(view.current?.state, "on_court");
    assert.equal(view.clock, null);
  });

  it("has no clock once the Social is over", () => {
    const started = tap(ROUND_CLOCK_ON_SCHEDULE, "start", after(0));
    const view = socialBoardView(
      { ...social([round(1, "played", 0)]), finished: true },
      after(40),
      started,
    );
    assert.equal(view.clock, null);
  });
});

describe("boardTableRound", () => {
  it("counts the unbroken run of settled Rounds from Round 1", () => {
    assert.equal(
      boardTableRound([
        round(1, "played", 0),
        round(2, "cancelled", 30),
        round(3, "played", 60),
        round(4, "on_court", 90),
      ]),
      3,
    );
  });

  it("stops at a Round that is still open, whatever is settled after it", () => {
    assert.equal(
      boardTableRound([
        round(1, "played", 0),
        round(2, "on_court", 30),
        round(3, "played", 60),
      ]),
      1,
    );
  });
});

describe("isSocialBoardFinished", () => {
  it("is over once every Round is settled, a Match that did not finish included", () => {
    assert.equal(
      isSocialBoardFinished([round(1, "played", 0), round(2, "played", 30)]),
      true,
    );
  });

  it("is not over with a Round not made or nothing played", () => {
    assert.equal(
      isSocialBoardFinished([
        round(1, "played", 0),
        round(2, "not_made", 30, 0),
      ]),
      false,
    );
    assert.equal(isSocialBoardFinished([round(1, "cancelled", 0)]), false);
    assert.equal(isSocialBoardFinished([]), false);
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

describe("padelScoreboardSets", () => {
  it("marks a Set won, a Set lost and the Set in play", () => {
    const sets = padelScoreboardSets(
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
    assert.deepEqual(padelScoreboardSetsWon(sets), { side1: 1, side2: 1 });
  });

  it("counts the last Set once the Match is completed", () => {
    const sets = padelScoreboardSets(
      [
        { score1: 6, score2: 4 },
        { score1: 4, score2: 3 },
      ],
      true,
    );
    assert.deepEqual(padelScoreboardSetsWon(sets), { side1: 2, side2: 0 });
  });

  it("counts a last Set that is already won, and a tie-break Set", () => {
    assert.equal(
      padelScoreboardSets([{ score1: 6, score2: 2 }], false)[0]?.state,
      "side1",
    );
    assert.equal(
      padelScoreboardSets([{ score1: 6, score2: 7 }], false)[0]?.state,
      "side2",
    );
    assert.equal(
      padelScoreboardSets([{ score1: 6, score2: 5 }], false)[0]?.state,
      "in_play",
    );
  });

  it("reads an empty Set as in play", () => {
    assert.equal(
      padelScoreboardSets([{ score1: null, score2: null }], false)[0]?.state,
      "in_play",
    );
  });
});

describe("scoreboardPhase", () => {
  const args = {
    windowStart: "2026-11-09T09:00:00Z",
    completed: false,
    ready: true,
    now: new Date("2026-11-09T09:10:00Z"),
  };

  it("waits before the start and until the sides are ready", () => {
    assert.equal(
      scoreboardPhase({ ...args, now: new Date("2026-11-09T08:59:00Z") }),
      "waiting",
    );
    assert.equal(scoreboardPhase({ ...args, ready: false }), "waiting");
  });

  it("is live from the start and final once completed", () => {
    assert.equal(scoreboardPhase(args), "live");
    assert.equal(scoreboardPhase({ ...args, completed: true }), "final");
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
