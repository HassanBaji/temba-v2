import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  ratingImpactChangeDirection,
  ratingImpactChangeMagnitude,
  ratingImpactStandingSentence,
  ratingImpactView,
  ratingScopeNotice,
  ratingScopeOf,
  ratingScopeTag,
  unratedLabel,
} from "./game-rating-impact";

describe("ratingImpactChangeMagnitude", () => {
  it("formats a drop as an unsigned one-decimal figure", () => {
    assert.equal(ratingImpactChangeMagnitude(-0.3), "0.3");
  });

  it("formats a rise as an unsigned one-decimal figure", () => {
    assert.equal(ratingImpactChangeMagnitude(0.3), "0.3");
  });

  it("formats no change as 0.0", () => {
    assert.equal(ratingImpactChangeMagnitude(0), "0.0");
  });
});

describe("ratingImpactChangeDirection", () => {
  it("reads a positive change as up", () => {
    assert.equal(ratingImpactChangeDirection(0.2), "up");
  });

  it("reads a negative change as down", () => {
    assert.equal(ratingImpactChangeDirection(-0.2), "down");
  });

  it("reads zero as flat", () => {
    assert.equal(ratingImpactChangeDirection(0), "flat");
  });
});

describe("ratingImpactStandingSentence", () => {
  it("uses 'about' and 'confirms', never a hard promise, while Provisional", () => {
    const sentence = ratingImpactStandingSentence({
      newLevelBand: "C2",
      isProvisional: true,
      ratedMatchesRemainingToConfirm: 4,
      locale: "en",
    });
    assert.equal(
      sentence,
      "Still C. About 4 more rated games and your level confirms.",
    );
  });

  it("uses singular 'game' when exactly one remains", () => {
    const sentence = ratingImpactStandingSentence({
      newLevelBand: "C2",
      isProvisional: true,
      ratedMatchesRemainingToConfirm: 1,
      locale: "en",
    });
    assert.match(sentence, /1 more rated game and/);
  });

  it("floors a missing remaining-count at 1 rather than reading '0 more'", () => {
    const sentence = ratingImpactStandingSentence({
      newLevelBand: "D1",
      isProvisional: true,
      ratedMatchesRemainingToConfirm: null,
      locale: "en",
    });
    assert.match(sentence, /1 more rated game and/);
  });

  it("never says 'locks in' once confirmed", () => {
    const sentence = ratingImpactStandingSentence({
      newLevelBand: "B1",
      isProvisional: false,
      ratedMatchesRemainingToConfirm: null,
      locale: "en",
    });
    assert.doesNotMatch(sentence, /locks in/i);
    assert.match(sentence, /confirmed/i);
  });

  it("renders the display-remapped band label, not the raw stored band", () => {
    const sentence = ratingImpactStandingSentence({
      newLevelBand: "D2",
      isProvisional: false,
      ratedMatchesRemainingToConfirm: null,
      locale: "en",
    });
    assert.match(sentence, /^Still D\. /);
  });
});

describe("ratingImpactView", () => {
  const base = {
    levelChange: 0.2,
    newLevel: 3.6,
    newLevelBand: "C2" as const,
    isProvisional: false,
    ratedMatchesRemainingToConfirm: null,
  };

  it("reads a rise with an unsigned magnitude and the new Level", () => {
    const view = ratingImpactView(base, "en");
    assert.equal(view.direction, "up");
    assert.equal(view.magnitude, "0.2");
    assert.equal(view.newLevelLabel, "3.6");
    assert.equal(view.directionText, "Level increased by 0.2");
  });

  it("reads the change in Arabic", () => {
    const view = ratingImpactView(
      { ...base, isProvisional: true, ratedMatchesRemainingToConfirm: 2 },
      "ar",
    );
    assert.equal(view.directionText, "ارتفع المستوى بمقدار 0.2");
    assert.equal(
      view.sentence,
      "ما زلت C. نحو مباراتين مصنّفتين أخريين ويتأكد مستواك.",
    );
  });

  it("reads a drop and no change in words", () => {
    assert.equal(
      ratingImpactView({ ...base, levelChange: -0.4 }, "en").directionText,
      "Level decreased by 0.4",
    );
    assert.equal(
      ratingImpactView({ ...base, levelChange: 0 }, "en").directionText,
      "Level unchanged",
    );
  });

  it("uses the Provisional sentence while the Level is unconfirmed", () => {
    assert.match(
      ratingImpactView(
        {
          ...base,
          isProvisional: true,
          ratedMatchesRemainingToConfirm: 3,
        },
        "en",
      ).sentence,
      /About 3 more rated games/,
    );
  });
});

describe("unratedLabel", () => {
  it("is the user-facing word for an Unrated Game", () => {
    assert.equal(unratedLabel("en"), "Unrated");
  });
});

describe("ratingScopeOf", () => {
  it("reads the scope, falling back to rated when an endpoint has none", () => {
    assert.equal(
      ratingScopeOf({ rated: false, ratingScope: "group" }),
      "group",
    );
    assert.equal(ratingScopeOf({ rated: true }), "temba");
    assert.equal(ratingScopeOf({ rated: false }), "unrated");
  });
});

describe("ratingScopeTag", () => {
  it("tags every Game that is not Temba rated with its scope", () => {
    assert.equal(
      ratingScopeTag({ rated: true, ratingScope: "temba" }, "en"),
      null,
    );
    assert.equal(
      ratingScopeTag({ rated: false, ratingScope: "group" }, "en"),
      "Counts for group rating",
    );
    assert.equal(
      ratingScopeTag({ rated: false, ratingScope: "unrated" }, "en"),
      "Unrated",
    );
    assert.equal(ratingScopeTag({ rated: false }, "en"), "Unrated");
  });

  it("tags a football group scope as the group tier", () => {
    assert.equal(
      ratingScopeTag(
        { rated: false, ratingScope: "group", sport: "football" },
        "en",
      ),
      "Counts for group tier",
    );
  });
});

describe("ratingScopeNotice", () => {
  it("explains a group rated or Unrated Game and stays out of a Temba one", () => {
    assert.equal(ratingScopeNotice("temba", "en"), null);
    assert.deepEqual(ratingScopeNotice("group", "en"), {
      title: "Counts for group rating",
      line: "Moves levels in this group only. Temba levels move in verified groups.",
    });
    assert.deepEqual(ratingScopeNotice("unrated", "en"), {
      title: "Unrated",
      line: "This Game doesn't change anyone's Level.",
    });
  });

  it("explains a football group scope as tier points", () => {
    assert.deepEqual(ratingScopeNotice("group", "en", "football"), {
      title: "Counts for group tier",
      line: "Moves tier points in this group only. Temba levels move in verified groups.",
    });
  });
});
