import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  ovrImpactView,
  ratingImpactChangeDirection,
  ratingImpactChangeMagnitude,
  ratingImpactStandingSentence,
  ratingImpactView,
  ratingScopeNotice,
  ratingScopeOf,
  ratingScopeTag,
  ovrMoveHeldAt,
  shownOvrParts,
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
  it("says exactly which Matches still confirm a padel Level while Provisional", () => {
    const sentence = ratingImpactStandingSentence({
      newLevelBand: "C2",
      isProvisional: true,
      ratedMatchesRemainingToConfirm: 4,
      sport: "padel",
      locale: "en",
    });
    assert.equal(
      sentence,
      "Still C. 4 more rated matches in a verified group and your level confirms.",
    );
  });

  it("uses the singular when exactly one remains", () => {
    const sentence = ratingImpactStandingSentence({
      newLevelBand: "C2",
      isProvisional: true,
      ratedMatchesRemainingToConfirm: 1,
      sport: "padel",
      locale: "en",
    });
    assert.match(sentence, /1 more rated match in a verified group and/);
  });

  it("counts verified Matches on football", () => {
    const sentence = ratingImpactStandingSentence({
      newLevelBand: "C2",
      isProvisional: true,
      ratedMatchesRemainingToConfirm: 2,
      sport: "football",
      locale: "en",
    });
    assert.equal(
      sentence,
      "Still C. 2 more verified matches and your level confirms.",
    );
  });

  it("floors a missing remaining-count at 1 rather than reading '0 more'", () => {
    const sentence = ratingImpactStandingSentence({
      newLevelBand: "D1",
      isProvisional: true,
      ratedMatchesRemainingToConfirm: null,
      sport: "padel",
      locale: "en",
    });
    assert.match(sentence, /1 more rated match in a verified group and/);
  });

  it("never says 'locks in' once confirmed", () => {
    const sentence = ratingImpactStandingSentence({
      newLevelBand: "B1",
      isProvisional: false,
      ratedMatchesRemainingToConfirm: null,
      sport: "padel",
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
      sport: "padel",
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
      "ما زلت C. مباراتان مصنّفتان أخريان في مجموعة موثّقة ويتأكد مستواك.",
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
      /3 more rated matches in a verified group/,
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
      "Did not count for Temba Level",
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

  it("tags a football Game that counts for Temba Level", () => {
    assert.equal(
      ratingScopeTag(
        { rated: true, ratingScope: "temba", sport: "football" },
        "en",
      ),
      "Counts for Temba Level",
    );
  });
});

describe("ratingScopeNotice", () => {
  it("explains a group rated or Unrated Game and stays out of a Temba one", () => {
    assert.equal(ratingScopeNotice("temba", "en"), null);
    assert.deepEqual(ratingScopeNotice("group", "en"), {
      title: "Did not count for Temba Level",
      line: "It counted for a group level, which padel no longer has. It moved no Temba Level.",
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

describe("ratingScopeNotice on a football Game that counts", () => {
  it("says it moves every player's OVR", () => {
    assert.deepEqual(ratingScopeNotice("temba", "en", "football"), {
      title: "Counts for Temba Level",
      line: "Moves every player’s OVR. A verified group has no group tier.",
    });
  });
});

describe("a Public Game's Rating scope", () => {
  it("is tagged as counting for Temba Level once both sides confirm", () => {
    assert.equal(
      ratingScopeTag(
        { rated: true, ratingScope: "temba", sport: "padel", publicGame: true },
        "en",
      ),
      "Counts for Temba Level",
    );
    assert.deepEqual(ratingScopeNotice("temba", "en", "padel", true), {
      title: "Counts for Temba Level",
      line: "Both sides confirm the score within 24 hours. If not, it stands and doesn’t count.",
    });
  });
});

describe("ovrImpactView", () => {
  const resultOnly = {
    ovr: {
      before: 74.2,
      after: 74.8,
      resultPart: 0.6,
      outcome: "won" as const,
      opponentAverage: 76.3,
      parts: { result: 0.6, performance: null, goals: null, mvp: null },
      rating: null,
      goals: null,
      mvp: "none" as const,
    },
    newLevelBand: "C1" as const,
    isProvisional: false,
    ratedMatchesRemainingToConfirm: null,
  };

  it("reads a Match counted on the result alone with one row and no footnote", () => {
    const view = ovrImpactView(resultOnly, "en");
    assert.equal(view.tag, "Counts for Temba Level");
    assert.equal(view.title, "What moved your OVR");
    assert.equal(view.aside, "74 to 75");
    assert.deepEqual(view.rows, [
      {
        title: "Result 40%",
        detail: "Won, against a side averaging 76",
        delta: "+0.6",
        spoken: "Result 40%, +0.6 OVR",
      },
    ]);
    assert.equal(view.total.title, "74.2 to 74.8");
    assert.equal(view.total.delta, "+0.6");
    assert.equal(view.footnote, null);
  });

  const fourParts = {
    ...resultOnly,
    ovr: {
      ...resultOnly.ovr,
      before: 74.2,
      after: 75.0,
      parts: { result: 0.6, performance: 0.3, goals: -0.1, mvp: 0 },
      rating: { hundredths: 780, ballots: 12 },
      goals: { scored: 1, conceded: 3 },
      mvp: "other" as const,
    },
  };

  it("reads screen 5a's four parts and the honest line", () => {
    const view = ovrImpactView(fourParts, "en");
    assert.deepEqual(
      view.rows.map((row) => [row.title, row.detail, row.delta]),
      [
        ["Result 40%", "Won, against a side averaging 76", "+0.6"],
        ["Player ratings 30%", "7.8 from 12 teammates and opponents", "+0.3"],
        [
          "Goals 20%",
          "1 scored, 3 conceded while you played. Conceded weighs more at the back",
          "−0.1",
        ],
        ["MVP 10%", "Not this time. Other marks don’t move OVR", "0"],
      ],
    );
    assert.equal(view.total.title, "74.2 to 75.0");
    assert.equal(view.total.delta, "+0.8");
    assert.match(view.footnote ?? "", /^Keeping ratings honest/);
  });

  it("says why a part is 0 without a rating and who was voted MVP", () => {
    const view = ovrImpactView(
      {
        ...fourParts,
        ovr: {
          ...fourParts.ovr,
          after: 75.2,
          parts: { result: 0.6, performance: 0, goals: -0.1, mvp: 0.5 },
          rating: null,
          mvp: "you",
        },
      },
      "en",
    );
    assert.equal(
      view.rows[1]?.detail,
      "Fewer than 3 ratings this time, so this part is 0",
    );
    assert.equal(view.rows[3]?.detail, "Voted MVP by the players");
    const none = ovrImpactView(
      { ...fourParts, ovr: { ...fourParts.ovr, mvp: "none" } },
      "en",
    );
    assert.equal(
      none.rows[3]?.detail,
      "No MVP was voted. Only a voted MVP moves OVR",
    );
  });

  it("shows parts that add up to the shown move", () => {
    const view = ovrImpactView(
      {
        ...fourParts,
        ovr: {
          ...fourParts.ovr,
          before: 70,
          after: 70.98,
          parts: { result: 0.64, performance: 0.34, goals: 0.04, mvp: -0.04 },
        },
      },
      "en",
    );
    const tenths = (delta: string) =>
      Math.round(Number(delta.replace("−", "-")) * 10);
    assert.equal(
      view.rows.reduce((sum, row) => sum + tenths(row.delta), 0),
      tenths(view.total.delta),
    );
  });

  it("reads a loss and the parts in Arabic", () => {
    const view = ovrImpactView(
      {
        ...fourParts,
        ovr: {
          ...fourParts.ovr,
          after: 73.6,
          resultPart: -0.6,
          outcome: "lost",
          parts: { result: -0.6, performance: 0, goals: 0, mvp: 0 },
        },
        isProvisional: true,
        ratedMatchesRemainingToConfirm: 3,
      },
      "ar",
    );
    assert.equal(view.rows[0]?.delta, "−0.6");
    assert.match(view.rows[0]?.detail ?? "", /خسارة/);
    assert.match(view.rows[1]?.title ?? "", /تقييمات اللاعبين/);
    assert.match(view.footnote ?? "", /نزيهة/);
  });
});

describe("ovrImpactView at the 40 floor and the 99 ceiling", () => {
  const base = {
    ovr: {
      before: 40.5,
      after: 40,
      resultPart: -1.2,
      outcome: "lost" as const,
      opponentAverage: 52,
      parts: { result: -1.2, performance: -1.8, goals: -1.2, mvp: -0.1 },
      rating: { hundredths: 410, ballots: 6 },
      goals: { scored: 0, conceded: 5 },
      mvp: "other" as const,
    },
    newLevelBand: "D3" as const,
    isProvisional: true,
    ratedMatchesRemainingToConfirm: 2,
  };
  const tenths = (delta: string) =>
    Math.round(Number(delta.replace("−", "-")) * 10);

  it("shows each part as earned and what the floor held back", () => {
    const view = ovrImpactView(base, "en");
    assert.deepEqual(
      view.rows.map((row) => [row.title, row.delta]),
      [
        ["Result 40%", "−1.2"],
        ["Player ratings 30%", "−1.8"],
        ["Goals 20%", "−1.2"],
        ["MVP 10%", "−0.1"],
        ["Held at 40", "+3.8"],
      ],
    );
    assert.equal(
      view.rows[4]?.detail,
      "OVR does not go below 40, so the rest of this drop was not taken",
    );
    assert.equal(view.rows[4]?.spoken, "Held at 40, +3.8 OVR");
    assert.equal(view.total.delta, "−0.5");
    assert.equal(
      view.rows.reduce((sum, row) => sum + tenths(row.delta), 0),
      tenths(view.total.delta),
    );
  });

  it("shows what the ceiling held back from a rise", () => {
    const view = ovrImpactView(
      {
        ...base,
        ovr: {
          ...base.ovr,
          before: 98.6,
          after: 99,
          resultPart: 0.9,
          outcome: "won",
          parts: { result: 0.9, performance: 0.3, goals: 0, mvp: 0.5 },
        },
      },
      "en",
    );
    assert.deepEqual(
      view.rows.map((row) => [row.title, row.delta]),
      [
        ["Result 40%", "+0.9"],
        ["Player ratings 30%", "+0.3"],
        ["Goals 20%", "0"],
        ["MVP 10%", "+0.5"],
        ["Held at 99", "−1.3"],
      ],
    );
    assert.equal(
      view.rows[4]?.detail,
      "OVR does not go above 99, so the rest of this rise was not added",
    );
    assert.equal(view.total.delta, "+0.4");
  });

  it("adds no held row to a move that reaches the floor without being cut", () => {
    const view = ovrImpactView(
      {
        ...base,
        ovr: {
          ...base.ovr,
          before: 40.6,
          parts: { result: -0.6, performance: 0, goals: 0, mvp: 0 },
        },
      },
      "en",
    );
    assert.deepEqual(
      view.rows.map((row) => row.delta),
      ["−0.6", "0", "0", "0"],
    );
  });

  it("reads the held row in Arabic", () => {
    const view = ovrImpactView(base, "ar");
    assert.match(view.rows[4]?.title ?? "", /ثابت عند/);
    assert.match(view.rows[4]?.detail ?? "", /لا ينزل/);
  });
});

describe("ovrMoveHeldAt", () => {
  const parts = { result: -1, performance: -1, goals: null, mvp: null };

  it("names the bound that cut the move", () => {
    assert.equal(ovrMoveHeldAt({ before: 41, after: 40, parts }), 40);
    assert.equal(
      ovrMoveHeldAt({
        before: 98,
        after: 99,
        parts: { ...parts, result: 2, performance: 1 },
      }),
      99,
    );
  });

  it("is null when the parts make the whole move, or the cut is under a tenth", () => {
    assert.equal(ovrMoveHeldAt({ before: 42, after: 40, parts }), null);
    assert.equal(ovrMoveHeldAt({ before: 41.97, after: 40, parts }), null);
    assert.equal(ovrMoveHeldAt({ before: 60, after: 58, parts }), null);
  });
});

describe("shownOvrParts", () => {
  it("rounds each part to a tenth and gives what rounding leaves to the largest part", () => {
    assert.deepEqual(shownOvrParts([0.62, 0.34], 0.96), [0.7, 0.3]);
    assert.deepEqual(
      shownOvrParts([0.6, 0.3, -0.1, 0], 0.8),
      [0.6, 0.3, -0.1, 0],
    );
  });

  it("never turns a part against its sign", () => {
    assert.deepEqual(
      shownOvrParts([0.04, -0.035, -0.035, -0.035], -0.065),
      [0, -0.1, 0, 0],
    );
    assert.deepEqual(
      shownOvrParts([0.05, 0.05, 0.05, 0.05], 0.2),
      [0, 0, 0.1, 0.1],
    );
  });

  it("always adds up to the move in tenths and keeps every sign", () => {
    let seed = 7;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let run = 0; run < 2000; run++) {
      const spread = run % 2 === 0 ? 3 : 0.3;
      const parts = Array.from({ length: 4 }, () => (random() - 0.5) * spread);
      const move = parts.reduce((sum, part) => sum + part, 0);
      const shown = shownOvrParts(parts, move);
      assert.equal(
        Math.round(shown.reduce((sum, part) => sum + part, 0) * 10) + 0,
        Math.round(move * 10) + 0,
      );
      shown.forEach((part, index) => {
        assert.ok(part * parts[index]! >= 0);
        assert.ok(Math.abs(part - parts[index]!) < 0.3);
      });
    }
  });
});
