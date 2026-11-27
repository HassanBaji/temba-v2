import { messagesFor } from "@repo/i18n/messages";
import { describe, expect, it } from "vitest";

import { withSeriesFactRow } from "./series-fact-row";

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
