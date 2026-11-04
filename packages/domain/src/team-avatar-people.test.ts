import { describe, expect, it } from "vitest";

import { teamAvatarPeople } from "./team-avatar-people";

describe("teamAvatarPeople", () => {
  it("uses real member name and image instead of splitting displayName", () => {
    expect(
      teamAvatarPeople(
        [
          { name: "Alex River", image: "https://img.clerk.com/alex.png" },
          { name: "Sam Lee", image: null },
        ],
        "en",
      ),
    ).toEqual([
      { name: "Alex River", image: "https://img.clerk.com/alex.png" },
      { name: "Sam Lee", image: null },
    ]);
  });

  it("does not invent a second person for an incomplete Team", () => {
    expect(
      teamAvatarPeople([{ name: "Alex River", image: null }], "en"),
    ).toEqual([{ name: "Alex River", image: null }]);
  });

  it("falls back to Member in the reader's language", () => {
    expect(teamAvatarPeople([{ name: "", image: null }], "en")).toEqual([
      { name: "Member", image: null },
    ]);
    expect(teamAvatarPeople([{ name: "", image: null }], "ar")).toEqual([
      { name: "عضو", image: null },
    ]);
  });
});
