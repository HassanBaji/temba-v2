import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { halfTeamsFromSides } from "./tournament-half-teams";
import { isTournamentStandingsView } from "./tournament-home";
import { hasDraftPoolDraw } from "./tournament-pool-draw";
import { hasPools, isDrawnTournament } from "./tournament-rounds";

import {
  createKnockoutTournamentFixtures,
  createTournamentFixtures,
} from "./tournament-details-fixtures";
import {
  canCancelKnockoutPlace,
  hasDraftKnockoutDraw,
  knockoutChampion,
} from "./tournament-knockout-view";
import { tournamentOrganizerView } from "./tournament-organizer";

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
      assert.equal(
        isDrawnTournament(
          fixture.format,
          fixture.poolCount,
          fixture.tournamentShape,
        ),
        true,
      );
      assert.equal(hasPools(fixture.format, fixture.poolCount), true);
      assert.equal(fixture.poolCount, 3);
    }
  });
});

describe("createKnockoutTournamentFixtures", () => {
  const fixtures = createKnockoutTournamentFixtures(
    new Date("2026-09-20T12:00:00.000Z"),
  );

  it("names the rounds and shows Byes and a Walkover mid-tournament", () => {
    const rounds = fixtures.knockoutOnlyMid.knockout ?? [];
    assert.deepEqual(
      rounds.map((round) => round.name),
      ["Quarter-finals", "Semi-finals", "Final"],
    );
    const places = rounds.flatMap((round) => round.places);
    assert.equal(places.filter((place) => place.kind === "bye").length, 2);
    assert.equal(
      places.some((place) => place.kind === "match" && place.walkover != null),
      true,
    );
    assert.equal(knockoutChampion(rounds), null);
  });

  it("lets the viewer see a level Match that needs a deciding Set", () => {
    const places = (fixtures.knockoutOnlyMid.knockout ?? []).flatMap(
      (round) => round.places,
    );
    assert.equal(
      places.some((place) => place.kind === "match" && place.needsDecidingSet),
      true,
    );
    const level = fixtures.knockoutOnlyMid.matches.find(
      (match) => match.outcome.result === "draw",
    );
    assert.equal(level?.canScoreSets, true);
    assert.equal(level?.canComplete, false);
  });

  it("crowns the viewer's team once the Final is played", () => {
    const champion = knockoutChampion(fixtures.knockoutOnlyChampion.knockout);
    assert.equal(champion?.isViewer, true);
  });

  it("keeps Pool tables beside the Knockout for groups then knockout", () => {
    assert.equal(fixtures.groupsThenKnockout.poolTables?.finished, true);
    assert.equal((fixtures.groupsThenKnockout.knockout ?? []).length > 0, true);
    assert.equal(
      fixtures.groupsThenKnockoutNotThrough.poolTables?.viewerPoolIndex,
      1,
    );
  });

  it("gives the Organizer a drafted Knockout, a posted Knockout and a posted Pool", () => {
    const draft = fixtures.organizerKnockoutDraft;
    assert.equal(draft.isOrganizer, true);
    assert.equal(draft.drawPostedAt, null);
    assert.equal(hasDraftKnockoutDraw(draft.gameTeams), true);
    assert.equal(
      tournamentOrganizerView(draft, {
        drawn: false,
        partnerRequired: false,
      }).showDrawEntry,
      true,
    );

    const posted = fixtures.organizerKnockoutPosted;
    assert.equal(posted.canUndoDraw, true);
    const cancellable = (posted.knockout ?? [])
      .flatMap((round) => round.places)
      .filter(canCancelKnockoutPlace);
    assert.equal(cancellable.length > 0, true);

    assert.equal(fixtures.organizerGroupsThenKnockout.isOrganizer, true);
  });
});
