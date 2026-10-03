import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  KICK_AFTER_DRAW_CONFIRM_COPY,
  KICK_FALLBACK_NAME,
  KICK_SPOT_CONFIRM_COPY,
  KICK_WAITLIST_CONFIRM_COPY,
  gameKickConfirmCopy,
  gameKickTarget,
  type GameKickRoster,
} from "./game-kick-confirm";
import { PARTNER_REQUIRED_UNSEAT_PARTNER_CONFIRM_COPY } from "./tournament-join";

const roster: GameKickRoster = {
  registeredPlayers: [
    { id: "user-ana", name: "Ana" },
    { id: "user-ben", name: "Ben" },
  ],
  sides: [
    {
      left: { userId: "user-ana", name: "Ana" },
      right: { userId: "user-cara", name: "Cara" },
    },
    { left: null, right: null },
  ],
  waitlist: [{ id: "wait-1", name: "Dev" }],
};

describe("gameKickTarget", () => {
  it("names a registered player", () => {
    assert.deepEqual(gameKickTarget(roster, { userId: "user-ben" }), {
      kind: "player",
      userId: "user-ben",
      name: "Ben",
    });
  });

  it("falls back to the seat occupant's name", () => {
    assert.deepEqual(gameKickTarget(roster, { userId: "user-cara" }), {
      kind: "player",
      userId: "user-cara",
      name: "Cara",
    });
  });

  it("names a waitlist entry", () => {
    assert.deepEqual(gameKickTarget(roster, { waitlistId: "wait-1" }), {
      kind: "waitlist",
      waitlistId: "wait-1",
      name: "Dev",
    });
  });

  it("uses a generic name when the person is not on the roster", () => {
    assert.equal(
      gameKickTarget(roster, { userId: "user-gone" }).name,
      KICK_FALLBACK_NAME,
    );
    assert.equal(
      gameKickTarget(roster, { waitlistId: "wait-gone" }).name,
      KICK_FALLBACK_NAME,
    );
  });
});

describe("gameKickConfirmCopy", () => {
  const player = gameKickTarget(roster, { userId: "user-ana" });
  const waitlisted = gameKickTarget(roster, { waitlistId: "wait-1" });

  it("names the player and says their spot opens", () => {
    assert.deepEqual(
      gameKickConfirmCopy(player, {
        partnerRequired: false,
        drawPosted: false,
      }),
      { title: "Kick Ana?", description: KICK_SPOT_CONFIRM_COPY },
    );
  });

  it("keeps the partner-required copy before the draw", () => {
    assert.deepEqual(
      gameKickConfirmCopy(player, { partnerRequired: true, drawPosted: false }),
      {
        title: "Kick Ana?",
        description: PARTNER_REQUIRED_UNSEAT_PARTNER_CONFIRM_COPY,
      },
    );
  });

  it("says unplayed Matches are cancelled after the draw", () => {
    for (const partnerRequired of [true, false]) {
      assert.equal(
        gameKickConfirmCopy(player, { partnerRequired, drawPosted: true })
          .description,
        KICK_AFTER_DRAW_CONFIRM_COPY,
      );
    }
  });

  it("names the waitlist entry", () => {
    assert.deepEqual(
      gameKickConfirmCopy(waitlisted, {
        partnerRequired: true,
        drawPosted: false,
      }),
      {
        title: "Kick Dev from the waitlist?",
        description: KICK_WAITLIST_CONFIRM_COPY,
      },
    );
  });
});
