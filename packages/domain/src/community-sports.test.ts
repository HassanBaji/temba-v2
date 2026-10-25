import { describe, expect, it } from "vitest";

import {
  clubGroupSportChoice,
  communitySportsView,
  toggleCommunitySport,
} from "./community-sports";

describe("communitySportsView", () => {
  it("lists offered sports and, for staff, the sports that can be added", () => {
    const view = communitySportsView(["padel"], true);
    expect(view.rows.map((row) => row.label)).toEqual(["Padel"]);
    expect(view.addable.map((row) => row.sport)).toEqual(["football"]);
    expect(view.canRemove).toBe(true);
  });

  it("offers no controls to a non-manager", () => {
    const view = communitySportsView(["football"], false);
    expect(view.rows.map((row) => row.sport)).toEqual(["football"]);
    expect(view.addable).toEqual([]);
    expect(view.canRemove).toBe(false);
  });
});

describe("toggleCommunitySport", () => {
  it("adds and removes a sport in catalog order", () => {
    expect(toggleCommunitySport(["football"], "padel")).toEqual([
      "padel",
      "football",
    ]);
    expect(toggleCommunitySport(["padel", "football"], "padel")).toEqual([
      "football",
    ]);
    expect(toggleCommunitySport(["padel"], "padel")).toEqual([]);
  });
});

describe("clubGroupSportChoice", () => {
  it("shows the picker only when the Community offers both sports", () => {
    expect(clubGroupSportChoice(["padel", "football"])).toMatchObject({
      showPicker: true,
      defaultSport: "padel",
    });
    expect(clubGroupSportChoice(["padel"]).showPicker).toBe(false);
  });

  it("submits the one offered sport silently", () => {
    expect(clubGroupSportChoice(["football"])).toMatchObject({
      showPicker: false,
      defaultSport: "football",
    });
  });
});
