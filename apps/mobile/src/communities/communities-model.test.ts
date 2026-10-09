import { describe, expect, it } from "vitest";

import { communityPath, newClubGroupPath } from "./communities-model";

describe("community paths", () => {
  it("opens a Community under its tab", () => {
    expect(communityPath("c1")).toBe("/communities/c1");
  });

  it("starts a Club Group inside the Community", () => {
    expect(newClubGroupPath("c1")).toBe("/groups/new?communityId=c1");
  });
});
