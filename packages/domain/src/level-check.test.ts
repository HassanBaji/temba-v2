import { describe, expect, it } from "vitest";

import { muFromLevel } from "./level";
import {
  LEVEL_CHECK_CAP_MU,
  levelCheckDraft,
  levelCheckRaterDistances,
  levelCheckRaterWeights,
  levelCheckResultView,
  levelCheckRows,
  levelCheckStep,
  levelCheckSubmission,
  levelCheckVerdict,
  levelCheckVerdictBand,
  levelCheckVerdictHundredths,
  levelCheckVerdictLevel,
  levelCheckVerdicts,
  setLevelCheckAnswer,
  type LevelCheckAnswer,
  type WeighedLevelCheckAnswer,
  type LevelCheckSheet,
} from "./level-check";

const partner = (
  band: WeighedLevelCheckAnswer["band"],
): WeighedLevelCheckAnswer => ({
  band,
  fromOpponent: false,
});
const opponent = (
  band: WeighedLevelCheckAnswer["band"],
): WeighedLevelCheckAnswer => ({
  band,
  fromOpponent: true,
});

/** A verdict on the one band its Level falls in. */
const on = (level: number) => ({
  level,
  bands: [levelCheckVerdictBand(level)],
});

/** A player at the middle of C (3.15), showing C. */
const atC = (phi: number) => ({
  mu: muFromLevel(3.15),
  phi,
  levelBand: "C2" as const,
});

describe("levelCheckVerdict", () => {
  it("settles nobody on one answer", () => {
    expect(levelCheckVerdict([opponent("C")])).toEqual({
      kind: "too_few",
      ballotsCounted: 1,
    });
    expect(levelCheckVerdict([])).toEqual({
      kind: "too_few",
      ballotsCounted: 0,
    });
  });

  it("settles nobody on two answers both from the partner's side", () => {
    expect(levelCheckVerdict([partner("C"), partner("C")])).toEqual({
      kind: "no_opponent",
      ballotsCounted: 2,
    });
  });

  it("settles on two answers with one from an opponent", () => {
    expect(levelCheckVerdict([partner("C"), opponent("C")])).toEqual({
      kind: "verdict",
      level: 3.15,
      bands: ["C"],
      ballotsCounted: 2,
    });
  });

  it("takes the mean of the two middles when two answers split", () => {
    const verdict = levelCheckVerdict([opponent("C"), partner("C+")]);
    expect(verdict.kind).toBe("verdict");
    expect(verdict.kind === "verdict" && verdict.level).toBeCloseTo(3.5, 10);
  });

  it("takes the median of three", () => {
    expect(
      levelCheckVerdict([opponent("A"), partner("D"), opponent("C-")]),
    ).toEqual({
      kind: "verdict",
      level: 2.45,
      bands: ["C-"],
      ballotsCounted: 3,
    });
  });

  it("reads D at the middle of 0.0 to 1.4", () => {
    expect(levelCheckVerdict([opponent("D"), opponent("D")])).toMatchObject({
      level: 0.7,
    });
  });
});

const ballot = (
  raterUserId: string,
  band: LevelCheckAnswer["band"],
  options: { fromOpponent?: boolean; rateeUserId?: string } = {},
): LevelCheckAnswer => ({
  raterUserId,
  rateeUserId: options.rateeUserId ?? "ratee",
  band,
  fromOpponent: options.fromOpponent ?? true,
});

const verdictOf = (
  ballots: readonly LevelCheckAnswer[],
  weights: ReadonlyMap<string, number>,
) => levelCheckVerdicts(ballots, weights).get("ratee");

const noHistory = new Map<string, readonly (number | null)[]>();

