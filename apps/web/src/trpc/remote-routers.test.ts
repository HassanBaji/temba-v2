import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { isRemoteProcedure, REMOTE_ROUTERS } from "./remote-routers";

describe("isRemoteProcedure", () => {
  it("sends every router to the API", () => {
    expect(REMOTE_ROUTERS).toEqual([
      "venues",
      "teams",
      "communities",
      "groups",
      "ratings",
      "users",
      "games",
    ]);
    expect(isRemoteProcedure("venues.list")).toBe(true);
    expect(isRemoteProcedure("teams.list")).toBe(true);
    expect(isRemoteProcedure("communities.list")).toBe(true);
    expect(isRemoteProcedure("groups.mine")).toBe(true);
    expect(isRemoteProcedure("users.home")).toBe(true);
    expect(isRemoteProcedure("games.listMyGames")).toBe(true);
    expect(isRemoteProcedure("ratings.me")).toBe(true);
  });

  it("lists every router of the root router", () => {
    const root = readFileSync(
      new URL("../../../../packages/api/src/root.ts", import.meta.url),
      "utf8",
    );
    const body = /createTRPCRouter\(\{([^}]*)\}\)/.exec(root)?.[1] ?? "";
    const names = [...body.matchAll(/^\s*(\w+):/gm)].map((m) => m[1]);
    expect(names.length).toBeGreaterThan(0);
    expect([...REMOTE_ROUTERS].sort()).toEqual([...names].sort());
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
