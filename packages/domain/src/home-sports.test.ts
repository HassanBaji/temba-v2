import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { homeSport, homeSports } from "./home-sports";

describe("one sport or two", () => {
  it("shows only the sport on a one-sport profile", () => {
    assert.deepEqual(homeSports(["football"]), ["football"]);
    assert.deepEqual(homeSports(["padel"]), ["padel"]);
    assert.equal(homeSport(null, ["football"], "padel"), "football");
    assert.equal(homeSport("padel", ["football"], null), "football");
  });

  it("shows both sports when both are played, or none is picked yet", () => {
    assert.deepEqual(homeSports(["football", "padel"]), ["padel", "football"]);
    assert.deepEqual(homeSports([]), ["padel", "football"]);
    assert.deepEqual(homeSports(null), ["padel", "football"]);
  });

  it("opens on the sport of the next game until one is chosen", () => {
    const both = ["padel", "football"] as const;
    assert.equal(homeSport(null, both, "football"), "football");
    assert.equal(homeSport(null, both, null), "padel");
    assert.equal(homeSport("padel", both, "football"), "padel");
  });
});