describe("levelCheckRaterWeights", () => {
  it("halves a Provisional rater, so two confirmed raters on one band settle it", () => {
    const ballots = [
      ballot("confirmed-1", "C"),
      ballot("confirmed-2", "C", { fromOpponent: false }),
      ballot("provisional", "A"),
    ];
    const weights = levelCheckRaterWeights(ballots, {
      provisionalRaterIds: new Set(["provisional"]),
      previousDistances: noHistory,
    });
    expect(weights.get("provisional")).toBe(0.5);
    expect(weights.get("confirmed-1")).toBe(1);
    expect(verdictOf(ballots, weights)).toEqual({
      kind: "verdict",
      level: 3.15,
      bands: ["C"],
      ballotsCounted: 3,
    });
  });

  it("splits one confirmed rater against two Provisional raters evenly, at the mean of the two middles", () => {
    const ballots = [
      ballot("confirmed", "C"),
      ballot("provisional-1", "B", { fromOpponent: false }),
      ballot("provisional-2", "B"),
    ];
    const weights = levelCheckRaterWeights(ballots, {
      provisionalRaterIds: new Set(["provisional-1", "provisional-2"]),
      previousDistances: noHistory,
    });
    const verdict = verdictOf(ballots, weights);
    expect(verdict?.kind).toBe("verdict");
    expect(verdict?.kind === "verdict" && verdict.level).toBeCloseTo(
      (3.15 + 5.25) / 2,
      10,
    );
    expect(verdict?.ballotsCounted).toBe(3);
  });

  it("halves a rater far from the verdicts in this Match and each of their previous two", () => {
    const ballots = [
      ballot("steady-1", "C"),
      ballot("steady-2", "C", { fromOpponent: false }),
      ballot("far", "A"),
    ];
    const weights = levelCheckRaterWeights(ballots, {
      provisionalRaterIds: new Set(),
      previousDistances: new Map([["far", [2, 1.6, 0]]]),
    });
    expect(weights.get("far")).toBe(0.5);
    expect(weights.get("steady-1")).toBe(1);
  });

  it("weighs a rater who is Provisional and an outlier 0.25", () => {
    const weights = levelCheckRaterWeights(
      [
        ballot("steady-1", "C"),
        ballot("steady-2", "C", { fromOpponent: false }),
        ballot("far", "D"),
      ],
      {
        provisionalRaterIds: new Set(["far"]),
        previousDistances: new Map([["far", [3, 2]]]),
      },
    );
    expect(weights.get("far")).toBe(0.25);
  });

  it("never halves a rater with fewer than two earlier Matches, one close Match among them or no verdict in one", () => {
    const ballots = [
      ballot("steady-1", "C"),
      ballot("steady-2", "C", { fromOpponent: false }),
      ballot("new", "A"),
      ballot("close-once", "A"),
      ballot("unsettled", "A"),
    ];
    const weights = levelCheckRaterWeights(ballots, {
      provisionalRaterIds: new Set(),
      previousDistances: new Map([
        ["new", [4]],
        ["close-once", [4, 1.5]],
        ["unsettled", [4, null]],
      ]),
    });
    expect(weights.get("new")).toBe(1);
    expect(weights.get("close-once")).toBe(1);
    expect(weights.get("unsettled")).toBe(1);
  });

  it("never halves a rater exactly 1.5 bands from this Match's verdicts", () => {
    const on = (rateeUserId: string) => [
      ballot("steady-1", "C", { rateeUserId }),
      ballot("steady-2", "C", { rateeUserId, fromOpponent: false }),
    ];
    const ballots = [
      ...on("ratee"),
      ballot("edge", "C+", { rateeUserId: "ratee" }),
      ...on("other"),
      ballot("edge", "B-", { rateeUserId: "other" }),
    ];
    expect(
      levelCheckRaterDistances(
        ballots,
        new Map([
          ["ratee", 3.15],
          ["other", 3.15],
        ]),
      ).get("edge"),
    ).toBe(1.5);
    const weights = levelCheckRaterWeights(ballots, {
      provisionalRaterIds: new Set(),
      previousDistances: new Map([["edge", [2, 2]]]),
    });
    expect(weights.get("edge")).toBe(1);
  });

  it("counts answers, not weights, for the two-answer minimum and the opponent rule", () => {
    const weights = new Map([
      ["a", 0.25],
      ["b", 0.25],
    ]);
    expect(
      verdictOf([ballot("a", "C"), ballot("b", "C")], weights),
    ).toMatchObject({ kind: "verdict", ballotsCounted: 2 });
    expect(
      verdictOf(
        [
          ballot("a", "C", { fromOpponent: false }),
          ballot("b", "C", { fromOpponent: false }),
        ],
        new Map(),
      ),
    ).toEqual({ kind: "no_opponent", ballotsCounted: 2 });
    expect(verdictOf([ballot("a", "C")], new Map())).toEqual({
      kind: "too_few",
      ballotsCounted: 1,
    });
  });
});

