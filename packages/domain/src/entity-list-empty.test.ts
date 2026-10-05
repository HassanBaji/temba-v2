import { describe, expect, it } from "vitest";

import { entityListIsEmpty } from "./entity-list-empty";

const loaded = { isLoading: false, error: null, count: 0 };
const noInvites = { isLoading: false, count: 0 };

describe("entityListIsEmpty", () => {
  it("is empty when the list loaded with no rows and no invite waits", () => {
    expect(entityListIsEmpty({ list: loaded, invites: noInvites })).toBe(true);
  });

  it("is not empty while the list fails", () => {
    expect(
      entityListIsEmpty({
        list: { ...loaded, error: new Error("boom") },
        invites: noInvites,
      }),
    ).toBe(false);
  });

  it("is not empty while either query is loading", () => {
    expect(
      entityListIsEmpty({
        list: { ...loaded, isLoading: true },
        invites: noInvites,
      }),
    ).toBe(false);
    expect(
      entityListIsEmpty({
        list: loaded,
        invites: { ...noInvites, isLoading: true },
      }),
    ).toBe(false);
  });

  it("is not empty with rows or pending invites", () => {
    expect(
      entityListIsEmpty({ list: { ...loaded, count: 2 }, invites: noInvites }),
    ).toBe(false);
    expect(
      entityListIsEmpty({ list: loaded, invites: { ...noInvites, count: 1 } }),
    ).toBe(false);
  });
});
