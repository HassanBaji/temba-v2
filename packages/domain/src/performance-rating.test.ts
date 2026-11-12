import { describe, expect, it } from "vitest";

import {
  MIN_BALLOTS,
  ORGANIZER_DOUBLE_WEIGHT,
  RATING_WINDOW_HOURS,
  gameAverageRating,
  isPerformanceRatingValue,
  minBallotsFor,
  performanceScores,
  raterWeight,
  rateGameDraft,
  rateGameEntry,
  rateGameSubmission,
  rateGameView,
  ratingWindowClosesAt,
  ratingWindowState,
  setDraftRating,
  settlePerformanceRatings,
  toggleDraftMvp,
  usualRating,
  type PerformanceBallot,
  type RateGameSheet,
} from "./performance-rating";
import { tierMatchDeltas } from "./tier-points";

function ballots(rateeUserId: string, values: number[]): PerformanceBallot[] {
  return values.map((value, index) => ({
    raterUserId: `rater-${index}`,
    rateeUserId,
    value,
  }));
}

describe("isPerformanceRatingValue", () => {
  it("accepts whole numbers from 1 to 10 only", () => {
    expect(isPerformanceRatingValue(1)).toBe(true);
    expect(isPerformanceRatingValue(10)).toBe(true);
    expect(isPerformanceRatingValue(0)).toBe(false);
    expect(isPerformanceRatingValue(11)).toBe(false);
    expect(isPerformanceRatingValue(6.5)).toBe(false);
    expect(isPerformanceRatingValue("6")).toBe(false);
  });
});

describe("the Rating window", () => {
  const completedAt = new Date("2026-11-12T17:30:00Z");

  it("closes 24 hours after completion", () => {
    expect(ratingWindowClosesAt(completedAt).getTime()).toBe(
      completedAt.getTime() + RATING_WINDOW_HOURS * 3_600_000,
    );
  });

  it("is open until it closes, then due until settled", () => {
    const closesAt = ratingWindowClosesAt(completedAt);
    const window = { closesAt, settledAt: null, suspendedAt: null };
    expect(ratingWindowState(window, completedAt)).toBe("open");
    expect(ratingWindowState(window, closesAt)).toBe("due");
    expect(
      ratingWindowState({ ...window, settledAt: closesAt }, closesAt),
    ).toBe("settled");
    expect(
      ratingWindowState({ ...window, suspendedAt: completedAt }, completedAt),
    ).toBe("suspended");
  });
});

describe("settlePerformanceRatings", () => {
  it("needs three ballots when everyone rates, one when the organizer does", () => {
    expect(minBallotsFor("everyone")).toBe(MIN_BALLOTS);
    expect(minBallotsFor("organizer")).toBe(1);
    const two = ballots("p", [7, 8]);
    expect(
      settlePerformanceRatings(two, new Map(), { mode: "everyone" }),
    ).toEqual([]);
    const [one] = settlePerformanceRatings(ballots("p", [7]), new Map(), {
      mode: "organizer",
    });
    expect(one).toEqual({ userId: "p", rating: 7, ballotsCounted: 1 });
  });

  it("drops the highest and lowest from five ballots up", () => {
    const [four] = settlePerformanceRatings(ballots("p", [2, 6, 7, 10]));
    expect(four!.rating).toBeCloseTo(6.25, 10);
    expect(four!.ballotsCounted).toBe(4);
    const [five] = settlePerformanceRatings(ballots("p", [2, 6, 7, 8, 10]));
    expect(five!.rating).toBeCloseTo(7, 10);
    expect(five!.ballotsCounted).toBe(3);
  });

  it("weighs each rater, and an organizer counts double when the setting is on", () => {
    expect(
      raterWeight({
        mode: "everyone",
        organizerCountsDouble: true,
        raterIsOrganizer: true,
      }),
    ).toBe(ORGANIZER_DOUBLE_WEIGHT);
    expect(
      raterWeight({
        mode: "organizer",
        organizerCountsDouble: true,
        raterIsOrganizer: true,
      }),
    ).toBe(1);
    const weights = new Map([["rater-0", 2]]);
    const [row] = settlePerformanceRatings(ballots("p", [9, 6, 6]), weights);
    expect(row!.rating).toBeCloseTo(7.5, 10);
  });

  it("never counts a ballot to oneself or out of range", () => {
    const settled = settlePerformanceRatings(
      [
        { raterUserId: "p", rateeUserId: "p", value: 10 },
        { raterUserId: "a", rateeUserId: "p", value: 0 },
        { raterUserId: "b", rateeUserId: "p", value: 7 },
      ],
      new Map(),
      { mode: "organizer" },
    );
    expect(settled).toEqual([{ userId: "p", rating: 7, ballotsCounted: 1 }]);
  });

  it("averages the game over the rated players", () => {
    expect(gameAverageRating([])).toBeNull();
    expect(gameAverageRating([{ rating: 7 }, { rating: 6 }])).toBe(6.5);
  });
});

