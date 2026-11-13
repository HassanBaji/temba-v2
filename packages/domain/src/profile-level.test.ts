import assert from "node:assert/strict";
import { isolate } from "@repo/i18n/bidi";
import { describe, it } from "vitest";

import {
  confirmationFraction,
  confirmationProgressCaption,
  lastMatchMovement,
  profileLevelView,
} from "./profile-level";

describe("confirmationFraction", () => {
  it("is the share of the five confirming Matches already played", () => {
    assert.equal(confirmationFraction(2), 0.6);
    assert.equal(confirmationFraction(1), 0.8);
  });

  it("is 0 before the first confirming Match", () => {
    assert.equal(confirmationFraction(5), 0);
  });

  it("is 1 when no confirming Match remains", () => {
    assert.equal(confirmationFraction(0), 1);
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
      confirmationProgressCaption(2, "en"),
      "3 of about 5 rated games to confirm",
    );
  });

  it("counts out of five whatever else was played", () => {
    assert.equal(
      confirmationProgressCaption(5, "en"),
      "0 of about 5 rated games to confirm",
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
    const view = profileLevelView(base, "en");
    assert.equal(view.fillPercent, 16.4);
    assert.equal(view.caption, "16% of the way to C+");
    assert.equal(view.movement, "up");
    assert.equal(view.movementLabel, "Up after the last match");
    assert.equal(view.atTopBand, false);
  });

  it("fills a provisional bar from the confirmation fraction", () => {
    const view = profileLevelView(
      {
        ...base,
        provisional: true,
        ratedMatchCount: 3,
        ratedMatchesRemaining: 2,
      },
      "en",
    );
    assert.equal(view.fillPercent, 60);
    assert.equal(view.caption, "3 of about 5 rated games to confirm");
  });

  it("counts only the Matches that confirm, not every rated one", () => {
    const view = profileLevelView(
      {
        ...base,
        provisional: true,
        ratedMatchCount: 7,
        ratedMatchesRemaining: 3,
      },
      "en",
    );
    assert.equal(view.fillPercent, 40);
    assert.equal(view.caption, "2 of about 5 rated games to confirm");
  });

  it("reads an unrated football Level as the starting one", () => {
    const view = profileLevelView(
      {
        ...base,
        sport: "football",
        provisional: true,
        ratedMatchCount: 0,
        ratedMatchesRemaining: 5,
        history: ["3.1", "3.4"],
      },
      "en",
    );
    assert.equal(view.displayBand, "C");
    assert.equal(view.provisional, true);
    assert.equal(view.movement, null);
    assert.equal(view.fillPercent, 0);
    assert.equal(
      view.caption,
      "Starting Level. Games that count for Temba Level move it",
    );
  });

  it("reads a rated football Level like a padel one", () => {
    const view = profileLevelView({ ...base, sport: "football" }, "en");
    assert.equal(view.caption, "16% of the way to C+");
  });

  it("reads a football Level as OVR and a padel one as the Level", () => {
    assert.equal(
      profileLevelView(
        { ...base, sport: "football", ovr: 72, ratedMatchCount: 0 },
        "en",
      ).level,
      "72",
    );
    assert.equal(
      profileLevelView({ ...base, sport: "football", ovr: 74 }, "en").level,
      "74",
    );
    assert.equal(
      profileLevelView({ ...base, ovr: 74 }, "en").level,
      base.level,
    );
  });

  it("reads a padel Level from 1.00 to 7.00 with two decimals", () => {
    assert.equal(
      profileLevelView({ ...base, levelValue: 3.449 }, "en").level,
      "3.45",
    );
    assert.equal(
      profileLevelView({ ...base, levelValue: 0.35 }, "en").level,
      "1.00",
    );
    assert.equal(
      profileLevelView(
        { ...base, sport: "football", ovr: 74, levelValue: 4.02 },
        "en",
      ).level,
      "74",
    );
  });

  it("clamps the fill into 0 to 100", () => {
    assert.equal(
      profileLevelView({ ...base, progressPercent: 140 }, "en").fillPercent,
      100,
    );
    assert.equal(
      profileLevelView({ ...base, progressPercent: null }, "en").fillPercent,
      0,
    );
  });

  it("reads the captions in Arabic", () => {
    assert.equal(
      profileLevelView(base, "ar").caption,
      `16% نحو ${isolate("C+")}`,
    );
    assert.equal(
      confirmationProgressCaption(2, "ar"),
      "3 من 5 مباريات مصنّفة لتأكيد مستواك",
    );
    assert.equal(
      profileLevelView({ ...base, history: ["3.5", "3.1"] }, "ar")
        .movementLabel,
      "تراجع بعد آخر مباراة",
    );
  });

  it("marks a confirmed top band with no next rung", () => {
    const view = profileLevelView({ ...base, band: "A", history: [] }, "en");
    assert.equal(view.atTopBand, true);
    assert.equal(view.caption, "Top Level band");
    assert.equal(view.movement, null);
  });
});
