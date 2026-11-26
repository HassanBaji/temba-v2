import { describe, expect, it } from "vitest";

import {
  cardCounts,
  changeMinute,
  changePlayer,
  changeRedCardReason,
  chronological,
  keepLinesOnSides,
  logGoal,
  logFacts,
  logLineName,
  logLineSpoken,
  logLineSub,
  logOwnGoal,
  logPayload,
  logRedCard,
  logScore,
  logScoreLabel,
  logScorers,
  logUnknownGoal,
  logWarning,
  matchLogProblem,
  matchMinute,
  newestFirst,
  playerChipSpoken,
  playerTally,
  removedLabel,
  removeLatestGoal,
  removeLine,
  runningScores,
  sameLog,
  seedLogFromScore,
  timelineLineSpoken,
  MATCH_LOG_LINES_MAX,
  type MatchLogLine,
} from "./football-match-log";

const kickoff = new Date("2026-11-20T17:00:00Z");
const at = (minutes: number) => new Date(kickoff.getTime() + minutes * 60_000);
const stamp = (id: string, minutes: number) => ({
  id,
  at: at(minutes),
  kickoff,
});

const ali = { userId: "ali", sideIndex: 1 as const };
const you = { userId: "you", sideIndex: 1 as const };
const omar = { userId: "omar", sideIndex: 2 as const };
const bader = { userId: "bader", sideIndex: 2 as const };
const names = { slot1: "Black", slot2: "White" };

describe("matchMinute", () => {
  it("counts the first 60 seconds as the 1st minute", () => {
    expect(matchMinute({ kickoff }, kickoff)).toBe(1);
    expect(matchMinute({ kickoff }, new Date(kickoff.getTime() + 30_000))).toBe(
      1,
    );
    expect(matchMinute({ kickoff }, at(6))).toBe(6);
    expect(matchMinute({ kickoff }, new Date(at(5).getTime() + 30_000))).toBe(
      6,
    );
  });

  it("starts at 1 before kick-off or without one", () => {
    expect(matchMinute({ kickoff }, at(-10))).toBe(1);
    expect(matchMinute({ kickoff: null }, at(40))).toBe(1);
  });

  it("gives a line logged after the final whistle the last minute", () => {
    expect(matchMinute({ kickoff, end: at(60) }, at(60 * 24))).toBe(60);
    expect(matchMinute({ kickoff, end: at(60) }, at(12))).toBe(12);
  });
});

describe("logging lines", () => {
  it("adds goals for the scorer's side and keeps the time", () => {
    const lines = logGoal([], ali, stamp("a", 6));
    expect(lines).toEqual([
      {
        id: "a",
        kind: "goal",
        side: 1,
        userId: "ali",
        minute: 6,
        loggedAt: at(6),
        reason: null,
      },
    ]);
    expect(logScore(lines)).toEqual({ slot1: 1, slot2: 0 });
  });

  it("counts an own goal for the other side and not for the player", () => {
    const lines = logOwnGoal([], omar, stamp("og", 24));
    expect(lines[0]).toMatchObject({ kind: "own_goal", side: 1 });
    expect(logScore(lines)).toEqual({ slot1: 1, slot2: 0 });
    expect(logScorers(lines)).toEqual([]);
    expect(playerTally(lines, "omar").goals).toBe(0);
  });

  it("adds a goal nobody saw the scorer of", () => {
    const lines = logUnknownGoal([], 2, stamp("u", 31));
    expect(lines[0]).toMatchObject({ kind: "goal", side: 2, userId: null });
    expect(logScore(lines)).toEqual({ slot1: 0, slot2: 1 });
  });

  it("gives a red card on its own at a second warning", () => {
    let lines = logWarning([], bader, stamp("w1", 11));
    expect(playerTally(lines, "bader")).toEqual({
      goals: 0,
      warnings: 1,
      sentOff: false,
    });
    lines = logWarning(lines, bader, stamp("w2", 38));
    expect(lines.map((line) => [line.id, line.kind, line.reason])).toEqual([
      ["w1", "warning", null],
      ["w2", "warning", null],
      ["w2-red", "red_card", "second_warning"],
    ]);
    expect(playerTally(lines, "bader").sentOff).toBe(true);
  });

  it("gives no more cards to a player already sent off", () => {
    const lines = logRedCard([], bader, "serious_foul", stamp("r", 30));
    expect(logWarning(lines, bader, stamp("w", 31))).toHaveLength(1);
    expect(logRedCard(lines, bader, null, stamp("r2", 32))).toHaveLength(1);
  });

  it("still lets a sent-off player be given a goal", () => {
    const lines = logRedCard([], bader, null, stamp("r", 30));
    expect(logGoal(lines, bader, stamp("g", 31))).toHaveLength(2);
  });

  it("ignores a player on no side", () => {
    const benched = { userId: "x", sideIndex: null };
    expect(logGoal([], benched, stamp("a", 1))).toEqual([]);
    expect(logWarning([], benched, stamp("a", 1))).toEqual([]);
  });
});