describe("levelCheckRaterDistances", () => {
  it("measures in display bands, a split verdict counting as halfway", () => {
    const fromC = (verdictLevel: number) =>
      levelCheckRaterDistances(
        [ballot("rater", "C")],
        new Map([["ratee", verdictLevel]]),
      ).get("rater");
    expect(fromC(0.7)).toBe(3);
    expect(fromC(3.15)).toBe(0);
    expect(fromC((0.7 + 3.15) / 2)).toBe(1.5);
    expect(fromC(3.5)).toBe(0.5);
    expect(
      fromC(
        levelCheckVerdictLevel(levelCheckVerdictHundredths((0.7 + 3.15) / 2)),
      ),
    ).toBe(1.5);
    expect(
      levelCheckRaterDistances(
        [
          ballot("rater", "A"),
          ballot("rater", "D", { rateeUserId: "other" }),
          ballot("rater", "C", { rateeUserId: "unsettled" }),
        ],
        new Map([
          ["ratee", 3.15],
          ["other", (0.7 + 3.15) / 2],
        ]),
      ),
    ).toEqual(new Map([["rater", (5 + 1.5) / 2]]));
  });
});

describe("levelCheckStep", () => {
  const oneBandUp = muFromLevel(3.85) - muFromLevel(3.15);

  it.each([
    [250, 0.5],
    [150, 0.2647],
    [100, 0.1379],
  ])(
    "moves a player at φ %d by their share of a one-band gap",
    (phi, share) => {
      const step = levelCheckStep(atC(phi), on(3.85), 1);
      expect(step.agreed).toBe(false);
      expect((step.mu - atC(phi).mu) / oneBandUp).toBeCloseTo(share, 3);
    },
  );

  it("never moves more than 0.35 Level", () => {
    const step = levelCheckStep(atC(350), on(6.65), 1);
    expect(step.mu - atC(350).mu).toBe(LEVEL_CHECK_CAP_MU);
    const down = levelCheckStep(atC(350), on(0.7), 1);
    expect(down.mu - atC(350).mu).toBe(-LEVEL_CHECK_CAP_MU);
  });

  it("halves every move on a weight 0.5 Game, the cap included", () => {
    for (const phi of [250, 150, 100]) {
      const whole = levelCheckStep(atC(phi), on(3.85), 1);
      const half = levelCheckStep(atC(phi), on(3.85), 0.5);
      expect(half.mu - atC(phi).mu).toBeCloseTo(
        (whole.mu - atC(phi).mu) / 2,
        10,
      );
      expect(half.phi - phi).toBeCloseTo((whole.phi - phi) / 2, 10);
    }
    expect(levelCheckStep(atC(350), on(6.65), 0.5).mu - atC(350).mu).toBe(
      LEVEL_CHECK_CAP_MU / 2,
    );
  });

  it("leaves μ where it is and lowers φ on a verdict at the shown band", () => {
    const step = levelCheckStep(
      { ...atC(250), mu: muFromLevel(3.4) },
      on(3.15),
      1,
    );
    expect(step).toMatchObject({
      agreed: true,
      mu: muFromLevel(3.4),
      levelBand: "C2",
    });
    expect(step.phi).toBeLessThan(250);
  });

  it("agrees with either band of a split verdict, though its Level reads as one of them", () => {
    const split = levelCheckVerdict([opponent("C"), partner("C+")]);
    if (split.kind !== "verdict") {
      throw new Error("Expected a verdict");
    }
    expect(split.bands).toEqual(["C", "C+"]);
    expect(levelCheckVerdictBand(split.level)).toBe("C+");
    const atCPlus = {
      mu: muFromLevel(3.85),
      phi: 250,
      levelBand: "C1" as const,
    };
    for (const state of [atC(250), atCPlus]) {
      const step = levelCheckStep(state, split, 1);
      expect(step).toMatchObject({
        agreed: true,
        mu: state.mu,
        levelBand: state.levelBand,
      });
      expect(step.phi).toBeLessThan(250);
    }
  });

  it("agrees with a split across two bands that are not neighbours, whose Level reads as the band between", () => {
    const split = levelCheckVerdict([opponent("D+"), partner("C")]);
    if (split.kind !== "verdict") {
      throw new Error("Expected a verdict");
    }
    expect(levelCheckVerdictBand(split.level)).toBe("C-");
    expect(levelCheckStep(atC(250), split, 1).agreed).toBe(true);
    const atCMinus = {
      mu: muFromLevel(2.45),
      phi: 250,
      levelBand: "C3" as const,
    };
    const between = levelCheckStep(atCMinus, split, 1);
    expect(between.agreed).toBe(false);
    expect(between.mu).toBeCloseTo(atCMinus.mu, 8);
  });

  it("moves a player whose band is on neither side of a split", () => {
    const split = levelCheckVerdict([opponent("C+"), partner("B-")]);
    if (split.kind !== "verdict") {
      throw new Error("Expected a verdict");
    }
    const step = levelCheckStep(atC(250), split, 1);
    expect(step.agreed).toBe(false);
    expect(step.mu).toBeGreaterThan(atC(250).mu);
  });

  it.each([
    [350, 203],
    [250, 177],
    [200, 156],
    [150, 129],
    [100, 93],
  ])("narrows φ %d to about %d", (phi, after) => {
    expect(Math.round(levelCheckStep(atC(phi), on(3.85), 1).phi)).toBe(after);
  });

  it("moves the Level band only past the hysteresis", () => {
    const below = levelCheckStep(atC(250), on(3.85), 1);
    expect(below.levelBand).toBe("C2");
    const past = levelCheckStep(
      { mu: muFromLevel(3.45), phi: 350, levelBand: "C2" },
      on(5.25),
      1,
    );
    expect(past.levelBand).toBe("C1");
  });
});

