import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  outcomeForSlot,
  seatedUserSlotOnMatch,
  userSlotOnMatch,
} from "./match-slots";

const VIEWER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("userSlotOnMatch", () => {
  it("reads the slot the User's Game team sits on", () => {
    const match = { slot1GameTeamId: "team-1", slot2GameTeamId: "team-2" };
    assert.equal(userSlotOnMatch(match, new Set(["team-1"])), 1);
    assert.equal(userSlotOnMatch(match, new Set(["team-2"])), 2);
  });

  it("is null when the User sits on neither slot or on both", () => {
    const match = { slot1GameTeamId: "team-1", slot2GameTeamId: "team-2" };
    assert.equal(userSlotOnMatch(match, new Set(["team-3"])), null);
    assert.equal(userSlotOnMatch(match, new Set(["team-1", "team-2"])), null);
  });

  it("is null when a slot is unfilled", () => {
    assert.equal(
      userSlotOnMatch(
        { slot1GameTeamId: null, slot2GameTeamId: null },
        new Set(["team-1"]),
      ),
      null,
    );
  });
});

describe("seatedUserSlotOnMatch", () => {
  it("reads the slot the User is seated on", () => {
    const match = { slot1UserIds: [VIEWER], slot2UserIds: [OTHER] };
    assert.equal(seatedUserSlotOnMatch(match, VIEWER), 1);
    assert.equal(seatedUserSlotOnMatch(match, OTHER), 2);
  });

  it("is null when the User sits on neither slot or on both", () => {
    assert.equal(
      seatedUserSlotOnMatch({ slot1UserIds: [], slot2UserIds: [] }, VIEWER),
      null,
    );
    assert.equal(
      seatedUserSlotOnMatch(
        { slot1UserIds: [VIEWER], slot2UserIds: [VIEWER] },
        VIEWER,
      ),
      null,
    );
  });
});

describe("outcomeForSlot", () => {
  it("reads a decisive result from each slot", () => {
    assert.equal(outcomeForSlot(1, "slot1"), "won");
    assert.equal(outcomeForSlot(1, "slot2"), "lost");
    assert.equal(outcomeForSlot(2, "slot2"), "won");
    assert.equal(outcomeForSlot(2, "slot1"), "lost");
  });

  it("reads a draw as a draw and an unscored Match as no outcome", () => {
    assert.equal(outcomeForSlot(1, "draw"), "draw");
    assert.equal(outcomeForSlot(2, "none"), null);
  });
});
