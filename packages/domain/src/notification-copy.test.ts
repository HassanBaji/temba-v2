import { bahrainDate } from "./bahrain-date.test-support";
import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  formatNotificationTime,
  invitesWaitingLabel,
  notificationCopy,
  type NotificationCopyInput,
  notificationMeta,
} from "./notification-copy";

const NOW = bahrainDate(2026, 9, 10, 9, 0, 0);

describe("notificationCopy", () => {
  it("renders a Group join for an admin with the actor and Group in bold", () => {
    assert.deepEqual(
      notificationCopy({
        type: "group_member_joined",
        audience: "admin",
        actor: { name: "Sara" },
        group: { name: "Night Crew" },
      }),
      {
        title: [
          { text: "Sara", strong: true },
          { text: " joined ", strong: false },
          { text: "Night Crew", strong: true },
        ],
        subline: null,
      },
    );
  });

  it("falls back to Someone for a deleted actor and Untitled Group for a nameless Group", () => {
    const copy = notificationCopy({
      type: "group_member_joined",
      audience: "admin",
      actor: null,
      group: { name: null },
    });
    assert.equal(
      copy?.title.map((part) => part.text).join(""),
      "Someone joined Untitled Group",
    );
  });

  it("returns null for a type or audience it does not know", () => {
    assert.equal(
      notificationCopy({
        type: "something_new",
        audience: "admin",
        actor: null,
        group: null,
      }),
      null,
    );
    assert.equal(
      notificationCopy({
        type: "group_member_joined",
        audience: "spectator",
        actor: null,
        group: null,
      }),
      null,
    );
  });
});

describe("notificationCopy for a Game join", () => {
  const game = {
    name: "Thursday Padel",
    format: "friendly_game",
    windowStart: bahrainDate(2026, 9, 8, 19, 0, 0),
  };

  function join(item: Partial<NotificationCopyInput>) {
    return notificationCopy({
      type: "game_player_joined",
      audience: "admin",
      actor: { name: "Sara" },
      group: { name: "Night Crew" },
      game,
      ...item,
    });
  }

  function titleText(item: Partial<NotificationCopyInput>) {
    return join(item)
      ?.title.map((part) => part.text)
      .join("");
  }

  it("names the User who joined and the Game in bold", () => {
    assert.deepEqual(join({}), {
      title: [
        { text: "Sara", strong: true },
        { text: " joined ", strong: false },
        { text: "Thursday Padel", strong: true },
      ],
      subline: null,
    });
  });

  it("names both Users of a pair", () => {
    assert.deepEqual(join({ partner: { name: "Omar" } })?.title, [
      { text: "Sara", strong: true },
      { text: " and ", strong: false },
      { text: "Omar", strong: true },
      { text: " joined ", strong: false },
      { text: "Thursday Padel", strong: true },
    ]);
  });

  it("names a Team instead of its members", () => {
    assert.equal(
      titleText({ partner: { name: "Omar" }, team: { name: "Smash Bros" } }),
      "Smash Bros joined Thursday Padel",
    );
  });

  it("names both members of an unnamed Team", () => {
    assert.equal(
      titleText({ partner: { name: "Omar" }, team: { name: null } }),
      "Sara and Omar joined Thursday Padel",
    );
  });

  it("says the User came off the Waitlist on a promotion", () => {
    assert.deepEqual(join({ viaWaitlist: true })?.title, [
      { text: "Sara", strong: true },
      { text: " came off the Waitlist into ", strong: false },
      { text: "Thursday Padel", strong: true },
    ]);
  });

  it("falls back to the format and day for a Game with no name", () => {
    assert.equal(
      titleText({ game: { ...game, name: null } }),
      "Sara joined Friendly game · Thu 8 Oct",
    );
    assert.equal(
      titleText({ game: { ...game, name: null, windowStart: null } }),
      "Sara joined Friendly game",
    );
  });

  it("falls back to Someone for a deleted actor", () => {
    assert.equal(titleText({ actor: null }), "Someone joined Thursday Padel");
  });

  it("returns null without a Game or for another audience", () => {
    assert.equal(join({ game: null }), null);
    assert.equal(join({ audience: "player" }), null);
  });
});

describe("notificationCopy for a Game leave", () => {
  const game = {
    name: "Thursday Padel",
    format: "friendly_tournament",
    windowStart: bahrainDate(2026, 9, 8, 19, 0, 0),
  };

  function left(item: Partial<NotificationCopyInput>) {
    return notificationCopy({
      type: "game_player_left",
      audience: "admin",
      actor: { name: "Sara" },
      group: { name: "Night Crew" },
      game,
      ...item,
    });
  }

  it("names the User who left and the Game in bold", () => {
    assert.deepEqual(left({}), {
      title: [
        { text: "Sara", strong: true },
        { text: " left ", strong: false },
        { text: "Thursday Padel", strong: true },
      ],
      subline: null,
    });
  });

  it("names the partner who was removed with the leaver", () => {
    assert.deepEqual(left({ partner: { name: "Omar" } })?.title, [
      { text: "Sara", strong: true },
      { text: " left ", strong: false },
      { text: "Thursday Padel", strong: true },
      { text: ". ", strong: false },
      { text: "Omar", strong: true },
      { text: " was removed with them", strong: false },
    ]);
  });

  it("falls back to Someone and to the format and day", () => {
    assert.equal(
      left({ actor: null, game: { ...game, name: null } })
        ?.title.map((part) => part.text)
        .join(""),
      "Someone left Friendly tournament · Thu 8 Oct",
    );
  });

  it("returns null without a Game or for another audience", () => {
    assert.equal(left({ game: null }), null);
    assert.equal(left({ audience: "player" }), null);
  });
});

