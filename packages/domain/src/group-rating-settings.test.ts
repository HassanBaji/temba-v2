import { describe, expect, it } from "vitest";

import {
  DEFAULT_GROUP_RATING_SETTINGS,
  isPerformanceRatingMode,
  isPerformanceWeight,
  PERFORMANCE_WEIGHTS,
  ratingSettingsChanged,
  ratingSettingsLine,
  ratingSettingsScreen,
  ratingSettingsSummary,
  type GroupRatingSettings,
} from "./group-rating-settings";

const everyone: GroupRatingSettings = {
  mode: "everyone",
  weightPercent: 30,
  organizerCountsDouble: false,
};

describe("weights and modes", () => {
  it("offers light, standard and heavy: 20, 30 and 50", () => {
    expect(PERFORMANCE_WEIGHTS).toEqual([20, 30, 50]);
    expect([20, 30, 50].every(isPerformanceWeight)).toBe(true);
    expect([0, 10, 25, 40, 100, 30.5].some(isPerformanceWeight)).toBe(false);
  });

  it("knows the three modes", () => {
    expect(
      ["off", "organizer", "everyone"].every(isPerformanceRatingMode),
    ).toBe(true);
    expect(isPerformanceRatingMode("admin")).toBe(false);
  });

  it("starts Off at the standard weight, nobody counted double", () => {
    expect(DEFAULT_GROUP_RATING_SETTINGS).toEqual({
      mode: "off",
      weightPercent: 30,
      organizerCountsDouble: false,
    });
  });
});

describe("ratingSettingsSummary (screen 3a)", () => {
  it("reads like the menu row", () => {
    expect(ratingSettingsSummary(everyone, "en")).toBe(
      "Everyone rates after a game, standard weight",
    );
    expect(
      ratingSettingsSummary(
        { ...everyone, mode: "organizer", weightPercent: 50 },
        "en",
      ),
    ).toBe("The organizer rates after a game, heavy weight");
    expect(ratingSettingsSummary(DEFAULT_GROUP_RATING_SETTINGS, "en")).toBe(
      "Off, only the result moves points",
    );
  });

  it("reads in Arabic", () => {
    expect(
      ratingSettingsSummary({ ...everyone, weightPercent: 20 }, "ar"),
    ).toBe("يقيّم الجميع بعد المباراة، بوزن خفيف");
  });
});

describe("ratingSettingsLine", () => {
  it("says results only while ratings are Off", () => {
    expect(ratingSettingsLine(DEFAULT_GROUP_RATING_SETTINGS, "en")).toBe(
      "Results only: tier points move on wins, draws and losses.",
    );
  });

  it("names the share of the move", () => {
    expect(
      ratingSettingsLine(
        { ...everyone, mode: "organizer", weightPercent: 20 },
        "en",
      ),
    ).toBe(
      "After each game the organizer rates every player, and that is 20% of the move.",
    );
    expect(ratingSettingsLine(everyone, "en")).toBe(
      "After each game everyone rates, and the average is 30% of the move.",
    );
    expect(
      ratingSettingsLine({ ...everyone, organizerCountsDouble: true }, "en"),
    ).toBe(
      "After each game everyone rates, and the average is 30% of the move, with the organizer counted twice.",
    );
  });

  it("ignores counting double unless everyone rates", () => {
    expect(
      ratingSettingsLine(
        { mode: "organizer", weightPercent: 30, organizerCountsDouble: true },
        "en",
      ),
    ).toBe(
      "After each game the organizer rates every player, and that is 30% of the move.",
    );
  });
});

describe("ratingSettingsScreen (screen 3b)", () => {
  it("shows only the modes while ratings are Off", () => {
    const screen = ratingSettingsScreen(DEFAULT_GROUP_RATING_SETTINGS, "en");
    expect(screen.modes.map((mode) => [mode.mode, mode.selected])).toEqual([
      ["off", true],
      ["organizer", false],
      ["everyone", false],
    ]);
    expect(screen.weight).toBeNull();
    expect(screen.fairness).toBeNull();
    expect(screen.footnote).toBe(
      "Results only: tier points move on wins, draws and losses. Changes apply from the next game.",
    );
  });

  it("splits the move between the result and how you played", () => {
    const screen = ratingSettingsScreen(
      { ...everyone, mode: "organizer", weightPercent: 50 },
      "en",
    );
    expect(screen.weight).toMatchObject({
      name: "heavy",
      resultPercent: "50%",
      performancePercent: "50%",
      resultFraction: 0.5,
      note: "Half and half. Playing well matters as much as winning; best with honest raters.",
    });
    expect(
      screen.weight?.options.map((option) => [option.label, option.selected]),
    ).toEqual([
      ["Light", false],
      ["Standard", false],
      ["Heavy", true],
    ]);
    expect(screen.fairness).toBeNull();
  });

  it("offers counting the organizer double when everyone rates", () => {
    const screen = ratingSettingsScreen(
      { ...everyone, weightPercent: 20, organizerCountsDouble: true },
      "en",
    );
    expect(screen.weight).toMatchObject({
      resultPercent: "80%",
      performancePercent: "20%",
      spoken: "80% the result, 20% how you played",
    });
    expect(screen.fairness).toMatchObject({
      countsDouble: "Organizer’s rating counts double",
      countsDoubleOn: true,
    });
    expect(screen.manualChanges.rows).toEqual([
      { label: "Who can adjust", value: "Organizers only" },
      { label: "Reason", value: "Always required" },
      { label: "Shown to the player", value: "Yes, in their history" },
    ]);
    expect(screen.footnote).toBe(
      "After each game everyone rates, and the average is 20% of the move, with the organizer counted twice. Changes apply from the next game.",
    );
  });

  it("reads in Arabic", () => {
    const screen = ratingSettingsScreen(everyone, "ar");
    expect(screen.title).toBe("إعدادات التقييم");
    expect(screen.weight?.name).toBe("عادي");
  });
});

describe("ratingSettingsChanged", () => {
  it("is false for the same settings and true for any difference", () => {
    expect(ratingSettingsChanged(everyone, { ...everyone })).toBe(false);
    expect(ratingSettingsChanged(everyone, { ...everyone, mode: "off" })).toBe(
      true,
    );
    expect(
      ratingSettingsChanged(everyone, { ...everyone, weightPercent: 50 }),
    ).toBe(true);
    expect(
      ratingSettingsChanged(everyone, {
        ...everyone,
        organizerCountsDouble: true,
      }),
    ).toBe(true);
  });
});
