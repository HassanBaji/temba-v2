import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { messagesFor } from "@repo/i18n/messages";

import {
  gameKickConfirmCopy,
  gameKickTarget,
  type GameKickRoster,
} from "./game-kick-confirm";
import { partnerRequiredUnseatPartnerConfirmCopy } from "./tournament-join";

const kick = messagesFor("en").game.kick;

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
    assert.deepEqual(gameKickTarget(roster, { userId: "user-ben" }, "en"), {
      kind: "player",
      userId: "user-ben",
      name: "Ben",
    });
  });

  it("falls back to the seat occupant's name", () => {
    assert.deepEqual(gameKickTarget(roster, { userId: "user-cara" }, "en"), {
      kind: "player",
      userId: "user-cara",
      name: "Cara",
    });
  });

  it("names a waitlist entry", () => {
    assert.deepEqual(gameKickTarget(roster, { waitlistId: "wait-1" }, "en"), {
      kind: "waitlist",
      waitlistId: "wait-1",
      name: "Dev",
    });
  });

  it("uses a generic name when the person is not on the roster", () => {
    assert.equal(
      gameKickTarget(roster, { userId: "user-gone" }, "en").name,
      "this player",
    );
    assert.equal(
      gameKickTarget(roster, { waitlistId: "wait-gone" }, "en").name,
      "this player",
    );
    assert.equal(
      gameKickTarget(roster, { userId: "user-gone" }, "ar").name,
      "هذا اللاعب",
    );
  });
});

describe("gameKickConfirmCopy", () => {
  const player = gameKickTarget(roster, { userId: "user-ana" }, "en");
  const waitlisted = gameKickTarget(roster, { waitlistId: "wait-1" }, "en");

  it("names the player and says their spot opens", () => {
    assert.deepEqual(
      gameKickConfirmCopy(
        player,
        { partnerRequired: false, drawPosted: false },
        "en",
      ),
      { title: "Kick Ana?", description: kick.spotConfirm },
    );
  });

  it("keeps the partner-required copy before the draw", () => {
    assert.deepEqual(
      gameKickConfirmCopy(
        player,
        { partnerRequired: true, drawPosted: false },
        "en",
      ),
      {
        title: "Kick Ana?",
        description: partnerRequiredUnseatPartnerConfirmCopy("en"),
      },
    );
  });

  it("says unplayed Matches are cancelled after the draw", () => {
    for (const partnerRequired of [true, false]) {
      assert.equal(
        gameKickConfirmCopy(player, { partnerRequired, drawPosted: true }, "en")
          .description,
        kick.afterDrawConfirm,
      );
    }
  });

  it("names the waitlist entry", () => {
    assert.deepEqual(
      gameKickConfirmCopy(
        waitlisted,
        { partnerRequired: true, drawPosted: false },
        "en",
      ),
      {
        title: "Kick Dev from the waitlist?",
        description: kick.waitlistConfirm,
      },
    );
  });

  it("asks in Arabic", () => {
    assert.deepEqual(
      gameKickConfirmCopy(
        waitlisted,
        { partnerRequired: false, drawPosted: false },
        "ar",
      ),
      {
        title: "إخراج Dev من قائمة الانتظار؟",
        description: "يفقد مكانه في قائمة الانتظار.",
      },
    );
  });
});
