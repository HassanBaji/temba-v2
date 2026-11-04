import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { homeStandingRowView } from "./home-standing";

describe("homeStandingRowView", () => {
  it("reads rank and field size from the Standing row", () => {
    assert.deepEqual(
      homeStandingRowView(
        {
          groupId: "g1",
          groupName: "Weekday ladder",
          sport: "padel",
          position: 4,
          memberCount: 13,
        },
        "en",
      ),
      {
        groupId: "g1",
        groupName: "Weekday ladder",
        sportLabel: "Padel",
        rank: "#4",
        ofCount: "of 13",
      },
    );
  });

  it("falls back for a missing name and hides a blank sport", () => {
    const view = homeStandingRowView(
      {
        groupId: "g1",
        groupName: null,
        sport: " ",
        position: 1,
        memberCount: 2,
      },
      "en",
    );
    assert.equal(view.groupName, "Group");
    assert.equal(view.sportLabel, null);
  });

  it("passes through a sport it has no label for", () => {
    assert.equal(
      homeStandingRowView(
        {
          groupId: "g1",
          groupName: "G",
          sport: "squash",
          position: 1,
          memberCount: 2,
        },
        "en",
      ).sportLabel,
      "squash",
    );
  });

  it("shows a dash instead of a rank before any counted Match", () => {
    const row = {
      groupId: "g1",
      groupName: "G",
      sport: "padel",
      position: null,
      memberCount: 8,
    };
    assert.deepEqual(
      [
        homeStandingRowView(row, "en").rank,
        homeStandingRowView(row, "en").ofCount,
      ],
      ["—", "No counted games yet"],
    );
    assert.equal(
      homeStandingRowView(row, "ar").ofCount,
      "لا مباريات محتسبة بعد",
    );
  });

  it("reads the rank line in Arabic", () => {
    const view = homeStandingRowView(
      {
        groupId: "g1",
        groupName: null,
        sport: null,
        position: 4,
        memberCount: 13,
      },
      "ar",
    );
    assert.equal(view.groupName, "مجموعة");
    assert.equal(view.ofCount, "من 13");
  });
});
