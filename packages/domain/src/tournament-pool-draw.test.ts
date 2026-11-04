import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { messagesFor } from "@repo/i18n/messages";

import { formatAbsoluteDay } from "./format-game-start";
import {
  canOpenOrganizerDrawDrawer,
  canShowUndoPoolDraw,
  draftPoolMetaLine,
  draftPoolsFromGameTeams,
  drawDrawerLead,
  knockoutDrawDrawerLead,
  drawEntryStateLine,
  drawEntryTitle,
  hasDraftPoolDraw,
  poolLabel,
} from "./tournament-pool-draw";

const POOL_DRAW = messagesFor("en").tournament.poolDraw;

const FORBIDDEN = /quarter|knockout|champion|then quarters|message|notified/iu;
const SAYS_GROUP = /\bGroup\b/;

describe("Pool draw copy", () => {
  it("tells a User the group draw has not happened, opponents are unknown, and it is random", () => {
    assert.equal(POOL_DRAW.notHappened, "The group draw has not happened yet.");
    assert.equal(
      POOL_DRAW.opponentsUnknown,
      "Your opponents are not yet known.",
    );
    assert.equal(
      POOL_DRAW.random,
      "The group draw is random. Nobody is seeded.",
    );
    assert.match(POOL_DRAW.random, /random/iu);
    assert.match(POOL_DRAW.random, /seeded/iu);
  });

  it("names the Organizer draft and post actions", () => {
    assert.equal(POOL_DRAW.drawPools, "Draw the groups");
    assert.equal(POOL_DRAW.drawAgain, "Draw again");
    assert.equal(POOL_DRAW.post, "Post the group draw");
    assert.equal(POOL_DRAW.undo, "Undo the group draw");
  });

  it("states the draw screen, the field, and what posting does — as group, never Group", () => {
    assert.equal(POOL_DRAW.drawerTitle, "The draw");
    assert.equal(POOL_DRAW.entryTitle, "The group draw");
    assert.equal(POOL_DRAW.entryDraftedTitle, "The groups are drafted");
    assert.equal(POOL_DRAW.entryAction, "Open the draw");
    assert.equal(
      POOL_DRAW.emptyDraft,
      "Draw the groups to see which Game teams land in which group.",
    );
    assert.equal(
      POOL_DRAW.postFooter,
      "Posting creates every group Match and closes the seats.",
    );
    assert.match(POOL_DRAW.postFooter, /group Match/u);
    assert.match(POOL_DRAW.postFooter, /seats/u);
    assert.equal(drawEntryTitle(false, "en"), POOL_DRAW.entryTitle);
    assert.equal(drawEntryTitle(true, "en"), POOL_DRAW.entryDraftedTitle);
    assert.equal(
      drawEntryStateLine(8, 12, "en"),
      "8 of 12 Game teams are complete.",
    );
    assert.equal(
      drawEntryStateLine(1, 1, "en"),
      "1 of 1 Game team is complete.",
    );
    assert.equal(
      drawDrawerLead(12, "en"),
      `12 Game teams. ${POOL_DRAW.random}`,
    );
    assert.equal(drawDrawerLead(null, "en"), POOL_DRAW.random);
    const copy = [
      POOL_DRAW.drawerTitle,
      POOL_DRAW.entryTitle,
      POOL_DRAW.entryDraftedTitle,
      POOL_DRAW.entryAction,
      POOL_DRAW.emptyDraft,
      POOL_DRAW.postFooter,
      POOL_DRAW.random,
      drawEntryStateLine(12, 12, "en"),
      drawDrawerLead(12, "en"),
    ].join(" ");
    assert.equal(FORBIDDEN.test(copy), false);
    assert.equal(SAYS_GROUP.test(copy), false);
  });
});

describe("organizer draw gates", () => {
  const open = {
    isOrganizer: true,
    cancelled: false,
    drawPosted: false,
  };

  it("opens the drawer only for an organizer, before the draw, on a live Game", () => {
    assert.equal(canOpenOrganizerDrawDrawer(open), true);
    assert.equal(
      canOpenOrganizerDrawDrawer({ ...open, isOrganizer: false }),
      false,
    );
    assert.equal(
      canOpenOrganizerDrawDrawer({ ...open, cancelled: true }),
      false,
    );
    assert.equal(
      canOpenOrganizerDrawDrawer({ ...open, drawPosted: true }),
      false,
    );
  });

  it("keeps Undo after posting under the same organizer and live-Game conditions", () => {
    const posted = { ...open, drawPosted: true, canUndo: true };
    assert.equal(canShowUndoPoolDraw(posted), true);
    assert.equal(canShowUndoPoolDraw({ ...open, canUndo: true }), false);
    assert.equal(canShowUndoPoolDraw({ ...posted, isOrganizer: false }), false);
    assert.equal(canShowUndoPoolDraw({ ...posted, cancelled: true }), false);
  });

  it("hides Undo once a Set has been played or a Match completed", () => {
    assert.equal(
      canShowUndoPoolDraw({ ...open, drawPosted: true, canUndo: false }),
      false,
    );
  });
});

