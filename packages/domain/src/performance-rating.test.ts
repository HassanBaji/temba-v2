import { describe, expect, it } from "vitest";

import {
  MIN_BALLOTS,
  ORGANIZER_DOUBLE_WEIGHT,
  OUTLIER_WEIGHT_FACTOR,
  RATING_WINDOW_HOURS,
  gameAverageRating,
  isPerformanceRatingValue,
  minBallotsFor,
  outlierRaterIds,
  performanceRatingSummaryView,
  performanceResultView,
  performanceScores,
  raterDistances,
  raterWeight,
  rateGameDraft,
  rateGameEntry,
  rateGameSubmission,
  rateGameView,
  ratingSummaryEntry,
  ratingWindowClosesAt,
  ratingWindowState,
  setDraftRating,
  settlePerformanceRatings,
  toggleDraftMvp,
  usualRating,
  type PerformanceBallot,
  type PerformanceRatingResultData,
  type PerformanceRatingSummaryData,
  type PerformanceRatingSummaryPlayer,
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

describe("an outlier rater (D19)", () => {
  const players = ["a", "b", "c", "d"];
  const usual: Record<string, number> = { r1: 6, r2: 7, r3: 8 };

  /** r1, r2 and r3 give 6, 7 and 8; x gives everyone a 1. */
  function oneGame(): PerformanceBallot[] {
    return players.flatMap((rateeUserId) => [
      ...Object.entries(usual).map(([raterUserId, value]) => ({
        raterUserId,
        rateeUserId,
        value,
      })),
      { raterUserId: "x", rateeUserId, value: 1 },
    ]);
  }

  it("measures each rater's mean distance from the settled ratings", () => {
    const distances = raterDistances(oneGame(), [
      { userId: "a", rating: 5.5 },
      { userId: "b", rating: 5.5 },
    ]);
    expect(distances.get("x")).toBeCloseTo(4.5, 10);
    expect(distances.get("r2")).toBeCloseTo(1.5, 10);
    expect(raterDistances(oneGame(), []).size).toBe(0);
  });

  it("gave 1s where everyone else gave 6 to 8, three games running, and weighs 0.5 in the third", () => {
    const game = oneGame();
    const fullWeight = settlePerformanceRatings(game, new Map(), {
      mode: "everyone",
      previousDistances: new Map(),
    });
    expect(fullWeight[0]!.rating).toBeCloseTo(5.5, 10);

    const firstDistance = raterDistances(game, fullWeight).get("x")!;
    expect(firstDistance).toBeGreaterThan(2);

    const second = new Map([["x", [firstDistance]]]);
    expect(
      outlierRaterIds(game, new Map(), {
        mode: "everyone",
        previousDistances: second,
      }).size,
    ).toBe(0);
    expect(
      settlePerformanceRatings(game, new Map(), {
        mode: "everyone",
        previousDistances: second,
      })[0]!.rating,
    ).toBeCloseTo(5.5, 10);

    const third = new Map([["x", [firstDistance, firstDistance]]]);
    expect([
      ...outlierRaterIds(game, new Map(), {
        mode: "everyone",
        previousDistances: third,
      }),
    ]).toEqual(["x"]);
    const halved = settlePerformanceRatings(game, new Map(), {
      mode: "everyone",
      previousDistances: third,
    });
    const weight = OUTLIER_WEIGHT_FACTOR;
    expect(halved[0]!.rating).toBeCloseTo(
      (6 + 7 + 8 + weight * 1) / (3 + weight),
      10,
    );
    expect(halved[0]!.ballotsCounted).toBe(4);
  });

  it("is not an outlier when one of the three games was close", () => {
    const game = oneGame();
    expect(
      outlierRaterIds(game, new Map(), {
        mode: "everyone",
        previousDistances: new Map([["x", [4.5, 1.5]]]),
      }).size,
    ).toBe(0);
    expect(
      outlierRaterIds(game, new Map(), {
        mode: "everyone",
        previousDistances: new Map([["x", [4.5, null]]]),
      }).size,
    ).toBe(0);
    expect(
      outlierRaterIds(game, new Map(), {
        mode: "everyone",
        previousDistances: new Map([["r1", [4.5, 4.5]]]),
      }).size,
    ).toBe(0);
  });

  it("halves an organizer's double weight to one", () => {
    const game = oneGame();
    const [row] = settlePerformanceRatings(game, new Map([["x", 2]]), {
      mode: "everyone",
      previousDistances: new Map([["x", [4.5, 4.5]]]),
    });
    expect(row!.rating).toBeCloseTo((6 + 7 + 8 + 1) / 4, 10);
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
    progress: { raters: 0, players: 4 },
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
    expect(black!.aside).toBe("won");
    expect(black!.openByDefault).toBe(true);
    expect(black!.rows.map((row) => row.userId)).toEqual(["ali", "hussain"]);
    expect(black!.self?.note).toBe(
      "You don’t rate yourself. Yours moves on the result",
    );
    expect(black!.rows[0]!.valueLabel).toBe("8");
    expect(black!.rows[0]!.detail).toBe("Forward");
    expect(black!.rows[1]!.detail).toBe("Keeper");
    expect(black!.rows[1]!.valueLabel).toBe("–");
    expect(white!.aside).toBe("lost");
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
    expect(view.privacy).toBeNull();
    expect(view.submitted).toBe("Ratings sent. Everyone’s points have moved.");
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

describe("rateGameView when everyone rates (screen 4b)", () => {
  const now = new Date("2026-11-12T19:00:00Z");
  const everyone = (overrides: Partial<RateGameSheet> = {}) =>
    sheet({
      mode: "everyone",
      progress: { raters: 5, players: 14 },
      mvp: { pickable: false, userId: null },
      ...overrides,
    });

  it("leads with teammates, keeps opponents optional and hides who gave what", () => {
    const input = everyone();
    const view = rateGameView(input, rateGameDraft(input), "en", now);
    expect(view.hero.line).toBe(
      "Thu 12 Nov, Galali Soccer Complex. You played in Black",
    );
    expect(view.privacy).toEqual({
      title: "Closes tomorrow, 8:30 PM",
      description: "Nobody sees who gave what. 5 of 14 have rated so far",
    });
    expect(view.heading).toBe("Your teammates");
    expect(view.headingAside).toBe("0 of 2 rated");
    const [black, white] = view.sides;
    expect(black!.aside).toBe("your side");
    expect(black!.openByDefault).toBe(true);
    expect(black!.self?.note).toBe("You can’t rate yourself");
    expect(black!.rows.every((row) => row.star === null)).toBe(true);
    expect(white!.openByDefault).toBe(false);
    expect(white!.aside).toBe("optional");
    expect(white!.collapsedLine).toBe("1 opponent, optional");
    expect(view.footnote).toBe(
      "Rate who you saw; leave the rest blank. A blank is not a zero.",
    );
    expect(view.footer).toEqual({
      title: "Nothing rated yet",
      subline: "You can change them until it closes",
      submit: "Send",
    });
    expect(view.submitted).toBe(
      "Ratings sent. You can change them until it closes.",
    );
  });

  it("counts what the viewer rated, hidden until the window closes", () => {
    const input = everyone({ ratings: [{ userId: "jassim", value: 7 }] });
    const draft = setDraftRating(rateGameDraft(input), "ali", 8);
    const view = rateGameView(input, draft, "en", now);
    expect(view.footer.title).toBe("2 rated, hidden until tomorrow");
    expect(view.sides[1]!.collapsedLine).toBe("1 of 1 rated");
    const sameDay = rateGameView(
      input,
      draft,
      "en",
      new Date("2026-11-13T10:00:00Z"),
    );
    expect(sameDay.privacy?.title).toBe("Closes today, 8:30 PM");
    expect(sameDay.footer.title).toBe("2 rated, hidden until 8:30 PM");
    expect(rateGameView(input, draft, "ar", now).privacy).not.toBeNull();
  });

  it("does not count a blank: a rating tapped twice is left out of the submit", () => {
    const input = everyone({ ratings: [{ userId: "ali", value: 7 }] });
    const blanked = setDraftRating(rateGameDraft(input), "ali", 7);
    expect(rateGameSubmission(blanked, input).ratings).toEqual([]);
    expect(rateGameView(input, blanked, "en", now).footer.title).toBe(
      "Nothing rated yet",
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
  });

  it("invites a seated player when everyone rates", () => {
    expect(
      rateGameEntry({ ...window, mode: "everyone" }, "en")?.description,
    ).toBe(
      "Score your teammates and, if you want, opponents. Nobody sees who gave what. Closes Fri 8:30 PM.",
    );
    expect(
      rateGameEntry(
        { ...window, mode: "everyone", viewerMayRate: false },
        "en",
      ),
    ).toBeNull();
  });
});

describe("performanceResultView (screen 4c)", () => {
  type Result = NonNullable<PerformanceRatingResultData["result"]>;

  const result: Result = {
    groupName: "Thursday Football",
    windowStart: new Date("2026-11-12T16:00:00Z"),
    score: { slot1: 5, slot2: 3 },
    bibs: { slot1: "black", slot2: "white" },
    viewerSide: 1,
    weightPercent: 30,
    rating: {
      hundredths: 740,
      usualHundredths: 680,
      ballotsReceived: 11,
      trimmed: true,
      organizerCountedDouble: true,
      gameAverageHundredths: 660,
    },
    noRating: null,
    resultDelta: 12,
    performanceDelta: 6,
    delta: 18,
    pointsBefore: 1201,
    pointsAfter: 1219,
    expectedScore: 0.46,
    tier: {
      bandBefore: "kanaad",
      bandAfter: "kanaad",
      placeBefore: 7,
      placeAfter: 6,
      rankedCount: 13,
      gamesOfFive: 5,
      nextBand: "hamour",
      pointsToNextBand: 82,
    },
    mvp: {
      name: "Ali M",
      isViewer: false,
      decidedBy: "vote",
      votes: { for: 6, cast: 11 },
      ratingHundredths: 860,
    },
  };

  const settled = (
    overrides: Partial<Result> = {},
  ): PerformanceRatingResultData => ({
    state: "settled",
    mode: "everyone",
    closesAt: new Date("2026-11-13T17:30:00Z"),
    played: true,
    result: { ...result, ...overrides },
  });

  function settledView(
    data: PerformanceRatingResultData,
    locale: "en" | "ar" = "en",
  ) {
    const view = performanceResultView(data, locale);
    if (view?.kind !== "settled") {
      throw new Error("Expected a settled view");
    }
    return view;
  }

  it("reads as the design's screen 4c", () => {
    const view = settledView(settled());
    expect(view.gameLine).toBe("Your game, Thu 12 Nov");
    expect(view.scoreLine).toBe("Black 5–3 White");
    expect(view.rating).toMatchObject({
      value: "7.4",
      ofTen: "of 10",
      note: "From 11 ratings. The highest and lowest were dropped; the organizer’s counted double. The game’s average was 6.6.",
    });
    expect(view.points.aside).toBe("Thursday Football");
    expect(view.points.rows).toMatchObject([
      {
        title: "The result",
        detail: "Won 5–3 against the stronger side on paper",
        delta: "+12",
      },
      {
        title: "How you played",
        detail: "7.4 against your usual 6.8",
        delta: "+6",
      },
    ]);
    expect(view.points.total).toMatchObject({
      title: "1,201 to 1,219",
      detail: "Performance counts for 30% in this group",
      delta: "+18",
    });
    expect(view.tier.aside).toBe("#6 of 13, up from #7");
    expect(view.tier.line).toBe("Still Kanaad. 82 points to Hamour.");
    expect(view.tier.track?.map((fish) => [fish.band, fish.current])).toEqual([
      ["safi", false],
      ["kanaad", true],
      ["hamour", false],
      ["shark", false],
    ]);
    expect(view.mvp).toEqual({
      title: "MVP: Ali M",
      detail: "6 of 11 votes, rated 8.6",
    });
    expect(view.footnote).toBe(
      "A group game. It moved your tier points here and nothing else: not your Temba Level, not any Rank.",
    );
    expect(settledView(settled(), "ar").points.rows).toHaveLength(2);
  });

  it("shows the two stored parts, which add up to the stored move", () => {
    const view = settledView(
      settled({
        resultDelta: -9,
        performanceDelta: 4,
        delta: -5,
        pointsAfter: 1196,
      }),
    );
    expect(view.points.rows.map((row) => row.delta)).toEqual(["−9", "+4"]);
    expect(view.points.total.delta).toBe("−5");
  });

  it("gives a player with no performance part the result part and the reason", () => {
    const tooFew = settledView(
      settled({
        rating: null,
        noRating: { reason: "too_few_ballots", ballotsReceived: 2 },
        performanceDelta: 0,
        delta: 12,
        pointsAfter: 1213,
      }),
    );
    expect(tooFew.rating).toBeNull();
    expect(tooFew.points.rows).toMatchObject([
      { title: "The result", delta: "+12" },
      {
        title: "How you played",
        detail:
          "Only 2 players rated you, and it takes 3. Yours moved on the result alone.",
        delta: "0",
      },
    ]);
    expect(tooFew.points.total.delta).toBe("+12");

    const reasons = {
      organizer_rated:
        "You rated this game, so yours moved on the result alone.",
      organizer_did_not_rate:
        "The organizer didn’t rate you, so yours moved on the result alone.",
    } as const;
    for (const [reason, detail] of Object.entries(reasons)) {
      const view = settledView(
        settled({
          rating: null,
          noRating: {
            reason: reason as keyof typeof reasons,
            ballotsReceived: 0,
          },
          performanceDelta: 0,
        }),
      );
      expect(view.points.rows[1].detail).toBe(detail);
    }
    expect(
      settledView(
        settled({
          rating: null,
          noRating: { reason: "too_few_ballots", ballotsReceived: 0 },
        }),
      ).points.rows[1].detail,
    ).toBe(
      "Nobody rated you, and it takes 3. Yours moved on the result alone.",
    );
  });

  it("hatches the tier while Provisional, and names a move between fish", () => {
    const provisional = settledView(
      settled({
        tier: {
          ...result.tier,
          bandBefore: null,
          bandAfter: null,
          placeBefore: null,
          placeAfter: null,
          rankedCount: 4,
          gamesOfFive: 2,
          nextBand: null,
          pointsToNextBand: null,
        },
      }),
    );
    expect(provisional.tier).toMatchObject({
      aside: "Provisional, 2 of 5 games",
      track: null,
      provisional: true,
    });

    const up = settledView(
      settled({
        tier: {
          ...result.tier,
          bandAfter: "hamour",
          nextBand: null,
          pointsToNextBand: null,
        },
      }),
    );
    expect(up.tier.line).toBe("Up to Hamour.");
    const fewRanked = settledView(
      settled({ tier: { ...result.tier, bandAfter: null, rankedCount: 3 } }),
    );
    expect(fewRanked.tier).toMatchObject({
      track: null,
      provisional: false,
      line: "No fish until four players are ranked.",
    });
  });

  it("says when the rating arrives while the window is open", () => {
    const open: PerformanceRatingResultData = {
      state: "open",
      mode: "everyone",
      closesAt: new Date("2026-11-13T17:30:00Z"),
      played: true,
      result: null,
    };
    const now = new Date("2026-11-12T18:00:00Z");
    expect(performanceResultView(open, "en", { now })).toEqual({
      kind: "pending",
      title: "Your rating is on its way",
      description:
        "Closes tomorrow, 8:30 PM. Then you see your rating and what it did to your tier points.",
    });
    expect(
      performanceResultView({ ...open, mode: "organizer" }, "en", { now }),
    ).toMatchObject({
      description:
        "The organizer rates everyone. You see your rating and what it did to your tier points once they submit, by Fri 8:30 PM at the latest.",
    });
    expect(
      performanceResultView(open, "en", { now, viewerMayRate: true }),
    ).toBeNull();
    expect(
      performanceResultView({ ...open, state: "suspended" }, "en"),
    ).toMatchObject({ kind: "pending", title: "Ratings are paused" });
  });

  it("shows nothing to a viewer who did not play", () => {
    expect(
      performanceResultView({ ...settled(), played: false }, "en"),
    ).toBeNull();
  });
});

describe("performanceRatingSummaryView (screen 4d)", () => {
  const closesAt = new Date("2026-11-13T17:30:00Z");

  function player(
    name: string,
    rating: number | null,
    delta: number,
    extra: Partial<PerformanceRatingSummaryPlayer> = {},
  ): PerformanceRatingSummaryPlayer {
    return {
      name,
      isViewer: false,
      ratingHundredths: rating,
      ballotsReceived: rating === null ? 1 : 11,
      delta,
      bandBefore: "kanaad",
      bandAfter: "kanaad",
      isMvp: false,
      ...extra,
    };
  }

  const data: PerformanceRatingSummaryData = {
    state: "settled",
    mode: "everyone",
    closesAt,
    summary: {
      groupId: "group",
      groupName: "Thursday Football",
      closedAt: closesAt,
      score: { slot1: 5, slot2: 3 },
      bibs: { slot1: "black", slot2: "white" },
      viewerSide: 1,
      progress: { raters: 12, players: 14 },
      slot1: [
        player("Hussain H", 740, 18, { isViewer: true }),
        player("Ali M", 860, 24, { isMvp: true }),
        player("Noor S", 620, 12, { bandBefore: "safi" }),
      ],
      slot2: [
        player("Salman R", 690, -8, { bandAfter: "safi" }),
        player("Jassim H", 780, -2),
        player("Omar", null, -1),
        player("Faisal", 600, -4),
      ],
      ratersCountedForLess: 1,
    },
  };

  it("lists each side by rating, with the MVP, a change of fish and the points move", () => {
    const view = performanceRatingSummaryView(data, "en");
    if (view.kind !== "settled") {
      throw new Error("Expected the settled summary");
    }
    expect(view.hero.score).toBe("5–3");
    expect(view.hero.line).toBe("12 of 14 rated. Window closed Fri 8:30 PM");
    const [black, white] = view.sides;
    expect(
      black!.rows.map((row) => [row.name, row.detail, row.rating, row.points]),
    ).toEqual([
      ["Ali M", "MVP", "8.6", "+24"],
      ["You", "11 ratings", "7.4", "+18"],
      ["Noor S", "Up to Kanaad", "6.2", "+12"],
    ]);
    expect(black!.rows[0]!.detailStrong).toBe(true);
    expect(black!.rows[1]!.initials).toBe("HH");
    expect(black!.aside).toBe("rating, points");
    expect(black!.previewCount).toBeNull();
    expect(
      white!.rows.map((row) => [row.name, row.detail, row.rating]),
    ).toEqual([
      ["Jassim H", "11 ratings", "7.8"],
      ["Salman R", "Down to Safi", "6.9"],
      ["Faisal", "11 ratings", "6.0"],
      ["Omar", "1 rating", "–"],
    ]);
    expect(white!.rows[0]!.points).toBe("−2");
    expect(white!.previewCount).toBe(2);
    expect(white!.moreLabel).toBe("2 more");
    expect(view.outliers).toEqual({
      title: "One rater counted for less",
      description:
        "Their ratings were far from everyone else’s for the third game running. Names stay private, even from you.",
    });
    expect(view.footer).toEqual({
      title: "Something look wrong?",
      description: "Adjust a player from Members, Manage",
      cta: "Members",
    });
  });

  it("says nothing about raters when none counted for less, and counts more than one", () => {
    const none = performanceRatingSummaryView(
      { ...data, summary: { ...data.summary!, ratersCountedForLess: 0 } },
      "en",
    );
    expect(none.kind === "settled" && none.outliers).toBeNull();
    const two = performanceRatingSummaryView(
      { ...data, summary: { ...data.summary!, ratersCountedForLess: 2 } },
      "en",
    );
    expect(two.kind === "settled" && two.outliers?.title).toBe(
      "2 raters counted for less",
    );
  });

  it("says whether the organizer rated when the Organizer rates", () => {
    const view = performanceRatingSummaryView(
      {
        ...data,
        mode: "organizer",
        summary: { ...data.summary!, progress: { raters: 1, players: 14 } },
      },
      "en",
    );
    expect(view.kind === "settled" && view.hero.line).toBe(
      "Rated by the organizer. Window closed Fri 8:30 PM",
    );
  });

  it("before the window settles, says when it closes", () => {
    const view = performanceRatingSummaryView(
      { state: "open", mode: "organizer", closesAt, summary: null },
      "en",
    );
    expect(view).toEqual({
      kind: "pending",
      title: "Ratings are still open",
      description:
        "Fri 8:30 PM. Then each player’s rating and points move are here.",
    });
  });

  it("speaks in Arabic", () => {
    const view = performanceRatingSummaryView(data, "ar");
    expect(view.kind === "settled" && view.outliers?.title).toBe(
      "احتُسب مقيّم واحد بوزن أقل",
    );
  });
});

describe("ratingSummaryEntry", () => {
  it("opens screen 4d for an Organizer once the window has settled", () => {
    expect(ratingSummaryEntry({ state: "settled" }, true, "en")).toEqual({
      title: "Ratings are in",
      description:
        "Each player’s rating and points move, and who changed tier.",
      cta: "See",
    });
    expect(ratingSummaryEntry({ state: "settled" }, false, "en")).toBeNull();
    expect(ratingSummaryEntry({ state: "open" }, true, "en")).toBeNull();
    expect(ratingSummaryEntry(null, true, "en")).toBeNull();
  });
});
