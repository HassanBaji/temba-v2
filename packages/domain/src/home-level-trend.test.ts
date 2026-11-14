import assert from "node:assert/strict";
import { isolate } from "@repo/i18n/bidi";
import { describe, it } from "vitest";

import { homeTrendView } from "./home-level-trend";

const box = { width: 100, height: 60, inset: 10 };

const base = {
  face: "level",
  history: ["2.90", "3.00", "2.80", "3.10"],
  historySteps: ["won", "lost", "won"],
  historyMatchCount: 3,
} as const;

describe("homeTrendView", () => {
  it("reads the change from the first point to the latest", () => {
    const view = homeTrendView(base, box, "en");
    assert.equal(view?.signedDelta, isolate("+0.20"));
    assert.equal(view?.from, "2.90");
    assert.equal(view?.to, "3.10");
    assert.equal(view?.window, "last 3 matches");
    assert.equal(view?.startLabel, "3 matches ago");
  });

  it("reads football in whole OVR points", () => {
    const view = homeTrendView(
      { ...base, face: "ovr", history: ["72", "73", "71", "74"] },
      box,
      "en",
    );
    assert.equal(view?.signedDelta, isolate("+2"));
    assert.equal(view?.from, "72");
    assert.equal(view?.to, "74");
  });

  it("marks each point by what moved the Level there", () => {
    const view = homeTrendView(base, box, "en");
    assert.deepEqual(
      view?.points.map((point) => point.kind),
      ["start", "won", "lost", "won"],
    );
  });

  it("spans the inset box, highest Level on top", () => {
    const points = homeTrendView(base, box, "en")?.points ?? [];
    assert.equal(points[0]?.x, 10);
    assert.equal(points.at(-1)?.x, 90);
    assert.equal(points.at(-1)?.y, 10);
    assert.equal(points[2]?.y, 50);
  });

  it("draws the baseline at the start Level", () => {
    const view = homeTrendView(base, box, "en");
    assert.equal(view?.baselineY, view?.points[0]?.y);
  });

  it("names only the marks that appear, in a fixed order", () => {
    assert.equal(
      homeTrendView(base, box, "en")?.legend,
      "solid won, open lost",
    );
    assert.equal(
      homeTrendView(
        { ...base, historySteps: ["drawn", "lost", "won"] },
        box,
        "en",
      )?.legend,
      "solid won, half drawn, open lost",
    );
  });

  it("counts changes, not matches, once a Level set is in the line", () => {
    const view = homeTrendView(
      { ...base, historySteps: ["won", "set", "won"], historyMatchCount: 2 },
      box,
      "en",
    );
    assert.equal(view?.startLabel, "3 changes ago");
    assert.equal(view?.window, "last 2 matches");
  });

  it("centres a flat line", () => {
    const view = homeTrendView(
      {
        ...base,
        history: ["3.00", "3.00"],
        historySteps: ["drawn"],
        historyMatchCount: 1,
      },
      box,
      "en",
    );
    assert.deepEqual(
      view?.points.map((point) => point.y),
      [30, 30],
    );
  });

  it("is null before a Rated Match has moved the Level", () => {
    assert.equal(
      homeTrendView(
        { ...base, history: ["3.00"], historySteps: [], historyMatchCount: 0 },
        box,
        "en",
      ),
      null,
    );
    assert.equal(
      homeTrendView(
        {
          ...base,
          history: ["3.00", "4.00"],
          historySteps: ["set"],
          historyMatchCount: 0,
        },
        box,
        "en",
      ),
      null,
    );
  });

  it("is null when the steps do not match the points", () => {
    assert.equal(
      homeTrendView({ ...base, historySteps: ["won"] }, box, "en"),
      null,
    );
  });
});
