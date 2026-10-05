import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  confirmationFraction,
  confirmationProgressCaption,
  lastMatchMovement,
  profileLevelView,
} from "./profile-level";

describe("confirmationFraction", () => {
  it("is rated matches over rated matches plus remaining", () => {
    assert.equal(confirmationFraction(13, 7), 0.65);
    assert.equal(confirmationFraction(1, 1), 0.5);
  });

  it("is 0 when no rated matches have been played", () => {
    assert.equal(confirmationFraction(0, 5), 0);
  });

  it("is 1 when no rated matches remain", () => {
    assert.equal(confirmationFraction(5, 0), 1);
  });

  it("does not clamp like Home plottedFraction", () => {
    assert.equal(confirmationFraction(1, 20), 1 / 21);
    assert.equal(confirmationFraction(8, 1), 8 / 9);
  });

  it("is 0 when both sides are 0", () => {
    assert.equal(confirmationFraction(0, 0), 0);
  });
});

describe("lastMatchMovement", () => {
  it("is omitted with fewer than two history points", () => {
    assert.equal(lastMatchMovement([]), null);
    assert.equal(lastMatchMovement(["3.4"]), null);
  });

  it("reads up, down, and held from the last two points", () => {
    assert.equal(lastMatchMovement(["3.4", "3.5"]), "up");
    assert.equal(lastMatchMovement(["3.5", "3.4"]), "down");
    assert.equal(lastMatchMovement(["3.4", "3.4"]), "held");
  });

  it("compares only the last two points at display precision", () => {
    assert.equal(lastMatchMovement(["3.0", "3.2", "3.1"]), "down");
    assert.equal(lastMatchMovement(["3.40", "3.4"]), "held");
  });
});

describe("confirmationProgressCaption", () => {
  it("says what the confirmation bar measures", () => {
    assert.equal(
      confirmationProgressCaption(3, 2),
      "3 of about 5 rated games to confirm",
    );
  });

  it("uses the singular when one rated game confirms", () => {
    assert.equal(
      confirmationProgressCaption(0, 1),
      "0 of about 1 rated game to confirm",
    );
  });
});

describe("profileLevelView", () => {
  const base = {
    band: "C2",
    level: "3.4",
    provisional: false,
    ratedMatchCount: 12,
    ratedMatchesRemaining: 0,
    progressPercent: 16.4,
    history: ["3.1", "3.4"],
  } as const;

  it("fills a confirmed bar from the progress towards the next band", () => {
    const view = profileLevelView(base);
    assert.equal(view.fillPercent, 16.4);
    assert.equal(view.caption, "16% of the way to C+");
    assert.equal(view.movement, "up");
    assert.equal(view.atTopBand, false);
  });

  it("fills a provisional bar from the confirmation fraction", () => {
    const view = profileLevelView({
      ...base,
      provisional: true,
      ratedMatchCount: 3,
      ratedMatchesRemaining: 2,
    });
    assert.equal(view.fillPercent, 60);
    assert.equal(view.caption, "3 of about 5 rated games to confirm");
  });

  it("clamps the fill into 0 to 100", () => {
    assert.equal(
      profileLevelView({ ...base, progressPercent: 140 }).fillPercent,
      100,
    );
    assert.equal(
      profileLevelView({ ...base, progressPercent: null }).fillPercent,
      0,
    );
  });

  it("marks a confirmed top band with no next rung", () => {
    const view = profileLevelView({ ...base, band: "A", history: [] });
    assert.equal(view.atTopBand, true);
    assert.equal(view.caption, "Top Level band");
    assert.equal(view.movement, null);
  });
});
