import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { sizeFriendlyTournament } from "./tournament-sizing";
import { viewerTournamentTotalCents } from "./tournament-price";

describe("viewerTournamentTotalCents", () => {
  it("multiplies the per-player price by an even field's Matches per Game team", () => {
    const result = sizeFriendlyTournament(12, 3);
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    assert.equal(result.sizing.uneven, false);
    assert.equal(result.sizing.matchesPerTeamMin, 3);
    assert.equal(viewerTournamentTotalCents(10000, 3), 30000);
  });

  it("uses the viewer's own smaller Pool, not the maximum", () => {
    const result = sizeFriendlyTournament(10, 3);
    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }
    assert.equal(result.sizing.uneven, true);
    assert.equal(result.sizing.matchesPerTeamMax, 3);
    assert.equal(result.sizing.matchesPerTeamMin, 2);
    assert.equal(
      viewerTournamentTotalCents(10000, result.sizing.matchesPerTeamMin),
      20000,
    );
    assert.notEqual(
      viewerTournamentTotalCents(10000, result.sizing.matchesPerTeamMin),
      viewerTournamentTotalCents(10000, result.sizing.matchesPerTeamMax),
    );
  });

  it("is null when the price is unset", () => {
    assert.equal(viewerTournamentTotalCents(null, 3), null);
    assert.equal(viewerTournamentTotalCents(undefined, 3), null);
  });
});
