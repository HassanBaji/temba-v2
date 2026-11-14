import { bahrainDate } from "./bahrain-date.test-support";
import assert from "node:assert/strict";
import { isolate } from "@repo/i18n/bidi";
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
      notificationCopy(
        {
          type: "group_member_joined",
          audience: "admin",
          actor: { name: "Sara" },
          group: { name: "Night Crew" },
        },
        "en",
      ),
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
    const copy = notificationCopy(
      {
        type: "group_member_joined",
        audience: "admin",
        actor: null,
        group: { name: null },
      },
      "en",
    );
    assert.equal(
      copy?.title.map((part) => part.text).join(""),
      "Someone joined Untitled Group",
    );
  });

  it("returns null for a type or audience it does not know", () => {
    assert.equal(
      notificationCopy(
        {
          type: "something_new",
          audience: "admin",
          actor: null,
          group: null,
        },
        "en",
      ),
      null,
    );
    assert.equal(
      notificationCopy(
        {
          type: "group_member_joined",
          audience: "spectator",
          actor: null,
          group: null,
        },
        "en",
      ),
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
    return notificationCopy(
      {
        type: "game_player_joined",
        audience: "admin",
        actor: { name: "Sara" },
        group: { name: "Night Crew" },
        game,
        ...item,
      },
      "en",
    );
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
    return notificationCopy(
      {
        type: "game_player_left",
        audience: "admin",
        actor: { name: "Sara" },
        group: { name: "Night Crew" },
        game,
        ...item,
      },
      "en",
    );
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

describe("notificationCopy for an Organizer's add", () => {
  const game = {
    name: "Thursday Padel",
    format: "friendly_game",
    windowStart: bahrainDate(2026, 9, 8, 19, 0, 0),
  };

  it("tells a player an Organizer seated them", () => {
    assert.deepEqual(
      notificationCopy(
        {
          type: "game_seated_by_organizer",
          audience: "player",
          actor: { name: "Sara" },
          group: { name: "Night Crew" },
          game,
        },
        "en",
      ),
      {
        title: [
          { text: "Sara", strong: true },
          { text: " added you to ", strong: false },
          { text: "Thursday Padel", strong: true },
        ],
        subline: null,
      },
    );
    assert.equal(
      notificationCopy(
        {
          type: "game_seated_by_organizer",
          audience: "admin",
          actor: { name: "Sara" },
          group: null,
          game,
        },
        "en",
      ),
      null,
    );
  });

  it("tells a Player the Organizer moved them to the Waitlist", () => {
    assert.deepEqual(
      notificationCopy(
        {
          type: "game_moved_to_waitlist",
          audience: "player",
          actor: { name: "Sara" },
          group: { name: "Night Crew" },
          game,
        },
        "en",
      ),
      {
        title: [
          { text: "Sara", strong: true },
          { text: " lowered the players on ", strong: false },
          { text: "Thursday Padel", strong: true },
          {
            text: ". You're on the Waitlist and get your spot back when one opens",
            strong: false,
          },
        ],
        subline: null,
      },
    );
  });

  it("tells a Player the Organizer changed the teams", () => {
    assert.deepEqual(
      notificationCopy(
        {
          type: "game_team_changed",
          audience: "player",
          actor: { name: "Sara" },
          group: { name: "Night Crew" },
          game,
        },
        "en",
      ),
      {
        title: [
          { text: "Sara", strong: true },
          { text: " changed the teams on ", strong: false },
          { text: "Thursday Padel", strong: true },
          { text: ". See where you play now", strong: false },
        ],
        subline: null,
      },
    );
  });
});

describe("notificationCopy for a claimed history", () => {
  function linked(item: Partial<NotificationCopyInput>) {
    return notificationCopy(
      {
        type: "history_linked",
        audience: "player",
        actor: null,
        group: null,
        gameCount: 3,
        ...item,
      },
      "en",
    );
  }

  it("tells the claimer how many Games were linked", () => {
    assert.deepEqual(linked({}), {
      title: [
        { text: "We linked ", strong: false },
        { text: "3 Games", strong: true },
        { text: " played under your number", strong: false },
      ],
      subline: null,
    });
    assert.equal(
      linked({ gameCount: 1 })
        ?.title.map((part) => part.text)
        .join(""),
      "We linked 1 Game played under your number",
    );
  });

  it("returns null without a Game count or for another audience", () => {
    assert.equal(linked({ gameCount: null }), null);
    assert.equal(linked({ gameCount: 0 }), null);
    assert.equal(linked({ audience: "admin" }), null);
  });
});

describe("notificationCopy for a Finished Game", () => {
  const game = {
    name: "Thursday Padel",
    format: "friendly_tournament",
    windowStart: bahrainDate(2026, 9, 8, 19, 0, 0),
  };

  function finished(item: Partial<NotificationCopyInput>) {
    return notificationCopy(
      {
        type: "game_finished",
        audience: "admin",
        actor: null,
        group: { name: "Night Crew" },
        game,
        ...item,
      },
      "en",
    );
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

  it("asks a player for their marks while the Marks window is open", () => {
    const marksClosesAt = bahrainDate(2026, 10, 6, 19, 0, 0);
    assert.equal(
      finished({ audience: "player", game: { ...game, marksClosesAt } })
        ?.subline,
      "Give your marks before Fri 7:00 PM.",
    );
    assert.equal(
      notificationCopy(
        {
          type: "game_finished",
          audience: "player",
          actor: null,
          group: null,
          game: { ...game, marksClosesAt },
        },
        "ar",
      )?.subline,
      "امنح أوسمتك قبل الجمعة 7:00 م.",
    );
    assert.equal(
      finished({ game: { ...game, marksClosesAt } })?.subline,
      "Every Match is in.",
    );
    assert.equal(
      finished({ audience: "player", game: { ...game, marksClosesAt: null } })
        ?.subline,
      "See your results.",
    );
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

describe("notificationCopy for a received mark", () => {
  const game = {
    name: "Thursday Padel",
    format: "friendly_game",
    windowStart: bahrainDate(2026, 9, 8, 19, 0, 0),
  };

  function received(
    item: Partial<NotificationCopyInput>,
    locale: "en" | "ar" = "en",
  ) {
    return notificationCopy(
      {
        type: "mark_received",
        audience: "player",
        actor: { name: "Ali" },
        group: null,
        game,
        markKind: "dynamo",
        ...item,
      },
      locale,
    );
  }

  it("names the giver, the mark and the Game", () => {
    assert.deepEqual(received({}), {
      title: [
        { text: "Ali", strong: true },
        { text: " gave you ", strong: false },
        { text: "Dynamo", strong: true },
        { text: " on ", strong: false },
        { text: "Thursday Padel", strong: true },
      ],
      subline: null,
    });
  });

  it("reads in Arabic with the set's Arabic name", () => {
    assert.deepEqual(
      received({}, "ar")?.title.map((part) => part.text),
      [
        "منحك ",
        isolate("Ali"),
        " وسام ",
        "الدينامو",
        " في ",
        isolate("Thursday Padel"),
      ],
    );
  });

  it("returns null without a Game, a known kind, or the player audience", () => {
    assert.equal(received({ game: null }), null);
    assert.equal(received({ markKind: null }), null);
    assert.equal(received({ markKind: "mvp" }), null);
    assert.equal(received({ audience: "admin" }), null);
  });
});

describe("notificationCopy for the MVP", () => {
  const game = {
    name: "Thursday Padel",
    format: "friendly_game",
    windowStart: bahrainDate(2026, 9, 8, 19, 0, 0),
  };

  function mvp(
    item: Partial<NotificationCopyInput>,
    locale: "en" | "ar" = "en",
  ) {
    return notificationCopy(
      {
        type: "mvp_decided",
        audience: "player",
        actor: { name: "Yousif" },
        group: null,
        game,
        ...item,
      },
      locale,
    );
  }

  it("names the MVP and the Game to the other players", () => {
    assert.deepEqual(mvp({}), {
      title: [
        { text: "Yousif", strong: true },
        { text: " is the MVP of ", strong: false },
        { text: "Thursday Padel", strong: true },
      ],
      subline: null,
    });
    assert.deepEqual(
      mvp({}, "ar")?.title.map((part) => part.text),
      [isolate("Yousif"), " نجم مباراة ", isolate("Thursday Padel")],
    );
  });

  it("tells the MVP it is them", () => {
    assert.equal(
      mvp({ actorIsRecipient: true })
        ?.title.map((part) => part.text)
        .join(""),
      "You’re the MVP of Thursday Padel",
    );
    assert.equal(
      mvp({ actorIsRecipient: true }, "ar")
        ?.title.map((part) => part.text)
        .join(""),
      `أنت نجم مباراة ${isolate("Thursday Padel")}`,
    );
  });

  it("asks the Organizers to break a tied vote", () => {
    for (const locale of ["en", "ar"] as const) {
      const copy = notificationCopy(
        {
          type: "mvp_tie_break",
          audience: "admin",
          actor: null,
          group: null,
          game,
        },
        locale,
      );
      assert.notEqual(copy, null);
    }
    assert.equal(
      notificationCopy(
        {
          type: "mvp_tie_break",
          audience: "admin",
          actor: null,
          group: null,
          game,
        },
        "en",
      )
        ?.title.map((part) => part.text)
        .join(""),
      "Tied vote on Thursday Padel. Pick the MVP.",
    );
  });

  it("asks the Organizer to rate the players once ratings open", () => {
    const open = (audience: "admin" | "player", locale: "en" | "ar" = "en") =>
      notificationCopy(
        {
          type: "performance_ratings_open",
          audience,
          actor: null,
          group: null,
          game,
        },
        locale,
      );
    assert.equal(
      open("admin")
        ?.title.map((part) => part.text)
        .join(""),
      "Rate the players of Thursday Padel",
    );
    assert.equal(
      open("admin")?.subline,
      "Score everyone 1 to 10 within 24 hours. Points move when you submit.",
    );
    assert.notEqual(open("admin", "ar"), null);
    assert.equal(
      open("player")
        ?.title.map((part) => part.text)
        .join(""),
      "Rate the players of Thursday Padel",
    );
    assert.equal(
      open("player")?.subline,
      "Score your teammates and, if you want, opponents, within 24 hours. Nobody sees who gave what.",
    );
    assert.notEqual(
      open("player", "ar")?.subline,
      open("admin", "ar")?.subline,
    );
  });

  it("tells an Operator who disputed which result, with the note", () => {
    const raised = notificationCopy(
      {
        type: "match_dispute_raised",
        audience: "admin",
        actor: { name: "Diego" },
        group: null,
        game,
        dispute: { status: "open", note: "It finished 4–3" },
      },
      "en",
    );
    assert.equal(
      raised?.title.map((part) => part.text).join(""),
      "Diego disputed the result of Thursday Padel",
    );
    assert.equal(raised?.subline, "It finished 4–3");
  });

  it("tells the player and the Organizers how an Operator decided", () => {
    const decided = (
      status: string,
      actorIsRecipient: boolean,
      locale: "en" | "ar" = "en",
    ) =>
      notificationCopy(
        {
          type: "match_dispute_decided",
          audience: actorIsRecipient ? "player" : "admin",
          actor: { name: "Diego" },
          actorIsRecipient,
          group: null,
          game,
          dispute: { status, note: "It finished 4–3" },
        },
        locale,
      );
    const text = (copy: ReturnType<typeof decided>) =>
      copy?.title.map((part) => part.text).join("");
    assert.equal(
      text(decided("upheld", true)),
      "Temba upheld your dispute on Thursday Padel",
    );
    assert.equal(
      decided("upheld", true)?.subline,
      "The score is open again. Enter the right one.",
    );
    assert.equal(
      text(decided("dismissed", false)),
      "Temba dismissed Diego’s dispute on Thursday Padel",
    );
    assert.equal(decided("dismissed", false)?.subline, "The result stands.");
    assert.notEqual(decided("upheld", false, "ar"), null);
    assert.equal(decided("open", true), null);
  });

  it("tells the player an Organizer reopened the score their dispute was on", () => {
    const superseded = (locale: "en" | "ar") =>
      notificationCopy(
        {
          type: "match_dispute_decided",
          audience: "player",
          actor: { name: "Omar" },
          actorIsRecipient: false,
          group: null,
          game,
          dispute: { status: "superseded", note: "It finished 4–3" },
        },
        locale,
      );
    assert.equal(
      superseded("en")
        ?.title.map((part) => part.text)
        .join(""),
      "Omar reopened the score of Thursday Padel",
    );
    assert.equal(
      superseded("en")?.subline,
      "Your dispute is closed. If the new result is wrong too, you can dispute it.",
    );
    assert.notEqual(superseded("ar"), null);
  });

  it("tells a player their rating and their points move once ratings close", () => {
    const closed = (
      ratingHundredths: number | null,
      locale: "en" | "ar" = "en",
    ) =>
      notificationCopy(
        {
          type: "performance_ratings_closed",
          audience: "player",
          actor: null,
          group: null,
          game,
          tier: {
            bandAfter: "kanaad",
            pointsBefore: 1201,
            pointsAfter: 1219,
            delta: 18,
            ratingHundredths,
            reason: null,
            note: null,
          },
        },
        locale,
      );
    assert.equal(
      closed(740)
        ?.title.map((part) => part.text)
        .join(""),
      "Ratings are in for Thursday Padel",
    );
    assert.equal(
      closed(740)?.subline,
      "You were rated 7.4. Tier points +18, now 1,219.",
    );
    assert.equal(
      closed(null)?.subline,
      "No rating for you this time. Tier points +18 on the result, now 1,219.",
    );
    assert.notEqual(closed(740, "ar"), null);
    assert.equal(
      notificationCopy(
        {
          type: "performance_ratings_closed",
          audience: "player",
          actor: null,
          group: null,
          game,
          tier: null,
        },
        "en",
      ),
      null,
    );
  });

  it("tells a player their rating and their OVR move once ratings close on a Match that counts", () => {
    const closed = (
      ratingHundredths: number | null,
      locale: "en" | "ar" = "en",
    ) =>
      notificationCopy(
        {
          type: "performance_ratings_closed",
          audience: "player",
          actor: null,
          group: null,
          game,
          tier: null,
          ovrMove: { before: 74.2, after: 75, ratingHundredths },
        },
        locale,
      );
    assert.equal(
      closed(780)
        ?.title.map((part) => part.text)
        .join(""),
      "Ratings are in for Thursday Padel",
    );
    assert.equal(closed(780)?.subline, "You were rated 7.8. OVR +0.8, now 75.");
    assert.equal(
      closed(null)?.subline,
      "No rating for you this time. OVR +0.8, now 75.",
    );
    assert.match(closed(780, "ar")?.subline ?? "", /تقييمك/);
  });

  it("returns null without a Game or for the wrong audience", () => {
    assert.equal(mvp({ game: null }), null);
    assert.equal(mvp({ audience: "admin" }), null);
    assert.equal(
      notificationCopy(
        {
          type: "mvp_tie_break",
          audience: "player",
          actor: null,
          group: null,
          game,
        },
        "en",
      ),
      null,
    );
  });
});

describe("notificationCopy for a Level set", () => {
  function levelSet(item: Partial<NotificationCopyInput>) {
    return notificationCopy(
      {
        type: "level_set",
        audience: "player",
        actor: { name: "Sara" },
        group: { name: "Night Crew" },
        levelSet: { level: "3.8", levelBand: "C1", reason: "back_from_injury" },
        ...item,
      },
      "en",
    );
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

  it("reads an override from before reasons were required as no reason given", () => {
    assert.equal(
      levelSet({ levelSet: { level: "4.6", levelBand: "B3", reason: null } })
        ?.subline,
      "No reason given",
    );
  });

  it("quotes the setter's note after the reason", () => {
    assert.equal(
      levelSet({
        levelSet: {
          level: "71",
          levelBand: "C1",
          reason: "plays_above_results",
          note: "Assessed over two sessions, plays above 68.",
        },
      })?.subline,
      "Plays above results: “Assessed over two sessions, plays above 68.”",
    );
  });

  it("reads a football Level as OVR, with no band", () => {
    assert.deepEqual(
      levelSet({
        levelSet: {
          level: "72",
          levelBand: "C1",
          sport: "football",
          reason: "plays_above_results",
        },
      })?.title,
      [
        { text: "Sara", strong: true },
        { text: " set your Level to ", strong: false },
        { text: "OVR 72", strong: true },
      ],
    );
    const arabic = notificationCopy(
      {
        type: "level_set",
        audience: "player",
        actor: { name: "سارة" },
        group: null,
        levelSet: {
          level: "72",
          levelBand: "C1",
          sport: "football",
          reason: "plays_above_results",
        },
      },
      "ar",
    );
    assert.equal(arabic?.title.at(-1)?.text, `OVR ${isolate("72")}`);
  });

  it("names the Verifier and their Venue on a calibration", () => {
    assert.deepEqual(
      levelSet({
        actor: { name: "Yaser" },
        group: null,
        levelSet: {
          level: "71",
          levelBand: "C1",
          sport: "football",
          reason: "plays_above_results",
          venue: { name: "Fantasy FC" },
        },
      }),
      {
        title: [
          { text: "Yaser", strong: true },
          { text: " (", strong: false },
          { text: "Fantasy FC", strong: true },
          { text: ") calibrated your Level to ", strong: false },
          { text: "OVR 71", strong: true },
        ],
        subline: "Plays above results",
      },
    );
    assert.equal(
      notificationCopy(
        {
          type: "level_set",
          audience: "player",
          actor: { name: "ياسر" },
          group: null,
          levelSet: {
            level: "71",
            levelBand: "C1",
            reason: "plays_above_results",
            venue: { name: "Fantasy FC" },
          },
        },
        "ar",
      )
        ?.title.map((part) => part.text)
        .join("")
        .includes("Fantasy FC"),
      true,
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
        "en",
        NOW,
      ),
      "2 min ago · Night Crew",
    );
  });

  it("is the time alone for a Group join or a groupless Game", () => {
    assert.equal(
      notificationMeta({ createdAt, group: { name: "Night Crew" } }, "en", NOW),
      "2 min ago",
    );
    assert.equal(
      notificationMeta(
        {
          createdAt,
          group: null,
          game: { name: null, format: "americano", windowStart: null },
        },
        "en",
        NOW,
      ),
      "2 min ago",
    );
  });
});

describe("formatNotificationTime", () => {
  it("says Just now under a minute", () => {
    assert.equal(
      formatNotificationTime(bahrainDate(2026, 9, 10, 8, 59, 30), "en", NOW),
      "Just now",
    );
  });

  it("counts minutes within the hour", () => {
    assert.equal(
      formatNotificationTime(bahrainDate(2026, 9, 10, 8, 58, 0), "en", NOW),
      "2 min ago",
    );
  });

  it("counts hours earlier the same product day", () => {
    assert.equal(
      formatNotificationTime(bahrainDate(2026, 9, 10, 5, 30, 0), "en", NOW),
      "3 h ago",
    );
  });

  it("says Yesterday for the previous product day, even under 24 hours ago", () => {
    assert.equal(
      formatNotificationTime(bahrainDate(2026, 9, 9, 23, 30, 0), "en", NOW),
      "Yesterday",
    );
  });

  it("counts days within the week, then switches to a date", () => {
    assert.equal(
      formatNotificationTime(bahrainDate(2026, 9, 4, 18, 0, 0), "en", NOW),
      "6 days ago",
    );
    assert.equal(
      formatNotificationTime(bahrainDate(2026, 9, 3, 18, 0, 0), "en", NOW),
      "3 Oct",
    );
  });

  it("adds the year for another year", () => {
    assert.equal(
      formatNotificationTime(bahrainDate(2025, 11, 20, 18, 0, 0), "en", NOW),
      "20 Dec 2025",
    );
  });
});

describe("notificationCopy in Arabic", () => {
  it("puts the verb first and keeps the names in bold", () => {
    assert.deepEqual(
      notificationCopy(
        {
          type: "group_member_joined",
          audience: "admin",
          actor: { name: "Sara" },
          group: { name: "Night Crew" },
        },
        "ar",
      ),
      {
        title: [
          { text: "انضم ", strong: false },
          { text: isolate("Sara"), strong: true },
          { text: " إلى ", strong: false },
          { text: isolate("Night Crew"), strong: true },
        ],
        subline: null,
      },
    );
    assert.equal(
      formatNotificationTime(bahrainDate(2026, 9, 10, 8, 58, 0), "ar", NOW),
      "قبل دقيقتين",
    );
    assert.equal(invitesWaitingLabel(3, "ar"), "3 دعوات بانتظارك");
  });
});

describe("invitesWaitingLabel", () => {
  it("counts one invite in the singular", () => {
    assert.equal(invitesWaitingLabel(1, "en"), "1 invite waiting");
  });

  it("counts several invites in the plural", () => {
    assert.equal(invitesWaitingLabel(3, "en"), "3 invites waiting");
  });
});

describe("request notifications", () => {
  const game = {
    name: null,
    format: "friendly_game",
    windowStart: bahrainDate(2026, 10, 11, 19, 0, 0),
  };

  it("tells admins who asked, and where to decide", () => {
    const withSeat = notificationCopy(
      {
        type: "group_join_requested",
        audience: "admin",
        actor: { name: "Hassan Haji" },
        group: { name: "Gooz of Arad" },
        game,
      },
      "en",
    );
    assert.equal(
      withSeat?.title.map((part) => part.text).join(""),
      "Hassan Haji asked to join Gooz of Arad and hold a seat on Friendly game · Wed 11 Nov",
    );
    assert.equal(withSeat?.subline, "Approve or decline on the Game.");
    const groupOnly = notificationCopy(
      {
        type: "group_join_requested",
        audience: "admin",
        actor: { name: "Hassan Haji" },
        group: { name: "Gooz of Arad" },
        game: null,
      },
      "en",
    );
    assert.equal(groupOnly?.subline, "Approve or decline on the Group.");
    assert.equal(
      notificationCopy(
        {
          type: "game_level_range_requested",
          audience: "admin",
          actor: { name: "Omar T" },
          group: null,
          game,
        },
        "en",
      )
        ?.title.map((part) => part.text)
        .join(""),
      "Omar T asked to play Friendly game · Wed 11 Nov outside the Level range",
    );
  });

  it("tells the player who decided", () => {
    assert.equal(
      notificationCopy(
        {
          type: "group_join_approved",
          audience: "player",
          actor: { name: "Yousif Kadhem" },
          group: { name: "Gooz of Arad" },
          game,
        },
        "en",
      )
        ?.title.map((part) => part.text)
        .join(""),
      "Yousif Kadhem approved you. You're in Friendly game · Wed 11 Nov and a member of Gooz of Arad",
    );
    assert.equal(
      notificationCopy(
        {
          type: "group_join_declined",
          audience: "player",
          actor: { name: "Yousif Kadhem" },
          group: { name: "Gooz of Arad" },
        },
        "ar",
      )
        ?.title.map((part) => part.text)
        .join(""),
      `رفض ${isolate("Yousif Kadhem")} طلبك للانضمام إلى ${isolate("Gooz of Arad")}`,
    );
    const levelApproved = notificationCopy(
      {
        type: "game_level_range_approved",
        audience: "player",
        actor: { name: "Yousif Kadhem" },
        group: null,
        game,
      },
      "en",
    );
    assert.equal(levelApproved?.subline, "You can join the Game now.");
    assert.equal(
      notificationCopy(
        {
          type: "game_level_range_approved",
          audience: "admin",
          actor: { name: "Yousif Kadhem" },
          group: null,
          game,
        },
        "en",
      ),
      null,
    );
  });
});

describe("notificationCopy for a Team invite", () => {
  it("names the inviter and the Team, and says where to accept", () => {
    assert.deepEqual(
      notificationCopy(
        {
          type: "team_invite_received",
          audience: "player",
          actor: { name: "Hassan" },
          team: { name: "Gooz FC" },
          group: null,
        },
        "en",
      ),
      {
        title: [
          { text: "Hassan", strong: true },
          { text: " invited you to ", strong: false },
          { text: "Gooz FC", strong: true },
        ],
        subline: "Accept or decline it in Teams.",
      },
    );
  });

  it("reads an unnamed Team as theirs, in English and Arabic", () => {
    const item = {
      type: "team_invite_received",
      audience: "player",
      actor: { name: "Hassan" },
      team: { name: null },
      group: null,
    };
    assert.equal(
      notificationCopy(item, "en")
        ?.title.map((part) => part.text)
        .join(""),
      "Hassan invited you to their Team",
    );
    assert.equal(
      notificationCopy(item, "ar")
        ?.title.map((part) => part.text)
        .join(""),
      `دعاك ${isolate("Hassan")} إلى فريقه`,
    );
  });
});

describe("notificationCopy for an expired Challenge", () => {
  it("names the Team and says to post again", () => {
    assert.deepEqual(
      notificationCopy(
        {
          type: "challenge_expired",
          audience: "player",
          actor: null,
          team: { name: "Gooz FC" },
          group: null,
        },
        "en",
      ),
      {
        title: [
          { text: "The challenge from ", strong: false },
          { text: "Gooz FC", strong: true },
          { text: " expired", strong: false },
        ],
        subline: "No proposal came in. Post again from Challenges.",
      },
    );
  });

  it("reads an unnamed Team as the recipient's, in Arabic too", () => {
    const item = {
      type: "challenge_expired",
      audience: "player",
      actor: null,
      team: { name: null },
      group: null,
    };
    assert.equal(
      notificationCopy(item, "en")
        ?.title.map((part) => part.text)
        .join(""),
      "Your Team's challenge expired",
    );
    assert.equal(
      notificationCopy(item, "ar")
        ?.title.map((part) => part.text)
        .join(""),
      "انتهت مدة تحدي فريقك",
    );
  });
});

describe("notificationCopy for a Proposal", () => {
  function title(type: string, team: string | null, locale: "en" | "ar") {
    return notificationCopy(
      {
        type,
        audience: "player",
        actor: null,
        team: { name: team },
        group: null,
      },
      locale,
    )
      ?.title.map((part) => part.text)
      .join("");
  }

  it("names the other Team on a received, declined and expired Proposal", () => {
    assert.equal(
      title("challenge_proposal_received", "Riffa Rackets", "en"),
      "Riffa Rackets proposed a time for your challenge",
    );
    assert.equal(
      title("challenge_proposal_declined", "Seef Smashers", "en"),
      "Seef Smashers asked for another time",
    );
    assert.equal(
      title("challenge_proposal_expired", "Seef Smashers", "en"),
      "Your proposal to Seef Smashers expired",
    );
    assert.equal(
      notificationCopy(
        {
          type: "challenge_proposal_received",
          audience: "player",
          actor: null,
          team: { name: "Riffa Rackets" },
          group: null,
        },
        "en",
      )?.subline,
      "Confirm it, or ask for another time, within 48 hours.",
    );
  });

  it("reads an unnamed Team plainly, in Arabic too", () => {
    assert.equal(
      title("challenge_proposal_received", null, "en"),
      "A Team proposed a time for your challenge",
    );
    assert.equal(
      title("challenge_proposal_expired", null, "ar"),
      "انتهت مدة عرض فريقك",
    );
    assert.equal(
      title("challenge_proposal_declined", "Seef Smashers", "ar"),
      `${isolate("Seef Smashers")} طلب وقتًا آخر`,
    );
  });
  it("names the other Team on a confirmed, passed-over and squad-due Notification", () => {
    assert.equal(
      title("challenge_proposal_confirmed", "Riffa Rackets", "en"),
      "It's a game: you play Riffa Rackets",
    );
    assert.equal(
      title("challenge_proposal_passed_over", "Seef Smashers", "en"),
      "Seef Smashers confirmed another proposal",
    );
    assert.equal(
      title("challenge_squad_due", "Hidd United", "en"),
      "Name your squad for the game against Hidd United",
    );
    assert.equal(
      title("challenge_squad_due", null, "ar"),
      "سمِّ تشكيلتك للمباراة",
    );
    const confirmed = (sport: string) =>
      notificationCopy(
        {
          type: "challenge_proposal_confirmed",
          audience: "player",
          actor: null,
          team: { name: "Hidd United" },
          group: null,
          game: {
            name: null,
            format: "friendly_game",
            sport,
            windowStart: null,
          },
        },
        "en",
      )?.subline;
    assert.equal(confirmed("football"), "Name your squad from the Roster.");
    assert.equal(confirmed("padel"), "Both pairs are seated. See the Game.");
  });

  it("tells a newly named player which Team they play", () => {
    assert.equal(
      title("challenge_squad_named", "Arad Athletic", "en"),
      "You're in the squad to play Arad Athletic",
    );
    assert.equal(
      title("challenge_squad_named", null, "ar"),
      "أنت في تشكيلة تحدٍّ",
    );
  });

  it("names the posting Team on a Rematch nudge", () => {
    assert.equal(
      title("challenge_rematch_nudge", "Smash Brothers", "en"),
      "Smash Brothers challenged you to a rematch",
    );
    assert.equal(
      title("challenge_rematch_nudge", null, "en"),
      "A Team you've played challenged you to a rematch",
    );
    assert.equal(
      title("challenge_rematch_nudge", null, "ar"),
      "فريق لعبتم ضده يتحداكم في مباراة إعادة",
    );
    assert.equal(
      notificationCopy(
        {
          type: "challenge_rematch_nudge",
          audience: "player",
          actor: null,
          team: { name: "Smash Brothers" },
          group: null,
        },
        "en",
      )?.subline,
      "Accept it to propose a time and a venue.",
    );
  });
});

describe("notificationCopy for a Tier adjustment", () => {
  const tier = {
    bandAfter: "hamour",
    pointsBefore: 1248,
    pointsAfter: 1310,
    reason: "correcting_a_mistake" as const,
    note: null,
  };

  it("names the Organizer and the Group, with the reason and the move", () => {
    assert.deepEqual(
      notificationCopy(
        {
          type: "tier_points_adjusted",
          audience: "player",
          actor: { name: "Hussain A" },
          group: { name: "Thursday Football" },
          tier,
        },
        "en",
      ),
      {
        title: [
          { text: "Hussain A", strong: true },
          { text: " adjusted your tier points in ", strong: false },
          { text: "Thursday Football", strong: true },
        ],
        subline: "Fixing a mistake. 1,248 to 1,310.",
      },
    );
  });

  it("quotes the Organizer's note", () => {
    assert.equal(
      notificationCopy(
        {
          type: "tier_points_adjusted",
          audience: "player",
          actor: { name: "Hussain A" },
          group: { name: "Thursday Football" },
          tier: { ...tier, note: "Plays Div 1" },
        },
        "en",
      )?.subline,
      "Fixing a mistake: “Plays Div 1” 1,248 to 1,310.",
    );
  });

  it("tells a player their fish moved", () => {
    assert.deepEqual(
      notificationCopy(
        {
          type: "tier_band_changed",
          audience: "player",
          actor: { name: "Hussain A" },
          group: { name: "Thursday Football" },
          tier: { ...tier, bandAfter: "kanaad", reason: null },
        },
        "en",
      ),
      {
        title: [
          { text: "You’re now a ", strong: false },
          { text: "Kanaad", strong: true },
          { text: " in ", strong: false },
          { text: "Thursday Football", strong: true },
        ],
        subline:
          "Tiers are places, so when one player moves, someone moves the other way.",
      },
    );
  });

  it("returns null without the Tier event", () => {
    for (const type of ["tier_points_adjusted", "tier_band_changed"]) {
      assert.equal(
        notificationCopy(
          {
            type,
            audience: "player",
            actor: null,
            group: { name: "Thursday Football" },
            tier: null,
          },
          "en",
        ),
        null,
      );
    }
  });

  it("reads in Arabic", () => {
    const copy = notificationCopy(
      {
        type: "tier_band_changed",
        audience: "player",
        actor: null,
        group: { name: "Thursday Football" },
        tier: { ...tier, bandAfter: "shark" },
      },
      "ar",
    );
    assert.equal(copy?.title[1]?.text, "قرش");
  });
});

describe("notificationCopy: a confirmed Level", () => {
  const game = (sport: string | null) => ({
    name: null,
    format: "friendly_game",
    sport,
    windowStart: null,
  });

  it("names the sport whose Level the Match confirmed", () => {
    assert.deepEqual(
      notificationCopy(
        {
          type: "level_confirmed",
          audience: "player",
          actor: null,
          group: null,
          game: game("football"),
        },
        "en",
      ),
      {
        title: [
          { text: "Your ", strong: false },
          { text: "Football", strong: true },
          { text: " Level is confirmed", strong: false },
        ],
        subline:
          "The track is no longer hatched. It keeps moving on verified matches.",
      },
    );
    assert.equal(
      notificationCopy(
        {
          type: "level_confirmed",
          audience: "player",
          actor: null,
          group: null,
          game: game("padel"),
        },
        "ar",
      )?.title[1]?.text,
      "بادل",
    );
  });

  it("returns null without the Game's sport", () => {
    for (const value of [null, undefined]) {
      assert.equal(
        notificationCopy(
          {
            type: "level_confirmed",
            audience: "player",
            actor: null,
            group: null,
            game: value === null ? game(null) : null,
          },
          "en",
        ),
        null,
      );
    }
  });
});
