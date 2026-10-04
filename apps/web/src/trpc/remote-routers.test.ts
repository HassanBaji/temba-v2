import { describe, expect, it } from "vitest";

import { isRemoteProcedure, REMOTE_ROUTERS } from "./remote-routers";

describe("isRemoteProcedure", () => {
  it("sends venues, teams, communities and groups to the API", () => {
    expect(REMOTE_ROUTERS).toEqual([
      "venues",
      "teams",
      "communities",
      "groups",
    ]);
    expect(isRemoteProcedure("venues.list")).toBe(true);
    expect(isRemoteProcedure("teams.list")).toBe(true);
    expect(isRemoteProcedure("communities.list")).toBe(true);
    expect(isRemoteProcedure("groups.mine")).toBe(true);
  });

  it("keeps every other router in-process", () => {
    for (const path of ["users.home", "games.listMyGames", "ratings.me"]) {
      expect(isRemoteProcedure(path)).toBe(false);
    }
  });

  it("sends every procedure of a listed router to the API", () => {
    expect(isRemoteProcedure("venues.list", ["venues"])).toBe(true);
    expect(isRemoteProcedure("venues.admin.update", ["venues"])).toBe(true);
    expect(isRemoteProcedure("teams.list", ["venues"])).toBe(false);
  });

  it("matches the whole router name, not a prefix", () => {
    expect(isRemoteProcedure("venuesExtra.list", ["venues"])).toBe(false);
  });

  it("restores the in-process path once the router is removed", () => {
    expect(isRemoteProcedure("venues.list", ["venues"])).toBe(true);
    expect(isRemoteProcedure("venues.list", [])).toBe(false);
  });

  it("splits a batch mixing routers per router", () => {
    const batch = ["venues.list", "teams.list", "venues.get", "users.home"];
    const remote = batch.filter((p) => isRemoteProcedure(p, ["venues"]));
    const local = batch.filter((p) => !isRemoteProcedure(p, ["venues"]));
    expect(remote).toEqual(["venues.list", "venues.get"]);
    expect(local).toEqual(["teams.list", "users.home"]);
  });
});
