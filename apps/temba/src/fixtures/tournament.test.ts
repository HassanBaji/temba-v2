import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { halfTeamsFromSides } from "~/lib/tournament-half-teams";
import { isTournamentStandingsView } from "~/lib/tournament-home";
import { hasDraftPoolDraw } from "~/lib/tournament-pool-draw";
import { isPoolTournament } from "~/lib/tournament-rounds";

import { createTournamentFixtures } from "./tournament";

describe("createTournamentFixtures", () => {
  const now = new Date("2026-09-20T12:00:00.000Z");
  const fixtures = createTournamentFixtures(now);

  it("covers the six preview states without a posted draw or a network field", () => {
    assert.equal(fixtures.preDrawWithoutSeat.drawPostedAt, null);
    assert.equal(fixtures.preDrawWithoutSeat.isSeated, false);
    assert.equal(fixtures.preDrawWithoutSeat.canRegister, true);
    assert.equal(fixtures.preDrawWithoutSeat.isOrganizer, false);

    const seated = fixtures.preDrawSeatedHalfOpen;
    const viewerSide = seated.sides.find(
      (side) =>
        side.left?.userId === seated.viewerUserId ||
        side.right?.userId === seated.viewerUserId,
    );
    assert.equal(seated.isSeated, true);
    assert.ok(viewerSide);
    assert.equal(
      (viewerSide?.left == null) !== (viewerSide?.right == null),
      true,
    );

    const mergeSides = fixtures.organizerTwoHalfTeams.sides;
    assert.equal(fixtures.organizerTwoHalfTeams.isOrganizer, true);
    assert.equal(halfTeamsFromSides(mergeSides).length, 2);

    assert.equal(fixtures.organizerDraftedDraw.drawPostedAt, null);
    assert.equal(
      hasDraftPoolDraw(fixtures.organizerDraftedDraw.gameTeams),
      true,
    );

    assert.equal(
      isTournamentStandingsView(fixtures.postedMid.drawPostedAt),
      true,
    );
    assert.equal(fixtures.postedMid.poolTables?.finished, false);

    assert.equal(fixtures.finished.poolTables?.finished, true);
    assert.ok(
      fixtures.finished.poolTables?.pools.some((pool) =>
        pool.rows.some((row) => row.isWinner),
      ),
    );
  });

  it("stays on Pool tournament chrome for every fixture", () => {
    for (const fixture of Object.values(fixtures)) {
      assert.equal(isPoolTournament(fixture.format, fixture.poolCount), true);
      assert.equal(fixture.poolCount, 3);
    }
  });
});
