import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { friendlyTournamentCreateTarget } from "@repo/domain/create-game-flow";
import { createGameFlowHref } from "./create-game-flow-href";

describe("createGameFlowHref", () => {
  it("builds the create and tournament hrefs", () => {
    assert.equal(createGameFlowHref({}), "/dashboard/games/new");
    assert.equal(
      createGameFlowHref({
        groupId: "group-1",
        type: "friendly_game",
        step: 3,
      }),
      "/dashboard/games/new?groupId=group-1&type=friendly_game&step=3",
    );
    assert.equal(
      createGameFlowHref(friendlyTournamentCreateTarget("group 1")),
      "/dashboard/games/new?groupId=group+1&type=friendly_tournament",
    );
    assert.equal(
      createGameFlowHref(friendlyTournamentCreateTarget()),
      "/dashboard/games/new?type=friendly_tournament",
    );
  });
});
