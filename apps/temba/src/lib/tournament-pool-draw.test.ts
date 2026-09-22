import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { formatAbsoluteDay } from "./format-game-start";
import {
  DRAW_AGAIN_ACTION,
  DRAW_DRAWER_TITLE,
  DRAW_EMPTY_DRAFT_COPY,
  DRAW_ENTRY_ACTION_LABEL,
  DRAW_ENTRY_DRAFTED_TITLE,
  DRAW_ENTRY_TITLE,
  DRAW_POOLS_ACTION,
  POST_POOL_DRAW_ACTION,
  POST_POOL_DRAW_FOOTER_COPY,
  UNDO_POOL_DRAW_ACTION,
  OPPONENTS_UNKNOWN_COPY,
  POOL_DRAW_NOT_HAPPENED_COPY,
  POOL_DRAW_RANDOM_COPY,
  canOpenOrganizerDrawDrawer,
  canShowUndoPoolDraw,
  draftPoolMetaLine,
  draftPoolsFromGameTeams,
  drawDrawerLead,
  drawEntryStateLine,
  drawEntryTitle,
  hasDraftPoolDraw,
  poolLabel,
} from "./tournament-pool-draw";

const FORBIDDEN = /quarter|knockout|champion|then quarters|message|notified/iu;
const SAYS_GROUP = /\bGroup\b/;

describe("Pool draw copy", () => {
  it("tells a User the group draw has not happened, opponents are unknown, and it is random", () => {
    assert.equal(
      POOL_DRAW_NOT_HAPPENED_COPY,
      "The group draw has not happened yet.",
    );
    assert.equal(OPPONENTS_UNKNOWN_COPY, "Your opponents are not yet known.");
    assert.equal(
      POOL_DRAW_RANDOM_COPY,
      "The group draw is random. Nobody is seeded.",
    );
    assert.match(POOL_DRAW_RANDOM_COPY, /random/iu);
    assert.match(POOL_DRAW_RANDOM_COPY, /seeded/iu);
  });

  it("names the Organizer draft and post actions", () => {
    assert.equal(DRAW_POOLS_ACTION, "Draw the groups");
    assert.equal(DRAW_AGAIN_ACTION, "Draw again");
    assert.equal(POST_POOL_DRAW_ACTION, "Post the group draw");
    assert.equal(UNDO_POOL_DRAW_ACTION, "Undo the group draw");
  });

  it("states the draw screen, the field, and what posting does — as group, never Group", () => {
    assert.equal(DRAW_DRAWER_TITLE, "The draw");
    assert.equal(DRAW_ENTRY_TITLE, "The group draw");
    assert.equal(DRAW_ENTRY_DRAFTED_TITLE, "The groups are drafted");
    assert.equal(DRAW_ENTRY_ACTION_LABEL, "Open the draw");
    assert.equal(
      DRAW_EMPTY_DRAFT_COPY,
      "Draw the groups to see which Game teams land in which group.",
    );
    assert.equal(
      POST_POOL_DRAW_FOOTER_COPY,
      "Posting creates every group Match and closes the seats.",
    );
    assert.match(POST_POOL_DRAW_FOOTER_COPY, /group Match/u);
    assert.match(POST_POOL_DRAW_FOOTER_COPY, /seats/u);
    assert.equal(drawEntryTitle(false), DRAW_ENTRY_TITLE);
    assert.equal(drawEntryTitle(true), DRAW_ENTRY_DRAFTED_TITLE);
    assert.equal(drawEntryStateLine(8, 12), "8 of 12 Game teams are complete.");
    assert.equal(drawEntryStateLine(1, 1), "1 of 1 Game team is complete.");
    assert.equal(drawDrawerLead(12), `12 Game teams. ${POOL_DRAW_RANDOM_COPY}`);
    assert.equal(drawDrawerLead(null), POOL_DRAW_RANDOM_COPY);
    const copy = [
      DRAW_DRAWER_TITLE,
      DRAW_ENTRY_TITLE,
      DRAW_ENTRY_DRAFTED_TITLE,
      DRAW_ENTRY_ACTION_LABEL,
      DRAW_EMPTY_DRAFT_COPY,
      POST_POOL_DRAW_FOOTER_COPY,
      POOL_DRAW_RANDOM_COPY,
      drawEntryStateLine(12, 12),
      drawDrawerLead(12),
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
    assert.equal(canShowUndoPoolDraw({ ...open, drawPosted: true }), true);
    assert.equal(canShowUndoPoolDraw(open), false);
    assert.equal(
      canShowUndoPoolDraw({
        isOrganizer: false,
        cancelled: false,
        drawPosted: true,
      }),
      false,
    );
    assert.equal(
      canShowUndoPoolDraw({
        isOrganizer: true,
        cancelled: true,
        drawPosted: true,
      }),
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
      poolCount: 2,
      teamCount: 8,
      windowStart: start,
      windowEnd: end,
      courtNames: ["Court 1", "Court 2"],
    });

    assert.deepEqual(pools, [
      {
        poolIndex: 1,
        label: "group 1",
        teams: [
          { id: "a", name: "Ada / Lin" },
          { id: "b", name: "Sofia / Jonas" },
        ],
        dateLines: [formatAbsoluteDay(start)],
        courtNames: ["Court 1", "Court 2"],
      },
      {
        poolIndex: 2,
        label: "group 2",
        teams: [{ id: "c", name: "Kai / Noor" }],
        dateLines: [formatAbsoluteDay(start)],
        courtNames: ["Court 1", "Court 2"],
      },
    ]);
    assert.equal(poolLabel(3), "group 3");
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
        poolCount: 1,
        teamCount: 4,
        windowStart: new Date(),
        windowEnd: new Date(),
        courtNames: ["Court 1"],
      }),
      [],
    );
  });

  it("joins each Pool's dates and Courts into one meta line", () => {
    const day = formatAbsoluteDay(new Date(2026, 8, 20, 18, 0, 0));
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
