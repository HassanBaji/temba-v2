import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { memberLensKey, readMemberLens, writeMemberLens } from "./member-lens";

describe("member lens", () => {
  beforeEach(() => {
    const items = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => items.get(key) ?? null,
        setItem: (key: string, value: string) => items.set(key, value),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads nothing for a Group never sorted", () => {
    expect(readMemberLens("g1")).toEqual({ sort: null, filter: null });
  });

  it("remembers the sort and filter per Group", () => {
    writeMemberLens("g1", { sort: "joined", filter: "inactive" });
    expect(readMemberLens("g1")).toEqual({
      sort: "joined",
      filter: "inactive",
    });
    expect(readMemberLens("g2")).toEqual({ sort: null, filter: null });
  });

  it("drops values it does not know", () => {
    window.localStorage.setItem(
      memberLensKey("g1"),
      JSON.stringify({ sort: "wins", filter: "active" }),
    );
    expect(readMemberLens("g1")).toEqual({ sort: null, filter: "active" });
    window.localStorage.setItem(memberLensKey("g1"), "{");
    expect(readMemberLens("g1")).toEqual({ sort: null, filter: null });
  });
});

describe("member lens without storage", () => {
  it("reads the default and forgets writes on the server", () => {
    writeMemberLens("g1", { sort: "name", filter: "all" });
    expect(readMemberLens("g1")).toEqual({ sort: null, filter: null });
  });
});
