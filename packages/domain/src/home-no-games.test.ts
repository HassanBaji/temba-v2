import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { homeNoGamesCopy, homeNoGamesCreateAction } from "./home-no-games";

describe("homeNoGamesCreateAction", () => {
  it("sends every viewer to Create Group when they have no Group", () => {
    assert.deepEqual(
      homeNoGamesCreateAction({
        createGroupCount: 0,
        locale: "en",
      }),
      {
        kind: "group",
        target: { kind: "create-group" },
        label: "Create Group",
      },
    );
  });

  it("sends every viewer to the single Create route when they have a Group", () => {
    assert.deepEqual(
      homeNoGamesCreateAction({
        createGroupCount: 1,
        locale: "en",
      }),
      {
        kind: "game",
        target: { kind: "create-game" },
        label: "Create",
      },
    );
  });
});

describe("homeNoGamesCopy", () => {
  it("asks for a Group first when the viewer has none", () => {
    assert.equal(
      homeNoGamesCopy(
        {
          kind: "group",
          target: { kind: "create-group" },
          label: "Create Group",
        },
        "en",
      ),
      "Create a Group first, then you can create a Game.",
    );
  });

  it("points everyone else at browsing", () => {
    assert.equal(homeNoGamesCopy(null, "en"), "Browse available games.");
  });

  it("reads in Arabic", () => {
    assert.equal(homeNoGamesCopy(null, "ar"), "تصفّح الألعاب المتاحة.");
    assert.equal(
      homeNoGamesCreateAction({ createGroupCount: 0, locale: "ar" }).label,
      "إنشاء مجموعة",
    );
  });
});
