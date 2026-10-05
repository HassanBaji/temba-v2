import { describe, expect, it } from "vitest";

import { mediaUrl } from "./media-url";

const ORIGIN = "https://api.example.com";

describe("mediaUrl", () => {
  it("resolves a stored relative path against the API origin", () => {
    expect(mediaUrl("/api/media/group-images/g1/image?v=3", ORIGIN)).toBe(
      "https://api.example.com/api/media/group-images/g1/image?v=3",
    );
  });

  it("does not double the slash when the origin ends with one", () => {
    expect(mediaUrl("/api/media/venue-logos/v1/logo", `${ORIGIN}/`)).toBe(
      "https://api.example.com/api/media/venue-logos/v1/logo",
    );
  });

  it("adds the missing leading slash", () => {
    expect(mediaUrl("api/media/x", ORIGIN)).toBe(
      "https://api.example.com/api/media/x",
    );
  });

  it("leaves an absolute URL alone", () => {
    expect(mediaUrl("https://img.clerk.com/a.png", ORIGIN)).toBe(
      "https://img.clerk.com/a.png",
    );
    expect(mediaUrl("data:image/png;base64,AAAA", ORIGIN)).toBe(
      "data:image/png;base64,AAAA",
    );
  });

  it("returns null when there is no image", () => {
    expect(mediaUrl(null, ORIGIN)).toBeNull();
    expect(mediaUrl(undefined, ORIGIN)).toBeNull();
    expect(mediaUrl("", ORIGIN)).toBeNull();
  });
});
