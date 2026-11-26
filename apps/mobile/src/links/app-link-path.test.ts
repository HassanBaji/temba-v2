import { describe, expect, it } from "vitest";

import { appLinkPath } from "./app-link-path";

const id = "3f2b8c1e-9a4d-4e6b-8c2a-1d5e7f9a0b3c";

describe("appLinkPath", () => {
  it("opens the Game screen for the web Game page", () => {
    expect(appLinkPath(`https://temba.app/dashboard/games/${id}`)).toBe(
      `/games/${id}`,
    );
    expect(appLinkPath(`https://temba.app/dashboard/games/${id}/`)).toBe(
      `/games/${id}`,
    );
    expect(appLinkPath(`/dashboard/games/${id}`)).toBe(`/games/${id}`);
  });

  it("drops the query and the fragment", () => {
    expect(
      appLinkPath(`https://temba.app/dashboard/games/${id}?tab=board#top`),
    ).toBe(`/games/${id}`);
  });

  it("lower-cases the Game id", () => {
    expect(
      appLinkPath(`https://temba.app/dashboard/games/${id.toUpperCase()}`),
    ).toBe(`/games/${id}`);
  });

  it("has no screen for other web pages", () => {
    expect(appLinkPath("https://temba.app/dashboard/games/new")).toBeNull();
    expect(
      appLinkPath(`https://temba.app/dashboard/games/${id}/board`),
    ).toBeNull();
    expect(appLinkPath("https://temba.app/dashboard")).toBeNull();
    expect(appLinkPath(`/games/${id}`)).toBeNull();
    expect(appLinkPath("")).toBeNull();
  });
});
