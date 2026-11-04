import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  noLinkableCommunityCopy,
  teamLinkCommunityPicker,
} from "./team-link-community-picker";

const live = { id: "c-live", archivedAt: null };
const archived = { id: "c-archived", archivedAt: new Date("2026-01-01") };

describe("teamLinkCommunityPicker", () => {
  it("is loading while the Communities load", () => {
    assert.deepEqual(
      teamLinkCommunityPicker({
        isLoading: true,
        isError: false,
        data: undefined,
      }),
      { status: "loading" },
    );
  });

  it("reports a load error instead of an empty list", () => {
    assert.deepEqual(
      teamLinkCommunityPicker({
        isLoading: false,
        isError: true,
        data: undefined,
      }),
      { status: "error" },
    );
  });

  it("is empty when the viewer has no live Community", () => {
    for (const data of [[], [archived]]) {
      assert.deepEqual(
        teamLinkCommunityPicker({ isLoading: false, isError: false, data }),
        { status: "empty" },
      );
    }
  });

  it("offers live Communities only", () => {
    assert.deepEqual(
      teamLinkCommunityPicker({
        isLoading: false,
        isError: false,
        data: [archived, live],
      }),
      { status: "ready", communities: [live] },
    );
  });
});

describe("noLinkableCommunityCopy", () => {
  it("reads in both languages", () => {
    assert.equal(
      noLinkableCommunityCopy("en"),
      "You're not in a Community that can link this Team.",
    );
    assert.equal(
      noLinkableCommunityCopy("ar"),
      "لست في مجتمع يمكنه ربط هذا الفريق.",
    );
  });
});
