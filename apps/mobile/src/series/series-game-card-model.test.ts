import { messagesFor } from "@repo/i18n/messages";
import { describe, expect, it } from "vitest";

import { withSeriesFactRow } from "./series-fact-row";
import {
  seriesGameCardModel,
  type SeriesGameCardInput,
} from "./series-game-card-model";

function edition(
  overrides: Partial<SeriesGameCardInput> = {},
): SeriesGameCardInput {
  return {
    series: {
      id: "series-1",
      name: "Sunday Social",
      emblem: "cup",
      colour: "gold",
      groupName: "Tuesday Night Padel",
      endedAt: null,
    },
    edition: 12,
    rule: "table",
    state: "upcoming",
    lastWinners: null,
    canOpenSeries: true,
    ...overrides,
  };
}

describe("seriesGameCardModel", () => {
  it("says what winning the Edition takes and which Series to open", () => {
    expect(seriesGameCardModel(edition(), "en")).toEqual({
      emblem: "cup",
      colour: "gold",
      title: "Part of Sunday Social",
      rule: "Top of the table wins edition 12 and the badge.",
      spoken:
        "Part of Sunday Social. Top of the table wins edition 12 and the badge.",
      seriesId: "series-1",
    });
  });

  it("names who won the last Edition after the rule", () => {
    const model = seriesGameCardModel(
      edition({
        lastWinners: {
          edition: 11,
          winners: [{ name: "Layla Hasan" }, { name: "Nora Nasser" }],
          winnerBib: null,
        },
      }),
      "en",
    );
    expect(model?.rule).toBe(
      "Top of the table wins edition 12 and the badge. Layla H and Nora N won the last one.",
    );
    expect(model?.spoken).toContain("Part of Sunday Social.");
    expect(model?.spoken).toContain("Layla H and Nora N won the last one.");
  });

  it("reads each rule", () => {
    const rule = (value: SeriesGameCardInput["rule"]) =>
      seriesGameCardModel(edition({ rule: value }), "en")?.rule;
    expect(rule("side")).toBe(
      "Every player on the winning side gets the badge. A draw gives it to nobody.",
    );
    expect(rule("tables")).toBe(
      "Top of each group wins edition 12 and the badge.",
    );
    expect(rule("champion")).toBe(
      "The champion wins edition 12 and the badge.",
    );
    expect(rule("king")).toBe(
      "The king of the court wins edition 12 and the badge.",
    );
    expect(rule("americano")).toBe(
      "Top of the standings wins edition 12 and the badge.",
    );
  });

  it("opens nothing for a viewer who cannot view the Group", () => {
    expect(
      seriesGameCardModel(edition({ canOpenSeries: false }), "en")?.seriesId,
    ).toBeNull();
  });

  it("shows nothing once the Edition is decided, or with no Series", () => {
    expect(seriesGameCardModel(edition({ state: "won" }), "en")).toBeNull();
    expect(
      seriesGameCardModel(edition({ state: "no_winner" }), "en"),
    ).toBeNull();
    expect(seriesGameCardModel(null, "en")).toBeNull();
    expect(seriesGameCardModel(undefined, "en")).toBeNull();
  });

  it("keeps Latin digits in Arabic", () => {
    const model = seriesGameCardModel(edition(), "ar");
    expect(model?.rule).toContain("12");
    expect(model?.spoken).toContain("12");
  });
});

describe("withSeriesFactRow", () => {
  const en = messagesFor("en");
  const rows = [
    { label: "Organizer", value: "Hassan Haji" },
    { label: "Group", value: "Tuesday Night Padel" },
    { label: "Scores", value: "Either team enters" },
  ];
  const series = { name: "Sunday Social", edition: 12 };

  it("puts the Series row after the Group row", () => {
    expect(withSeriesFactRow(rows, "Group", series, en)).toEqual([
      rows[0],
      rows[1],
      { label: "Series", value: "Sunday Social, edition 12" },
      rows[2],
    ]);
  });

  it("adds it at the end when there is no Group row", () => {
    expect(withSeriesFactRow(rows, "Venue", series, en).at(-1)).toEqual({
      label: "Series",
      value: "Sunday Social, edition 12",
    });
  });

  it("leaves the facts alone without a Series", () => {
    expect(withSeriesFactRow(rows, "Group", null, en)).toEqual(rows);
  });
});
