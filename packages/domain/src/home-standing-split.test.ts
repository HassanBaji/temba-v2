import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { standingSplit } from "./home-standing";

describe("standingSplit", () => {
  it("lists only Groups with counted games and folds the rest into one row", () => {
    const split = standingSplit([
      {
        groupId: "a",
        groupName: "A",
        sport: "padel",
        position: 1,
        memberCount: 6,
      },
      {
        groupId: "b",
        groupName: "B",
        sport: "padel",
        position: null,
        memberCount: 4,
      },
      {
        groupId: "c",
        groupName: "C",
        sport: "padel",
        position: null,
        memberCount: 9,
      },
    ]);
    assert.deepEqual(
      split.counted.map((row) => row.groupId),
      ["a"],
    );
    assert.equal(split.uncounted, 2);
    assert.equal(split.total, 3);
  });
});