describe("removing and restoring lines", () => {
  const game = (): MatchLogLine[] => {
    let lines = logGoal([], ali, stamp("g1", 6));
    lines = logWarning(lines, bader, stamp("w1", 11));
    lines = logGoal(lines, omar, stamp("g2", 19));
    lines = logWarning(lines, bader, stamp("w2", 38));
    return lines;
  };

  it("takes out one line and the score follows", () => {
    const { lines, removed } = removeLine(game(), "g2");
    expect(removed.map((line) => line.id)).toEqual(["g2"]);
    expect(logScore(lines)).toEqual({ slot1: 1, slot2: 0 });
  });

  it("takes the second-warning red card out with its warning", () => {
    const { lines, removed } = removeLine(game(), "w1");
    expect(removed.map((line) => line.id)).toEqual(["w1", "w2-red"]);
    expect(playerTally(lines, "bader")).toMatchObject({
      warnings: 1,
      sentOff: false,
    });
  });

  it("keeps a red card given for another reason", () => {
    let lines = logWarning([], bader, stamp("w1", 11));
    lines = logRedCard(lines, bader, "dissent", stamp("r", 20));
    expect(removeLine(lines, "w1").removed).toHaveLength(1);
  });

  it("takes a player's latest warning out with the red card two warnings gave", () => {
    const { lines, removed } = removeLine(game(), "w2-red");
    expect(removed.map((line) => line.id)).toEqual(["w2-red", "w2"]);
    expect(playerTally(lines, "bader")).toMatchObject({
      warnings: 1,
      sentOff: false,
    });
  });

  it("takes out a straight red card alone", () => {
    let lines = logWarning([], bader, stamp("w1", 11));
    lines = logRedCard(lines, bader, "dissent", stamp("r", 20));
    expect(removeLine(lines, "r").removed.map((line) => line.id)).toEqual([
      "r",
    ]);
  });

  it("does nothing for a line that is not there", () => {
    expect(removeLine(game(), "nope").removed).toEqual([]);
  });

  it("takes out the side's latest goal with minus, own goals included", () => {
    let lines = logGoal([], ali, stamp("g1", 6));
    lines = logOwnGoal(lines, omar, stamp("og", 24));
    const result = removeLatestGoal(lines, 1);
    expect(result.removed.map((line) => line.id)).toEqual(["og"]);
    expect(removeLatestGoal(lines, 2).removed).toEqual([]);
  });
});