describe("usualRating", () => {
  it("starts at an ordinary game and leans on the last ten", () => {
    expect(usualRating([])).toBe(6);
    expect(usualRating([8])).toBeCloseTo((18 + 8) / 4, 10);
    const eleven = [...Array.from({ length: 10 }, () => 7), 1];
    expect(usualRating(eleven)).toBeCloseTo((18 + 70) / 13, 10);
  });
});

describe("performanceScores", () => {
  it("centres on the game, so a generous day nets to zero", () => {
    const scores = performanceScores([
      { userId: "a", rating: 8, usual: 7 },
      { userId: "b", rating: 7, usual: 6 },
    ]);
    expect(scores.get("a")).toBeCloseTo(0, 10);
    expect(scores.get("b")).toBeCloseTo(0, 10);
  });

  it("clamps to one either way", () => {
    const scores = performanceScores([
      { userId: "a", rating: 10, usual: 6 },
      { userId: "b", rating: 2, usual: 6 },
    ]);
    expect(scores.get("a")).toBe(1);
    expect(scores.get("b")).toBe(-1);
  });

  it("with weight 30, a win at 0.46 rated 7.4 against a usual 6.8 gives +12 and +6", () => {
    const scores = performanceScores([
      { userId: "you", rating: 7.4, usual: 6.8 },
      { userId: "mate", rating: 6.2, usual: 6.8 },
    ]);
    const ownMean = 1250;
    const oppMean = ownMean + 400 * Math.log10(1 / 0.46 - 1);
    const [you] = tierMatchDeltas({
      slot1: [
        {
          userId: "you",
          points: ownMean,
          provisional: false,
          performance: scores.get("you"),
        },
      ],
      slot2: [{ userId: "them", points: oppMean, provisional: false }],
      result: "slot1",
      weight: 0.3,
    });
    expect(you!.resultDelta).toBe(12);
    expect(you!.performanceDelta).toBe(6);
  });
});

function sheet(overrides: Partial<RateGameSheet> = {}): RateGameSheet {
  return {
    mode: "organizer",
    weightPercent: 30,
    state: "open",
    closesAt: new Date("2026-11-13T17:30:00Z"),
    groupName: "Thursday Football",
    venueName: "Galali Soccer Complex",
    windowStart: new Date("2026-11-12T16:00:00Z"),
    score: { slot1: 5, slot2: 3 },
    bibs: { slot1: "black", slot2: "white" },
    viewerSide: 1,
    viewerIsOrganizer: true,
    slot1: [
      {
        userId: "you",
        name: "Hassan H",
        role: "outfield",
        position: "mid",
        isViewer: true,
      },
      {
        userId: "ali",
        name: "Ali M",
        role: "outfield",
        position: "fwd",
        isViewer: false,
      },
      {
        userId: "hussain",
        name: "Hussain A",
        role: "keeper",
        position: null,
        isViewer: false,
      },
    ],
    slot2: [
      {
        userId: "jassim",
        name: "Jassim H",
        role: "outfield",
        position: "def",
        isViewer: false,
      },
    ],
    ratings: [],
    mvp: { pickable: true, userId: null },
    ...overrides,
  };
}