describe("notificationCopy for a Finished Game", () => {
  const game = {
    name: "Thursday Padel",
    format: "friendly_tournament",
    windowStart: bahrainDate(2026, 9, 8, 19, 0, 0),
  };

  function finished(item: Partial<NotificationCopyInput>) {
    return notificationCopy({
      type: "game_finished",
      audience: "admin",
      actor: null,
      group: { name: "Night Crew" },
      game,
      ...item,
    });
  }

  it("tells an admin that every Match is in", () => {
    assert.deepEqual(finished({}), {
      title: [
        { text: "Thursday Padel", strong: true },
        { text: " has finished", strong: false },
      ],
      subline: "Every Match is in.",
    });
  });

  it("points a player to their results", () => {
    assert.deepEqual(finished({ audience: "player" }), {
      title: [
        { text: "Thursday Padel", strong: true },
        { text: " has finished", strong: false },
      ],
      subline: "See your results.",
    });
  });

  it("falls back to the format and day for a Game with no name", () => {
    assert.equal(
      finished({ game: { ...game, name: null, format: "friendly_game" } })
        ?.title.map((part) => part.text)
        .join(""),
      "Friendly game · Thu 8 Oct has finished",
    );
  });

  it("returns null without a Game or for an audience it does not know", () => {
    assert.equal(finished({ game: null }), null);
    assert.equal(finished({ audience: "spectator" }), null);
  });
});

describe("notificationCopy for a Level set", () => {
  function levelSet(item: Partial<NotificationCopyInput>) {
    return notificationCopy({
      type: "level_set",
      audience: "player",
      actor: { name: "Sara" },
      group: { name: "Night Crew" },
      levelSet: { level: "3.8", levelBand: "C1", reason: "back_from_injury" },
      ...item,
    });
  }

  it("names the setter, the letter and the Level, with the reason as the subline", () => {
    assert.deepEqual(levelSet({}), {
      title: [
        { text: "Sara", strong: true },
        { text: " set your Level to ", strong: false },
        { text: "C+ 3.8", strong: true },
      ],
      subline: "Back from injury",
    });
  });

  it("has no subline without a reason", () => {
    assert.equal(
      levelSet({ levelSet: { level: "4.6", levelBand: "B3", reason: null } })
        ?.subline,
      null,
    );
  });

  it("falls back to Someone for a deleted setter", () => {
    assert.equal(
      levelSet({ actor: null })
        ?.title.map((part) => part.text)
        .join(""),
      "Someone set your Level to C+ 3.8",
    );
  });

  it("never says rating, admin or notified", () => {
    const copy = levelSet({});
    const text = [
      ...(copy?.title.map((part) => part.text) ?? []),
      copy?.subline ?? "",
    ]
      .join(" ")
      .toLowerCase();
    for (const word of ["rating", "admin", "notified"]) {
      assert.equal(text.includes(word), false, word);
    }
  });

  it("returns null without the set or for an audience it does not know", () => {
    assert.equal(levelSet({ levelSet: null }), null);
    assert.equal(levelSet({ audience: "admin" }), null);
  });
});

describe("notificationMeta", () => {
  const createdAt = bahrainDate(2026, 9, 10, 8, 58, 0);

  it("adds the Group name for a Group Game", () => {
    assert.equal(
      notificationMeta(
        {
          createdAt,
          group: { name: "Night Crew" },
          game: { name: null, format: "americano", windowStart: null },
        },
        NOW,
      ),
      "2 min ago · Night Crew",
    );
  });

  it("is the time alone for a Group join or a groupless Game", () => {
    assert.equal(
      notificationMeta({ createdAt, group: { name: "Night Crew" } }, NOW),
      "2 min ago",
    );
    assert.equal(
      notificationMeta(
        {
          createdAt,
          group: null,
          game: { name: null, format: "americano", windowStart: null },
        },
        NOW,
      ),
      "2 min ago",
    );
  });
});

describe("formatNotificationTime", () => {
  it("says Just now under a minute", () => {
    assert.equal(
      formatNotificationTime(bahrainDate(2026, 9, 10, 8, 59, 30), NOW),
      "Just now",
    );
  });

  it("counts minutes within the hour", () => {
    assert.equal(
      formatNotificationTime(bahrainDate(2026, 9, 10, 8, 58, 0), NOW),
      "2 min ago",
    );
  });

  it("counts hours earlier the same product day", () => {
    assert.equal(
      formatNotificationTime(bahrainDate(2026, 9, 10, 5, 30, 0), NOW),
      "3 h ago",
    );
  });

  it("says Yesterday for the previous product day, even under 24 hours ago", () => {
    assert.equal(
      formatNotificationTime(bahrainDate(2026, 9, 9, 23, 30, 0), NOW),
      "Yesterday",
    );
  });

  it("counts days within the week, then switches to a date", () => {
    assert.equal(
      formatNotificationTime(bahrainDate(2026, 9, 4, 18, 0, 0), NOW),
      "6 days ago",
    );
    assert.equal(
      formatNotificationTime(bahrainDate(2026, 9, 3, 18, 0, 0), NOW),
      "3 Oct",
    );
  });

  it("adds the year for another year", () => {
    assert.equal(
      formatNotificationTime(bahrainDate(2025, 11, 20, 18, 0, 0), NOW),
      "20 Dec 2025",
    );
  });
});

describe("invitesWaitingLabel", () => {
  it("counts one invite in the singular", () => {
    assert.equal(invitesWaitingLabel(1), "1 invite waiting");
  });

  it("counts several invites in the plural", () => {
    assert.equal(invitesWaitingLabel(3), "3 invites waiting");
  });
});
