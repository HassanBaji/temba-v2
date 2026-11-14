import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  filterGroupMembersByName,
  groupHomeBackTarget,
  groupHomeHasStandingResults,
  groupHomeMetaLine,
  groupHomeShowsMemberSearch,
  groupHomeSportLabel,
  groupMemberOrganizerAction,
  groupMemberOrganizerActionLabel,
  groupLevelFace,
  groupShowsLevel,
  groupStandingRecordLabel,
  levelCellView,
  viewerMayAdjustTier,
} from "./group-home-chrome";

describe("groupHomeBackTarget", () => {
  it("returns every Group home to the Groups index", () => {
    assert.deepEqual(groupHomeBackTarget("en"), {
      kind: "groups",
      label: "Back to Groups",
    });
  });
});

describe("groupHomeSportLabel", () => {
  it("maps padel and football to display labels", () => {
    assert.equal(groupHomeSportLabel("padel", "en"), "Padel");
    assert.equal(groupHomeSportLabel("football", "en"), "Football");
  });
});

describe("groupHomeMetaLine", () => {
  it("joins Sport, members, and the month the Group started when every part is present", () => {
    assert.equal(
      groupHomeMetaLine({
        sport: "padel",
        memberCount: 14,
        createdAt: new Date("2024-01-15T12:00:00Z"),
        locale: "en",
      }),
      "Padel, 14 members, since Jan",
    );
  });

  it("drops the Sport when the Group has none", () => {
    assert.equal(
      groupHomeMetaLine({
        sport: null,
        memberCount: 14,
        createdAt: new Date("2024-01-15T12:00:00Z"),
        locale: "en",
      }),
      "14 members, since Jan",
    );
  });

  it("drops the member count when it is missing", () => {
    assert.equal(
      groupHomeMetaLine({
        sport: "football",
        memberCount: null,
        createdAt: new Date("2024-09-15T12:00:00Z"),
        locale: "en",
      }),
      "Football, since Sep",
    );
  });

  it("pluralises a single member and drops the month with no createdAt", () => {
    assert.equal(
      groupHomeMetaLine({
        sport: "padel",
        memberCount: 1,
        createdAt: null,
        locale: "en",
      }),
      "Padel, 1 member",
    );
  });

  it("returns an empty string when nothing is known", () => {
    assert.equal(
      groupHomeMetaLine({
        sport: null,
        memberCount: null,
        createdAt: null,
        locale: "en",
      }),
      "",
    );
  });

  it("reads in Arabic", () => {
    assert.equal(
      groupHomeMetaLine({
        sport: "padel",
        memberCount: 1,
        createdAt: null,
        locale: "ar",
      }),
      "بادل، عضو واحد",
    );
  });

  it("names the month the Group started, not a Season, in Arabic", () => {
    assert.equal(
      groupHomeMetaLine({
        sport: "padel",
        memberCount: 5,
        createdAt: new Date("2026-09-15T12:00:00Z"),
        locale: "ar",
      }),
      "بادل، 5 أعضاء، منذ سبتمبر",
    );
  });
});

describe("groupHomeHasStandingResults", () => {
  it("is false when every member is still at zero", () => {
    assert.equal(groupHomeHasStandingResults([{ played: 0 }]), false);
  });

  it("is true when anyone has played", () => {
    assert.equal(groupHomeHasStandingResults([{ played: 1 }]), true);
  });
});

describe("filterGroupMembersByName", () => {
  const members = [{ name: "Ada" }, { name: "Lin" }, { name: "Ada Lovelace" }];

  it("filters the already-loaded list by name", () => {
    assert.deepEqual(filterGroupMembersByName(members, "ada"), [
      { name: "Ada" },
      { name: "Ada Lovelace" },
    ]);
  });

  it("returns everyone when the query is blank", () => {
    assert.deepEqual(filterGroupMembersByName(members, "  "), members);
  });
});

describe("groupHomeShowsMemberSearch", () => {
  it("shows search only when there are more than eight members", () => {
    assert.equal(groupHomeShowsMemberSearch(8), false);
    assert.equal(groupHomeShowsMemberSearch(9), true);
  });
});

