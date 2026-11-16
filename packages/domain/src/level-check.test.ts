import { describe, expect, it } from "vitest";

import { muFromLevel } from "./level";
import {
  LEVEL_CHECK_CAP_MU,
  levelCheckDraft,
  levelCheckResultView,
  levelCheckRows,
  levelCheckStep,
  levelCheckSubmission,
  levelCheckVerdict,
  setLevelCheckAnswer,
  type LevelCheckPick,
  type LevelCheckSheet,
} from "./level-check";

const partner = (band: LevelCheckPick["band"]): LevelCheckPick => ({
  band,
  fromOpponent: false,
});
const opponent = (band: LevelCheckPick["band"]): LevelCheckPick => ({
  band,
  fromOpponent: true,
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
    ).toEqual({ kind: "verdict", level: 2.45, ballotsCounted: 3 });
  });

  it("reads D at the middle of 0.0 to 1.4", () => {
    expect(levelCheckVerdict([opponent("D"), opponent("D")])).toMatchObject({
      level: 0.7,
    });
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
      const step = levelCheckStep(atC(phi), 3.85, 1);
      expect(step.agreed).toBe(false);
      expect((step.mu - atC(phi).mu) / oneBandUp).toBeCloseTo(share, 3);
    },
  );

  it("never moves more than 0.35 Level", () => {
    const step = levelCheckStep(atC(350), 6.65, 1);
    expect(step.mu - atC(350).mu).toBe(LEVEL_CHECK_CAP_MU);
    const down = levelCheckStep(atC(350), 0.7, 1);
    expect(down.mu - atC(350).mu).toBe(-LEVEL_CHECK_CAP_MU);
  });

  it("halves every move on a weight 0.5 Game, the cap included", () => {
    for (const phi of [250, 150, 100]) {
      const whole = levelCheckStep(atC(phi), 3.85, 1);
      const half = levelCheckStep(atC(phi), 3.85, 0.5);
      expect(half.mu - atC(phi).mu).toBeCloseTo(
        (whole.mu - atC(phi).mu) / 2,
        10,
      );
      expect(half.phi - phi).toBeCloseTo((whole.phi - phi) / 2, 10);
    }
    expect(levelCheckStep(atC(350), 6.65, 0.5).mu - atC(350).mu).toBe(
      LEVEL_CHECK_CAP_MU / 2,
    );
  });

  it("leaves μ where it is and lowers φ on a verdict at the shown band", () => {
    const step = levelCheckStep({ ...atC(250), mu: muFromLevel(3.4) }, 3.15, 1);
    expect(step).toMatchObject({
      agreed: true,
      mu: muFromLevel(3.4),
      levelBand: "C2",
    });
    expect(step.phi).toBeLessThan(250);
  });

  it.each([
    [350, 203],
    [250, 177],
    [200, 156],
    [150, 129],
    [100, 93],
  ])("narrows φ %d to about %d", (phi, after) => {
    expect(Math.round(levelCheckStep(atC(phi), 3.85, 1).phi)).toBe(after);
  });

  it("moves the Level band only past the hysteresis", () => {
    const below = levelCheckStep(atC(250), 3.85, 1);
    expect(below.levelBand).toBe("C2");
    const past = levelCheckStep(
      { mu: muFromLevel(3.45), phi: 350, levelBand: "C2" },
      5.25,
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
