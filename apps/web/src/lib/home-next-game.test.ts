import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { homeNextGameActions } from "./home-next-game";

describe("homeNextGameActions", () => {
  it("deep-links Add results to the results intent", () => {
    assert.deepEqual(
      homeNextGameActions({
        gameId: "g1",
        phase: "needs_results",
        hasOpenSeat: false,
      }),
      {
        primary: {
          href: "/dashboard/games/g1?intent=results",
          label: "Add results",
        },
        detailsHref: "/dashboard/games/g1",
      },
    );
  });

  it("deep-links Invite a player to the invite intent", () => {
    assert.deepEqual(
      homeNextGameActions({
        gameId: "g1",
        phase: "upcoming",
        hasOpenSeat: true,
      }),
      {
        primary: {
          href: "/dashboard/games/g1?intent=invite",
          label: "Invite a player",
        },
        detailsHref: "/dashboard/games/g1",
      },
    );
  });

  it("drops Details when View game already goes to the game", () => {
    for (const args of [
      { phase: "upcoming", hasOpenSeat: false },
      { phase: "ongoing", hasOpenSeat: true },
    ] as const) {
      assert.deepEqual(homeNextGameActions({ gameId: "g1", ...args }), {
        primary: { href: "/dashboard/games/g1", label: "View game" },
        detailsHref: null,
      });
    }
  });
});
