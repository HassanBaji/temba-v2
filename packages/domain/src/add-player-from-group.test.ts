import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  groupAddActionLabel,
  groupAddedToast,
  groupMemberFootballDefaults,
  groupMemberRows,
  groupPickedNames,
  groupSpotsLine,
  toggleGroupMemberPick,
  type GroupMemberToAdd,
} from "./add-player-from-group";

function member(
  userId: string,
  name: string,
  extra: Partial<GroupMemberToAdd> = {},
): GroupMemberToAdd {
  return {
    userId,
    name,
    levelBand: null,
    footballRole: null,
    footballPosition: null,
    status: null,
    ...extra,
  };
}

const members = [
  member("yk", "Yousif Khalil", { status: "in_game", footballPosition: "fwd" }),
  member("ma", "Mohamed Alawi", { footballRole: "keeper", levelBand: "C2" }),
  member("ha", "Hamad Al Sayed", { footballPosition: "mid" }),
];

describe("groupMemberRows", () => {
  it("lists members who can still be added before those already in", () => {
    const rows = groupMemberRows(
      { members, query: "", picked: [], openSpots: 4, isFootball: true },
      "en",
    );
    assert.deepEqual(
      rows.map((row) => [row.userId, row.meta, row.status]),
      [
        ["ma", "Goalkeeper · Level C", null],
        ["ha", "Midfielder", null],
        ["yk", "Forward", "In game"],
      ],
    );
  });

  it("filters by name, ignoring case", () => {
    const rows = groupMemberRows(
      { members, query: " hamad ", picked: [], openSpots: 4, isFootball: true },
      "en",
    );
    assert.deepEqual(
      rows.map((row) => row.userId),
      ["ha"],
    );
  });

  it("drops the role from a picked row and blocks the rest once spots run out", () => {
    const rows = groupMemberRows(
      { members, query: "", picked: ["ma"], openSpots: 1, isFootball: true },
      "en",
    );
    const byId = new Map(rows.map((row) => [row.userId, row]));
    assert.equal(byId.get("ma")?.meta, "Level C");
    assert.equal(byId.get("ma")?.selected, true);
    assert.equal(byId.get("ha")?.blocked, true);
    assert.equal(byId.get("ha")?.meta, "Midfielder · no spots left");
    assert.equal(byId.get("yk")?.blocked, false);
  });

  it("shows only the Level on a padel Game", () => {
    const rows = groupMemberRows(
      { members, query: "", picked: [], openSpots: 4, isFootball: false },
      "en",
    );
    assert.equal(rows[0]?.meta, "Level C");
    assert.equal(rows[1]?.meta, "");
  });
});

describe("groupMemberRows with Member nicknames", () => {
  const named = [
    member("an", "Ahmed Nasser", {
      footballRole: "keeper",
      nickname: { name: "Ahmed keeper", visibility: "approvers" },
    }),
    member("ab", "Ahmed Buhazza", {
      nickname: { name: "Abu Ali", visibility: "group" },
    }),
    member("sh", "Salman H"),
  ];

  it("leads with the nickname and keeps the Temba name on the second line", () => {
    const [row] = groupMemberRows(
      { members: named, query: "", picked: [], openSpots: 3, isFootball: true },
      "en",
    );
    assert.equal(row?.name, "Ahmed keeper");
    assert.equal(row?.isNickname, true);
    assert.equal(row?.tembaName, "Ahmed Nasser");
    assert.equal(row?.meta, "Ahmed Nasser · Goalkeeper");
  });

  it("finds a member by either name", () => {
    const rows = groupMemberRows(
      {
        members: named,
        query: "ahmed",
        picked: [],
        openSpots: 3,
        isFootball: false,
      },
      "en",
    );
    assert.deepEqual(
      rows.map((row) => row.userId),
      ["an", "ab"],
    );
  });

  it("names a nicknamed pick by the nickname", () => {
    assert.equal(
      groupPickedNames(named, ["an", "sh"], "en"),
      "Ahmed keeper, Salman",
    );
  });
});

describe("toggleGroupMemberPick", () => {
  it("adds up to the open spots and always removes", () => {
    assert.deepEqual(toggleGroupMemberPick([], "a", 1), ["a"]);
    assert.deepEqual(toggleGroupMemberPick(["a"], "b", 1), ["a"]);
    assert.deepEqual(toggleGroupMemberPick(["a"], "a", 1), []);
  });
});

describe("groupMemberFootballDefaults", () => {
  it("starts from the profile, else outfield with no preference", () => {
    assert.deepEqual(groupMemberFootballDefaults(members[1]!), {
      role: "keeper",
      position: "none",
    });
    assert.deepEqual(
      groupMemberFootballDefaults({
        footballRole: null,
        footballPosition: null,
      }),
      { role: "outfield", position: "none" },
    );
  });
});

describe("group add copy", () => {
  it("counts spots left against the open spots", () => {
    assert.equal(groupSpotsLine(4, 1, "en"), "3 of 4 spots left");
    assert.equal(groupSpotsLine(0, 0, "en"), "Game is full");
  });

  it("labels the action by how many are picked", () => {
    assert.equal(groupAddActionLabel(0, "en"), "Select players");
    assert.equal(groupAddActionLabel(1, "en"), "Add 1 player");
    assert.equal(groupAddActionLabel(3, "en"), "Add 3 players");
    assert.equal(groupAddActionLabel(2, "ar"), "إضافة لاعبَين");
  });

  it("names picks by first name in pick order", () => {
    assert.equal(
      groupPickedNames(members, ["ha", "ma"], "en"),
      "Hamad, Mohamed",
    );
    assert.equal(
      groupPickedNames(members, ["ha", "ma"], "ar"),
      "Hamad، Mohamed",
    );
  });

  it("names one added player and counts several", () => {
    assert.equal(groupAddedToast([{ name: "Hamad" }], "en"), "Hamad added");
    assert.equal(
      groupAddedToast([{ name: "A" }, { name: "B" }], "en"),
      "2 players added to the game",
    );
  });
});