describe("rateGameView", () => {
  it("shows the viewer's side first, locks their own row and counts the rest", () => {
    const input = sheet();
    let draft = rateGameDraft(input);
    draft = setDraftRating(draft, "ali", 8);
    const view = rateGameView(input, draft, "en");
    expect(view.title).toBe("Rate the game");
    expect(view.hero.score).toBe("5–3");
    expect(view.hero.line).toBe(
      "Thu 12 Nov, Galali Soccer Complex. You organized",
    );
    const [black, white] = view.sides;
    expect(black!.name).toBe("Black");
    expect(black!.result).toBe("won");
    expect(black!.openByDefault).toBe(true);
    expect(black!.rows.map((row) => row.userId)).toEqual(["ali", "hussain"]);
    expect(black!.self?.note).toBe(
      "You don’t rate yourself. Yours moves on the result",
    );
    expect(black!.rows[0]!.valueLabel).toBe("8");
    expect(black!.rows[0]!.detail).toBe("Forward");
    expect(black!.rows[1]!.detail).toBe("Keeper");
    expect(black!.rows[1]!.valueLabel).toBe("–");
    expect(white!.result).toBe("lost");
    expect(white!.openByDefault).toBe(false);
    expect(white!.collapsedLine).toBe("1 player, not rated yet");
    expect(view.headingAside).toBe("1 of 2 rated");
    expect(view.footer.title).toBe("1 of 3 rated");
    expect(view.footer.subline).toBe("No MVP yet");
    expect(view.footnote).toBe(
      "6 is an ordinary game. In this group your ratings are the performance part of everyone’s points, 30% of the move. The star is the MVP.",
    );
    expect(view.canSubmit).toBe(true);
    expect(view.notice).toBeNull();
  });

  it("marks the cells below the pick and clears a pick tapped twice", () => {
    const input = sheet();
    const draft = setDraftRating(rateGameDraft(input), "ali", 3);
    const row = rateGameView(input, draft, "en").sides[0]!.rows[0]!;
    expect(row.cells.map((cell) => cell.state).slice(0, 4)).toEqual([
      "below",
      "below",
      "selected",
      "above",
    ]);
    const cleared = setDraftRating(draft, "ali", 3);
    expect(cleared.values.ali).toBeUndefined();
  });

  it("names the MVP picked with the star, and hides the star when it cannot be picked", () => {
    const input = sheet();
    const draft = toggleDraftMvp(rateGameDraft(input), input, "ali");
    const view = rateGameView(input, draft, "en");
    expect(view.footer.subline).toBe("MVP: Ali M");
    expect(view.sides[0]!.rows[0]!.star?.on).toBe(true);
    expect(toggleDraftMvp(draft, input, "ali").mvpUserId).toBeNull();

    const fixed = sheet({ mvp: { pickable: false, userId: null } });
    const fixedView = rateGameView(fixed, rateGameDraft(fixed), "en");
    expect(fixedView.sides[0]!.rows[0]!.star).toBeNull();
    expect(fixedView.footer.subline).toBeNull();
  });

  it("keeps a stored MVP when its star is tapped again", () => {
    const input = sheet({ mvp: { pickable: true, userId: "ali" } });
    const draft = rateGameDraft(input);
    expect(toggleDraftMvp(draft, input, "ali").mvpUserId).toBe("ali");
    expect(rateGameSubmission(draft, input).mvpUserId).toBeNull();
    const moved = toggleDraftMvp(draft, input, "jassim");
    expect(rateGameSubmission(moved, input).mvpUserId).toBe("jassim");
  });

  it("submits only the players the viewer may rate", () => {
    const input = sheet({ ratings: [{ userId: "you", value: 9 }] });
    const draft = setDraftRating(rateGameDraft(input), "jassim", 6);
    expect(rateGameSubmission(draft, input).ratings).toEqual([
      { userId: "jassim", value: 6 },
    ]);
  });

  it("says so when the window is closed or suspended", () => {
    const closed = sheet({ state: "settled" });
    const view = rateGameView(closed, rateGameDraft(closed), "en");
    expect(view.canSubmit).toBe(false);
    expect(view.notice?.title).toBe("Ratings are closed");
    const paused = sheet({ state: "suspended" });
    expect(rateGameView(paused, rateGameDraft(paused), "ar").notice).not.toBe(
      null,
    );
  });
});

describe("rateGameEntry", () => {
  const window = {
    mode: "organizer" as const,
    state: "open" as const,
    closesAt: new Date("2026-11-13T17:30:00Z"),
    viewerMayRate: true,
  };

  it("invites an Organizer to rate while the window is open", () => {
    const entry = rateGameEntry(window, "en");
    expect(entry?.title).toBe("Rate the game");
    expect(entry?.description).toBe(
      "Score everyone 1 to 10. Closes Fri 8:30 PM, then points move on the result alone.",
    );
    expect(rateGameEntry(window, "ar")).not.toBeNull();
  });

  it("shows nothing to someone who may not rate, or once it closes", () => {
    expect(rateGameEntry(null, "en")).toBeNull();
    expect(rateGameEntry({ ...window, viewerMayRate: false }, "en")).toBeNull();
    expect(rateGameEntry({ ...window, state: "settled" }, "en")).toBeNull();
    expect(rateGameEntry({ ...window, mode: "everyone" }, "en")).toBeNull();
  });
});