describe("changing a line", () => {
  it("names a scorer later, keeping time and place", () => {
    const lines = logUnknownGoal([], 2, stamp("u", 31));
    const named = changePlayer(lines, "u", omar);
    expect(named[0]).toMatchObject({
      kind: "goal",
      userId: "omar",
      side: 2,
      minute: 31,
      loggedAt: at(31),
    });
  });

  it("turns a goal into an own goal when the player is on the other side", () => {
    const lines = logUnknownGoal([], 2, stamp("u", 31));
    const changed = changePlayer(lines, "u", ali);
    expect(changed[0]).toMatchObject({ kind: "own_goal", side: 2 });
    expect(logScore(changed)).toEqual({ slot1: 0, slot2: 1 });
    expect(changePlayer(changed, "u", omar)[0]?.kind).toBe("goal");
  });

  it("moves a card to the new player's side", () => {
    const lines = logWarning([], bader, stamp("w", 11));
    expect(changePlayer(lines, "w", ali)[0]).toMatchObject({
      side: 1,
      userId: "ali",
    });
  });

  it("does not move a red card onto a player already sent off", () => {
    let lines = logRedCard([], bader, null, stamp("r1", 10));
    lines = logRedCard(lines, omar, null, stamp("r2", 12));
    expect(changePlayer(lines, "r2", bader)).toEqual(lines);
  });

  it("changes the minute within bounds and re-sorts by it", () => {
    let lines = logGoal([], ali, stamp("a", 6));
    lines = logGoal(lines, you, stamp("b", 40));
    lines = changeMinute(lines, "b", 2);
    expect(newestFirst(lines).map((line) => line.id)).toEqual(["a", "b"]);
    expect(changeMinute(lines, "a", 0)[0]?.minute).toBe(1);
    expect(changeMinute(lines, "a", 5000)[0]?.minute).toBe(999);
  });

  it("changes a red card's reason, and nothing else's", () => {
    let lines = logRedCard([], bader, null, stamp("r", 10));
    lines = logWarning(lines, ali, stamp("w", 11));
    lines = changeRedCardReason(lines, "r", "dissent");
    lines = changeRedCardReason(lines, "w", "dissent");
    expect(lines.map((line) => line.reason)).toEqual(["dissent", null]);
  });
});

describe("what the log adds up to", () => {
  it("runs the score line by line", () => {
    let lines = logGoal([], ali, stamp("a", 6));
    lines = logWarning(lines, bader, stamp("w", 11));
    lines = logGoal(lines, omar, stamp("b", 19));
    lines = logOwnGoal(lines, omar, stamp("c", 24));
    const scores = runningScores(lines);
    expect(scores.get("a")).toEqual({ slot1: 1, slot2: 0 });
    expect(scores.get("b")).toEqual({ slot1: 1, slot2: 1 });
    expect(scores.get("c")).toEqual({ slot1: 2, slot2: 1 });
    expect(scores.has("w")).toBe(false);
  });

  it("counts scorers and cards", () => {
    let lines = logGoal([], ali, stamp("a", 6));
    lines = logGoal(lines, ali, stamp("b", 9));
    lines = logUnknownGoal(lines, 1, stamp("c", 12));
    lines = logWarning(lines, bader, stamp("w1", 20));
    lines = logWarning(lines, bader, stamp("w2", 30));
    expect(logScorers(lines)).toEqual([{ userId: "ali", goals: 2 }]);
    expect(cardCounts(lines)).toEqual({ warnings: 2, redCards: 1 });
  });

  it("seeds a log from a Score saved before the log existed", () => {
    const lines = seedLogFromScore(
      { slot1: 3, slot2: 1 },
      [
        { ...ali, goals: 2 },
        { ...omar, goals: 0 },
      ],
      { at: at(70), kickoff },
    );
    expect(logScore(lines)).toEqual({ slot1: 3, slot2: 1 });
    expect(logScorers(lines)).toEqual([{ userId: "ali", goals: 2 }]);
    expect(seedLogFromScore(null, [], { at: at(1), kickoff })).toEqual([]);
  });

  it("sends the lines oldest first without ids and compares them", () => {
    let lines = logGoal([], ali, stamp("b", 40));
    lines = logGoal(lines, omar, stamp("a", 6));
    const payload = logPayload(lines);
    expect(payload.map((line) => line.userId)).toEqual(["omar", "ali"]);
    expect("id" in payload[0]!).toBe(false);
    expect(sameLog(payload, logPayload(lines))).toBe(true);
    expect(sameLog(payload, logPayload(changeMinute(lines, "b", 41)))).toBe(
      false,
    );
    expect(sameLog(payload, payload.slice(1))).toBe(false);
  });
});

