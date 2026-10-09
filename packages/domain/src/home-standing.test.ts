import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { homeStandingRowView } from "./home-standing";

describe("homeStandingRowView", () => {
  it("reads rank and field size from the Standing row", () => {
    assert.deepEqual(
      homeStandingRowView({
        groupId: "g1",
        groupName: "Weekday ladder",
        sport: "padel",
        position: 4,
        memberCount: 13,
      }),
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
    const view = homeStandingRowView({
      groupId: "g1",
      groupName: null,
      sport: " ",
      position: 1,
      memberCount: 2,
    });
    assert.equal(view.groupName, "Group");
    assert.equal(view.sportLabel, null);
  });

  it("passes through a sport it has no label for", () => {
    assert.equal(
      homeStandingRowView({
        groupId: "g1",
        groupName: "G",
        sport: "squash",
        position: 1,
        memberCount: 2,
      }).sportLabel,
      "squash",
    );
  });
});