describe("draftPoolsFromGameTeams", () => {
  it("groups Game teams by Pool with the tournament date and Courts", () => {
    const start = new Date(2026, 8, 20, 18, 0, 0);
    const end = new Date(2026, 8, 20, 21, 0, 0);
    const pools = draftPoolsFromGameTeams({
      gameTeams: [
        {
          id: "b",
          name: null,
          sideIndex: 2,
          poolIndex: 1,
          members: [{ name: "Sofia" }, { name: "Jonas" }],
        },
        {
          id: "a",
          name: null,
          sideIndex: 1,
          poolIndex: 1,
          members: [{ name: "Ada" }, { name: "Lin" }],
        },
        {
          id: "c",
          name: null,
          sideIndex: 3,
          poolIndex: 2,
          members: [{ name: "Kai" }, { name: "Noor" }],
        },
      ],
      storedRoundCount: null,
      windowStart: start,
      windowEnd: end,
      matchMinutes: null,
      courtNames: ["Court 1", "Court 2"],
      locale: "en",
    });

    assert.deepEqual(pools, [
      {
        poolIndex: 1,
        label: "group A",
        teams: [
          { id: "a", name: "Ada / Lin" },
          { id: "b", name: "Sofia / Jonas" },
        ],
        dateLines: [formatAbsoluteDay(start, "en")],
        courtNames: ["Court 1", "Court 2"],
      },
      {
        poolIndex: 2,
        label: "group B",
        teams: [{ id: "c", name: "Kai / Noor" }],
        dateLines: [formatAbsoluteDay(start, "en")],
        courtNames: ["Court 1", "Court 2"],
      },
    ]);
    assert.equal(poolLabel(3, "en"), "group C");
  });

  it("dates the draft against the Rounds posting would generate for the drafted groups", () => {
    const start = new Date(2026, 8, 20, 18, 0, 0);
    const end = new Date(2026, 9, 11, 19, 0, 0);
    const drafted = (poolSizes: readonly number[]) =>
      poolSizes.flatMap((size, poolOffset) =>
        Array.from({ length: size }, (_, index) => ({
          id: `${poolOffset + 1}-${index}`,
          name: null,
          sideIndex: null,
          poolIndex: poolOffset + 1,
          members: [],
        })),
      );
    const dateLinesFor = (
      poolSizes: readonly number[],
      storedRoundCount: number | null,
    ) =>
      draftPoolsFromGameTeams({
        gameTeams: drafted(poolSizes),
        storedRoundCount,
        windowStart: start,
        windowEnd: end,
        matchMinutes: null,
        courtNames: [],
        locale: "en",
      })[0]?.dateLines;
    const bothDays = [
      formatAbsoluteDay(start, "en"),
      formatAbsoluteDay(end, "en"),
    ];

    assert.deepEqual(dateLinesFor([4, 4, 4], null), bothDays);
    assert.deepEqual(dateLinesFor([4, 4, 4], 5), bothDays);
    assert.deepEqual(dateLinesFor([4, 4, 4], 1), [
      formatAbsoluteDay(start, "en"),
    ]);
    assert.deepEqual(dateLinesFor([2, 2], null), [
      formatAbsoluteDay(start, "en"),
    ]);
    assert.deepEqual(dateLinesFor([2, 2], 5), bothDays);
  });

  it("treats a tournament as undrawn until a Pool index is set", () => {
    assert.equal(
      hasDraftPoolDraw([{ poolIndex: null }, { poolIndex: undefined }]),
      false,
    );
    assert.equal(hasDraftPoolDraw([{ poolIndex: 1 }]), true);
    assert.deepEqual(
      draftPoolsFromGameTeams({
        gameTeams: [
          {
            id: "a",
            name: null,
            sideIndex: 1,
            poolIndex: null,
            members: [{ name: "Ada" }, { name: "Lin" }],
          },
        ],
        storedRoundCount: null,
        windowStart: new Date(),
        windowEnd: new Date(),
        matchMinutes: null,
        courtNames: ["Court 1"],
        locale: "en",
      }),
      [],
    );
  });

  it("joins each Pool's dates and Courts into one meta line", () => {
    const day = formatAbsoluteDay(new Date(2026, 8, 20, 18, 0, 0), "en");
    assert.equal(
      draftPoolMetaLine({
        dateLines: [day],
        courtNames: ["Court 1", "Court 2"],
      }),
      `${day}, Court 1, Court 2`,
    );
    assert.equal(draftPoolMetaLine({ dateLines: [day], courtNames: [] }), day);
    assert.equal(
      draftPoolMetaLine({
        dateLines: [],
        courtNames: ["Court 3"],
      }),
      "Court 3",
    );
  });
});

describe("knockoutDrawDrawerLead", () => {
  it("counts the complete Game teams that go into the tree, not the planned field", () => {
    assert.equal(
      knockoutDrawDrawerLead(6, "en"),
      `6 complete Game teams go into the draw. ${POOL_DRAW.knockoutRandom}`,
    );
    assert.equal(
      knockoutDrawDrawerLead(1, "en"),
      `1 complete Game team goes into the draw. ${POOL_DRAW.knockoutRandom}`,
    );
    assert.equal(knockoutDrawDrawerLead(0, "en"), POOL_DRAW.knockoutRandom);
    assert.equal(/group/i.test(knockoutDrawDrawerLead(6, "en")), false);
  });
});

describe("Arabic copy", () => {
  it("labels the groups and the draw state in Arabic", () => {
    assert.equal(poolLabel(1, "ar"), "المجموعة A");
    assert.equal(drawEntryStateLine(8, 12, "ar"), "8 من 12 فريقًا مكتملًا.");
    assert.equal(drawEntryTitle(true, "ar"), "المجموعات جاهزة كمسودة");
    assert.equal(
      knockoutDrawDrawerLead(2, "ar"),
      "فريقان مكتملان يدخلان القرعة. القرعة عشوائية. لا تصنيف لأحد.",
    );
  });
});