describe("matchLogProblem", () => {
  const sideOf = (userId: string) =>
    (({ ali: 1, you: 1, omar: 2, bader: 2 })[userId] as 1 | 2 | undefined) ??
    null;
  const check = (lines: MatchLogLine[]) =>
    matchLogProblem(logPayload(lines), sideOf, "en");

  it("accepts a whole game", () => {
    let lines = logGoal([], ali, stamp("a", 6));
    lines = logOwnGoal(lines, omar, stamp("b", 24));
    lines = logUnknownGoal(lines, 2, stamp("c", 31));
    lines = logWarning(lines, bader, stamp("w1", 11));
    lines = logWarning(lines, bader, stamp("w2", 38));
    expect(check(lines)).toBeNull();
  });

  it("refuses a player on the wrong side or on no side", () => {
    const goal = logGoal([], ali, stamp("a", 6));
    expect(check([{ ...goal[0]!, side: 2 }])).toBe(
      "A line in the match log is on the wrong team",
    );
    expect(check([{ ...goal[0]!, userId: "stranger" }])).toBe(
      "A player in the match log is not on the teams",
    );
    const own = logOwnGoal([], omar, stamp("b", 6));
    expect(check([{ ...own[0]!, side: 2 }])).toBe(
      "A line in the match log is on the wrong team",
    );
  });

  it("needs the player on a card and an own goal", () => {
    const card = logWarning([], bader, stamp("w", 6));
    expect(check([{ ...card[0]!, userId: null }])).toBe(
      "Name the player for every card and own goal",
    );
  });

  it("keeps the reason to a red card and one red card a player", () => {
    const goal = logGoal([], ali, stamp("a", 6));
    expect(check([{ ...goal[0]!, reason: "dissent" }])).toBe(
      "Only a red card has a reason",
    );
    const red = logRedCard([], bader, null, stamp("r", 6));
    expect(check([red[0]!, { ...red[0]!, id: "r2" }])).toBe(
      "A player can be sent off once",
    );
  });
});

describe("copy", () => {
  it("says what each line was and for which side", () => {
    expect(
      logLineSub({ kind: "goal", side: 1, reason: null }, names, "en"),
    ).toBe("Goal, Black");
    expect(
      logLineSub({ kind: "own_goal", side: 1, reason: null }, names, "en"),
    ).toBe("Own goal, counts for Black");
    expect(
      logLineSub({ kind: "warning", side: 2, reason: null }, names, "en"),
    ).toBe("Warning, White");
    expect(
      logLineSub(
        { kind: "red_card", side: 2, reason: "second_warning" },
        names,
        "en",
      ),
    ).toBe("Red card, White. Second warning");
  });

  it("names what Undo brings back", () => {
    expect(
      removedLabel(
        { kind: "goal", side: 2, userId: "x" },
        "Sayed R",
        names,
        "en",
      ),
    ).toBe("Goal by Sayed R removed");
    expect(
      removedLabel({ kind: "goal", side: 2, userId: null }, null, names, "en"),
    ).toBe("Goal for White removed");
  });
});

describe("logLineName", () => {
  const players = [
    { userId: "ali", name: "Ali Khalil", isViewer: false },
    { userId: "you", name: "Hassan H", isViewer: true },
  ];
  it("names the player, the viewer as You, and nobody as not known", () => {
    expect(logLineName({ kind: "goal", userId: "ali" }, players, "en")).toBe(
      "Ali K",
    );
    expect(logLineName({ kind: "goal", userId: "you" }, players, "en")).toBe(
      "You",
    );
    expect(logLineName({ kind: "goal", userId: null }, players, "en")).toBe(
      "Scorer not known",
    );
    expect(
      logLineName({ kind: "warning", userId: "gone" }, players, "en"),
    ).toBe("Player not known");
  });
});

