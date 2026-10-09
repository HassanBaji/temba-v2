import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  gameHomeIntentFromQuery,
  gameHomeIntentHref,
  gameHomeTabFromQuery,
  gameHomeTabQuery,
} from "./game-home-tab";

describe("gameHomeTabFromQuery", () => {
  it("opens Results when tab=results", () => {
    assert.equal(gameHomeTabFromQuery("results"), "results");
  });

  it("opens Players when tab=players", () => {
    assert.equal(gameHomeTabFromQuery("players"), "players");
  });

  it("defaults to Overview otherwise", () => {
    assert.equal(gameHomeTabFromQuery(undefined), "overview");
    assert.equal(gameHomeTabFromQuery(null), "overview");
    assert.equal(gameHomeTabFromQuery(""), "overview");
    assert.equal(gameHomeTabFromQuery("overview"), "overview");
    assert.equal(gameHomeTabFromQuery("score"), "overview");
  });
});

describe("gameHomeTabQuery", () => {
  it("omits the query for Overview", () => {
    assert.equal(gameHomeTabQuery("overview"), "");
  });

  it("writes tab for Players and Results", () => {
    assert.equal(gameHomeTabQuery("players"), "?tab=players");
    assert.equal(gameHomeTabQuery("results"), "?tab=results");
  });
});

describe("gameHomeIntentFromQuery", () => {
  it("reads the invite and results intents", () => {
    assert.equal(gameHomeIntentFromQuery("invite"), "invite");
    assert.equal(gameHomeIntentFromQuery("results"), "results");
  });

  it("ignores anything else", () => {
    assert.equal(gameHomeIntentFromQuery(undefined), null);
    assert.equal(gameHomeIntentFromQuery(""), null);
    assert.equal(gameHomeIntentFromQuery("edit"), null);
  });
});

describe("gameHomeIntentHref", () => {
  it("links to the game with the intent in the query", () => {
    assert.equal(
      gameHomeIntentHref("g1", "invite"),
      "/dashboard/games/g1?intent=invite",
    );
    assert.equal(
      gameHomeIntentHref("g1", "results"),
      "/dashboard/games/g1?intent=results",
    );
  });
});