describe("groupStandingRecordLabel", () => {
  it("draws the W-L pair, zero included", () => {
    assert.equal(groupStandingRecordLabel(18, 6), "18–6");
    assert.equal(groupStandingRecordLabel(0, 0), "0–0");
  });
});

describe("levelCellView", () => {
  it("shows the band label for a settled Rating", () => {
    assert.deepEqual(levelCellView("B3", false), {
      kind: "label",
      label: "B-",
    });
  });

  it("hatches a Provisional Rating and keeps its letter", () => {
    assert.deepEqual(levelCellView("B3", true), {
      kind: "provisional",
      label: "B-",
    });
  });

  it("hatches a missing Rating with no letter", () => {
    const bare = { kind: "provisional", label: null };
    assert.deepEqual(levelCellView(null, false), bare);
    assert.deepEqual(levelCellView(undefined, false), bare);
    assert.deepEqual(levelCellView(null, true), bare);
    assert.deepEqual(levelCellView(null, false, 72), bare);
  });

  it("gives the bare OVR with no band when the OVR is given", () => {
    assert.deepEqual(levelCellView("C1", false, 72.4), {
      kind: "label",
      label: "72",
    });
    assert.deepEqual(levelCellView("C3", true, 61), {
      kind: "provisional",
      label: "61",
    });
    assert.deepEqual(levelCellView("B3", false, null), {
      kind: "label",
      label: "B-",
    });
  });
});

describe("groupShowsLevel", () => {
  it("hides the Level on a tier Group only", () => {
    assert.equal(groupShowsLevel("football"), false);
    assert.equal(groupShowsLevel("football", false), false);
    assert.equal(groupShowsLevel("padel"), true);
    assert.equal(groupShowsLevel(null), true);
  });

  it("shows the Level on a Verified football Group", () => {
    assert.equal(groupShowsLevel("football", true), true);
    assert.equal(groupShowsLevel("padel", true), true);
  });
});

describe("groupLevelFace", () => {
  it("reads OVR on football and the Level elsewhere", () => {
    assert.equal(groupLevelFace("football"), "ovr");
    assert.equal(groupLevelFace("padel"), "level");
    assert.equal(groupLevelFace(null), "level");
  });
});

describe("groupMemberOrganizerAction", () => {
  const player = {
    isViewer: false,
    unclaimed: false,
    isOrganizer: false,
    isAppointedOrganizer: false,
  };

  it("offers to appoint a player and to dismiss an Appointed Organizer", () => {
    assert.equal(groupMemberOrganizerAction(player), "appoint");
    assert.equal(
      groupMemberOrganizerAction({
        ...player,
        isOrganizer: true,
        isAppointedOrganizer: true,
      }),
      "dismiss",
    );
    assert.equal(
      groupMemberOrganizerActionLabel("appoint", "en"),
      "Make Organizer",
    );
    assert.equal(
      groupMemberOrganizerActionLabel("dismiss", "en"),
      "Remove as Organizer",
    );
  });

  it("offers nothing for an Organizer by role, the viewer or an Unclaimed player", () => {
    assert.equal(
      groupMemberOrganizerAction({ ...player, isOrganizer: true }),
      null,
    );
    assert.equal(
      groupMemberOrganizerAction({ ...player, isViewer: true }),
      null,
    );
    assert.equal(
      groupMemberOrganizerAction({ ...player, unclaimed: true }),
      null,
    );
  });
});

describe("viewerMayAdjustTier", () => {
  it("lets an Organizer of a tier Group adjust Tier points", () => {
    const organizer = { isViewer: true, isOrganizer: true };
    const member = { isViewer: true, isOrganizer: false };
    assert.equal(
      viewerMayAdjustTier({ hasTier: true, leaderboard: [organizer] }),
      true,
    );
    assert.equal(
      viewerMayAdjustTier({ hasTier: true, leaderboard: [member] }),
      false,
    );
    assert.equal(
      viewerMayAdjustTier({ hasTier: false, leaderboard: [organizer] }),
      false,
    );
  });
});