describe("order", () => {
  const reloaded = (lines: readonly MatchLogLine[]) =>
    chronological(lines).map((line, index) => ({
      ...line,
      id: `row-${String(1000 - index)}`,
    }));

  it("keeps a second warning ahead of its red card after the log is loaded again", () => {
    let lines = logWarning([], bader, stamp("w1", 11));
    lines = logWarning(lines, bader, stamp("w2", 38));
    const again = reloaded(lines);
    expect(chronological(again).map((line) => line.kind)).toEqual([
      "warning",
      "warning",
      "red_card",
    ]);
    expect(sameLog(logPayload(lines), logPayload(again))).toBe(true);
  });

  it("keeps lines seeded at one moment in order across a reload", () => {
    const lines = seedLogFromScore(
      { slot1: 3, slot2: 2 },
      [
        { ...ali, goals: 2 },
        { ...omar, goals: 1 },
      ],
      { at: at(70), kickoff },
    );
    expect(sameLog(logPayload(lines), logPayload(reloaded(lines)))).toBe(true);
  });
});

describe("the second warning rule under edits", () => {
  const twice = () => {
    let lines = logWarning([], bader, stamp("w1", 11));
    lines = logWarning(lines, bader, stamp("w2", 38));
    return lines;
  };
  const sideOf = (userId: string) =>
    (({ ali: 1, you: 1, omar: 2, bader: 2 })[userId] as 1 | 2 | undefined) ??
    null;
  const stands = (lines: MatchLogLine[]) =>
    matchLogProblem(logPayload(lines), sideOf, "en");

  it("takes the red card back when a warning moves to another player", () => {
    const lines = changePlayer(twice(), "w2", omar);
    expect(playerTally(lines, "bader")).toMatchObject({
      warnings: 1,
      sentOff: false,
    });
    expect(playerTally(lines, "omar")).toMatchObject({
      warnings: 1,
      sentOff: false,
    });
    expect(stands(lines)).toBeNull();
  });

  it("gives the red card when a moved warning is the player's second", () => {
    let lines = logWarning([], bader, stamp("w1", 11));
    lines = logWarning(lines, omar, stamp("w2", 20));
    lines = changePlayer(lines, "w2", bader);
    expect(
      chronological(lines).map((line) => [line.kind, line.userId]),
    ).toEqual([
      ["warning", "bader"],
      ["warning", "bader"],
      ["red_card", "bader"],
    ]);
    expect(lines[2]).toMatchObject({ reason: "second_warning", minute: 20 });
    expect(stands(lines)).toBeNull();
  });

  it("does not move a warning onto a player already sent off", () => {
    let lines = logRedCard([], bader, "dissent", stamp("r", 10));
    lines = logWarning(lines, omar, stamp("w", 12));
    expect(changePlayer(lines, "w", bader)).toEqual(lines);
  });

  it("gives a player with two warnings a red card again when theirs moves away", () => {
    const lines = changePlayer(twice(), "w2-red", omar);
    expect(playerTally(lines, "omar").sentOff).toBe(true);
    expect(playerTally(lines, "bader")).toMatchObject({
      warnings: 2,
      sentOff: true,
    });
    expect(new Set(lines.map((line) => line.id)).size).toBe(lines.length);
    expect(stands(lines)).toBeNull();
  });

  it("is checked on save", () => {
    const [first, second] = twice();
    expect(stands([first!, second!])).toBe(
      "A second warning sends the player off",
    );
    expect(stands([...twice(), { ...first!, id: "w3", minute: 50 }])).toBe(
      "A second warning sends the player off",
    );
    expect(stands(twice())).toBeNull();
  });
});