describe("Rate the game's Level check", () => {
  const sheet: LevelCheckSheet = {
    players: [
      { userId: "b", name: "Badr", shownBand: "C" },
      { userId: "c", name: "Cyrus", shownBand: "D+" },
    ],
    answers: [{ userId: "c", band: "C-" }],
  };

  it("opens each row on the band the player shows and selects only what was answered", () => {
    const rows = levelCheckRows(sheet, levelCheckDraft(sheet), "en");
    const badr = rows.get("b")!;
    expect(badr.question).toBe("What level did Badr play at?");
    expect(badr.answer).toBeNull();
    expect(badr.cells).toHaveLength(9);
    expect(badr.cells.filter((cell) => cell.selected)).toEqual([]);
    expect(badr.cells.find((cell) => cell.now)?.band).toBe("C");
    expect(rows.get("c")!.answer).toBe("C-");
  });

  it("clears an answer picked twice and sends the whole set", () => {
    let draft = levelCheckDraft(sheet);
    draft = setLevelCheckAnswer(draft, "b", "B");
    draft = setLevelCheckAnswer(draft, "c", "C-");
    expect(levelCheckSubmission(draft, sheet)).toEqual([
      { userId: "b", band: "B" },
    ]);
  });

  it("reads in Arabic", () => {
    const rows = levelCheckRows(sheet, levelCheckDraft(sheet), "ar");
    expect(rows.get("b")!.question).toBe("بأي مستوى لعب Badr؟");
  });
});

describe("levelCheckResultView", () => {
  it("says where players placed the player and the Level either side", () => {
    expect(
      levelCheckResultView(
        {
          kind: "checked",
          agreed: false,
          verdictLevelHundredths: 315,
          muBefore: muFromLevel(2.45),
          muAfter: muFromLevel(2.61),
          ballotsCounted: 3,
        },
        "en",
      ),
    ).toEqual({
      title: "Level check",
      headline: "Players placed you at C",
      line: "Level 2.45 to 2.61.",
    });
  });

  it("says when players agreed, and why nothing settled", () => {
    expect(
      levelCheckResultView(
        {
          kind: "checked",
          agreed: true,
          verdictLevelHundredths: 315,
          muBefore: 1575,
          muAfter: 1575,
          ballotsCounted: 2,
        },
        "en",
      ).headline,
    ).toBe("Agreed with your level");
    expect(
      levelCheckResultView(
        {
          kind: "unsettled",
          reason: "too_few",
          ballotsReceived: 1,
          ballotsNeeded: 2,
        },
        "en",
      ).headline,
    ).toBe(
      "Only 1 player answered about your level, and it takes 2. Your level stays where it was.",
    );
    expect(
      levelCheckResultView(
        {
          kind: "unsettled",
          reason: "no_opponent",
          ballotsReceived: 2,
          ballotsNeeded: 2,
        },
        "ar",
      ).headline,
    ).toBe("لم يُجب أي خصم عن مستواك، ويلزم خصم واحد. يبقى مستواك كما كان.");
  });
});
