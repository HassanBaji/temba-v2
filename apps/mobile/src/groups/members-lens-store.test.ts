import { describe, expect, it } from "vitest";

import {
  memberLensKey,
  readMemberLens,
  writeMemberLens,
  type MemberLensStorage,
} from "./members-lens-store";

function memoryStorage(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial));
  const storage: MemberLensStorage = {
    getItem: async (key) => items.get(key) ?? null,
    setItem: async (key, value) => {
      items.set(key, value);
    },
  };
  return { storage, items };
}

describe("member lens store", () => {
  it("reads nothing for a Group never sorted", async () => {
    expect(await readMemberLens(memoryStorage().storage, "g1")).toEqual({
      sort: null,
      filter: null,
    });
  });

  it("remembers the sort and filter per Group", async () => {
    const { storage } = memoryStorage();
    await writeMemberLens(storage, "g1", { sort: "joined", filter: "active" });
    expect(await readMemberLens(storage, "g1")).toEqual({
      sort: "joined",
      filter: "active",
    });
    expect(await readMemberLens(storage, "g2")).toEqual({
      sort: null,
      filter: null,
    });
  });

  it("drops values it does not know", async () => {
    const { storage } = memoryStorage({
      [memberLensKey("g1")]: JSON.stringify({ sort: "wins", filter: "active" }),
    });
    expect(await readMemberLens(storage, "g1")).toEqual({
      sort: null,
      filter: "active",
    });
    const broken = memoryStorage({ [memberLensKey("g1")]: "{" }).storage;
    expect(await readMemberLens(broken, "g1")).toEqual({
      sort: null,
      filter: null,
    });
  });

  it("swallows storage failures", async () => {
    const failing: MemberLensStorage = {
      getItem: () => Promise.reject(new Error("no disk")),
      setItem: () => Promise.reject(new Error("no disk")),
    };
    await expect(
      writeMemberLens(failing, "g1", { sort: "name", filter: "all" }),
    ).resolves.toBeUndefined();
    expect(await readMemberLens(failing, "g1")).toEqual({
      sort: null,
      filter: null,
    });
  });
});