describe("what a log can hold", () => {
  it("stops a side at 99 goals", () => {
    let lines: MatchLogLine[] = [];
    for (let goal = 0; goal < 105; goal += 1) {
      lines = logUnknownGoal(lines, 1, stamp(`g${String(goal)}`, 5));
    }
    expect(logScore(lines).slot1).toBe(99);
    expect(logGoal(lines, ali, stamp("x", 6))).toHaveLength(99);
    expect(logOwnGoal(lines, omar, stamp("y", 6))).toHaveLength(99);
    expect(logGoal(lines, omar, stamp("z", 6))).toHaveLength(100);
  });

  it("stops at the most lines a save takes, leaving room for a second warning's red card", () => {
    let lines: MatchLogLine[] = [];
    for (let goal = 0; goal < 99; goal += 1) {
      lines = logUnknownGoal(lines, 1, stamp(`a${String(goal)}`, 5));
      lines = logUnknownGoal(lines, 2, stamp(`b${String(goal)}`, 5));
    }
    lines = logWarning(lines, ali, stamp("w", 6));
    expect(lines).toHaveLength(MATCH_LOG_LINES_MAX - 1);
    expect(logWarning(lines, bader, stamp("w2", 7))).toHaveLength(
      MATCH_LOG_LINES_MAX - 1,
    );
    lines = logRedCard(lines, bader, null, stamp("r", 8));
    expect(lines).toHaveLength(MATCH_LOG_LINES_MAX);
    expect(logRedCard(lines, omar, null, stamp("r2", 9))).toHaveLength(
      MATCH_LOG_LINES_MAX,
    );
  });

  it("keeps the Score when a player in the log has left the Game", () => {
    let lines = logGoal([], ali, stamp("g", 6));
    lines = logOwnGoal(lines, omar, stamp("og", 9));
    lines = logWarning(lines, omar, stamp("w", 12));
    lines = logGoal(lines, bader, stamp("g2", 20));
    const kept = keepLinesOnSides(lines, (userId) =>
      userId === "bader" ? 2 : null,
    );
    expect(kept.map((line) => [line.kind, line.userId])).toEqual([
      ["goal", null],
      ["goal", null],
      ["goal", "bader"],
    ]);
    expect(logScore(kept)).toEqual(logScore(lines));
  });
});

describe("read aloud and added up", () => {
  const players = [
    { userId: "ali", name: "Ali Khalil", isViewer: false },
    { userId: "omar", name: "Omar Malik", isViewer: false },
    { userId: "bader", name: "Bader Hasan", isViewer: false },
  ];
  const game = () => {
    let lines = logGoal([], ali, stamp("a", 6));
    lines = logOwnGoal(lines, omar, stamp("b", 24));
    lines = logWarning(lines, bader, stamp("w1", 30));
    lines = logWarning(lines, bader, stamp("w2", 38));
    lines = logGoal(lines, ali, stamp("c", 47));
    return lines;
  };

  it("reads a log line and a timeline line", () => {
    const lines = game();
    expect(logLineSpoken(lines[1]!, players, names, "en")).toBe(
      "minute 24, Omar M, Own goal, counts for Black",
    );
    expect(
      timelineLineSpoken(lines[0]!, { slot1: 1, slot2: 0 }, players, "en"),
    ).toBe("minute 6, Ali K, Goal, 1–0");
    expect(timelineLineSpoken(lines[2]!, undefined, players, "ar")).toContain(
      "، ",
    );
    expect(logScoreLabel({ slot1: 2, slot2: 1 })).toBe("2–1");
  });

  it("reads a player's chip", () => {
    expect(playerChipSpoken(players[2]!, "White", game(), "en")).toBe(
      "Bader Hasan, White, warned, sent off",
    );
    expect(playerChipSpoken(players[0]!, "Black", game(), "en")).toBe(
      "Ali Khalil, Black, 2 goals",
    );
  });

  it("adds the log up, each name once and oldest first", () => {
    expect(logFacts(game(), players, "en")).toEqual({
      scorers: ["Ali K"],
      ownGoals: ["Omar M"],
      sentOff: ["Bader H, 38′"],
      cards: { warnings: 2, redCards: 1 },
      cardsSpoken: "2 warnings, 1 red card",
    });
  });
});
