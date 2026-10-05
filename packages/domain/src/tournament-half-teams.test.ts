import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  MERGE_BANNER_ACTION_LABEL,
  MERGE_BANNER_TITLE,
  MERGE_COMPLETES_FIELD_COPY,
  MERGE_DISMISS_ACTION_LABEL,
  MERGE_DRAWER_TITLE,
  MERGE_MANY_TITLE,
  MERGE_OPEN_POSITION_SR,
  MERGE_PREVIEW_LABEL,
  MERGE_PRIMARY_ACTION_LABEL,
  MERGE_SEATS_ACTION_LABEL,
  MERGE_SWAP_LABEL,
  MERGE_TAKES_EFFECT_COPY,
  ORGANIZER_EYEBROW,
  canOpenOrganizerMergeDrawer,
  defaultMergePositions,
  halfTeamMergeHint,
  halfTeamsFromSides,
  mergeCompletesTheField,
  mergeDrawerLead,
  mergeManyHalfTeamsCopy,
  mergeOccupantSubline,
  mergeOpenPositionLabel,
  mergePairCopy,
  mergeSwapHint,
  mergeTeamEyebrow,
  openPositionLabel,
  samePositionMerge,
  showOrganizerMergeBanner,
  swapMergePositions,
} from "./tournament-half-teams";

const FORBIDDEN = /message|notified|Ask them first|quarter|knockout|champion/iu;

const ada = { userId: "ada", name: "Ada", image: null };
const jonas = { userId: "jonas", name: "Jonas", image: null };
const sofia = { userId: "sofia", name: "Sofia", image: null };

describe("halfTeamsFromSides", () => {
  it("lists every Half team and which Position is open", () => {
    const halfTeams = halfTeamsFromSides([
      {
        sideIndex: 1,
        gameTeamId: "team-1",
        left: ada,
        right: null,
      },
      {
        sideIndex: 2,
        gameTeamId: "team-2",
        left: sofia,
        right: jonas,
      },
      {
        sideIndex: 3,
        gameTeamId: "team-3",
        left: null,
        right: jonas,
      },
      {
        sideIndex: 4,
        gameTeamId: null,
        left: null,
        right: null,
      },
    ]);

    assert.deepEqual(halfTeams, [
      {
        gameTeamId: "team-1",
        sideIndex: 1,
        occupant: ada,
        takenPosition: "left",
        openPosition: "right",
      },
      {
        gameTeamId: "team-3",
        sideIndex: 3,
        occupant: jonas,
        takenPosition: "right",
        openPosition: "left",
      },
    ]);
  });
});

describe("half team merge copy", () => {
  it("tells the Organizer that merging two Half teams completes the field", () => {
    const two = halfTeamsFromSides([
      {
        sideIndex: 1,
        gameTeamId: "a",
        left: ada,
        right: null,
      },
      {
        sideIndex: 2,
        gameTeamId: "b",
        left: null,
        right: jonas,
      },
    ]);
    assert.equal(mergeCompletesTheField(two), true);
    assert.equal(halfTeamMergeHint(two.length), MERGE_COMPLETES_FIELD_COPY);
  });

  it("does not claim the field is complete when more than two Half teams remain", () => {
    assert.equal(halfTeamMergeHint(3), null);
    assert.equal(halfTeamMergeHint(1), null);
    assert.equal(mergeCompletesTheField([]), false);
  });

  it("does not claim a message was sent", () => {
    const copy = `${MERGE_COMPLETES_FIELD_COPY} ${MERGE_TAKES_EFFECT_COPY}`;
    assert.equal(/message|notified|sent|email|push/iu.test(copy), false);
  });
});

describe("organizer merge banner", () => {
  const open = {
    isOrganizer: true,
    cancelled: false,
    drawPosted: false,
    halfTeamCount: 2,
  };

  it("appears only for an organizer, before the draw, with exactly two Half teams, on a live Game", () => {
    assert.equal(showOrganizerMergeBanner(open), true);
    assert.equal(
      showOrganizerMergeBanner({ ...open, isOrganizer: false }),
      false,
    );
    assert.equal(showOrganizerMergeBanner({ ...open, cancelled: true }), false);
    assert.equal(
      showOrganizerMergeBanner({ ...open, drawPosted: true }),
      false,
    );
    assert.equal(
      showOrganizerMergeBanner({ ...open, halfTeamCount: 1 }),
      false,
    );
    assert.equal(
      showOrganizerMergeBanner({ ...open, halfTeamCount: 3 }),
      false,
    );
  });

  it("still opens the drawer when three or more Half teams remain", () => {
    assert.equal(canOpenOrganizerMergeDrawer(open), true);
    assert.equal(
      canOpenOrganizerMergeDrawer({ ...open, halfTeamCount: 3 }),
      true,
    );
    assert.equal(
      canOpenOrganizerMergeDrawer({ ...open, halfTeamCount: 1 }),
      false,
    );
    assert.equal(
      canOpenOrganizerMergeDrawer({ ...open, isOrganizer: false }),
      false,
    );
    assert.equal(
      canOpenOrganizerMergeDrawer({ ...open, drawPosted: true }),
      false,
    );
  });

  it("hides the banner and drawer on a partner-required tournament", () => {
    assert.equal(
      showOrganizerMergeBanner({ ...open, partnerRequired: true }),
      false,
    );
    assert.equal(
      canOpenOrganizerMergeDrawer({ ...open, partnerRequired: true }),
      false,
    );
    assert.equal(
      canOpenOrganizerMergeDrawer({
        ...open,
        halfTeamCount: 3,
        partnerRequired: true,
      }),
      false,
    );
  });
});

describe("merge screen copy", () => {
  it("names both Users and says the merge fills the field only for exactly two Half teams", () => {
    assert.equal(
      mergePairCopy({
        firstName: "Rashid N",
        secondName: "Kim H",
        completesField: true,
        teamCount: 12,
      }),
      "Put Rashid and Kim together and the 12 Game teams are full.",
    );
    assert.equal(
      mergePairCopy({
        firstName: "Rashid N",
        secondName: "Kim H",
        completesField: false,
        teamCount: 12,
      }),
      "Put Rashid and Kim together.",
    );
  });

  it("leads the drawer with the same pair, without claiming a full field when more Half teams remain", () => {
    assert.equal(
      mergeDrawerLead({
        firstName: "Rashid N",
        secondName: "Kim H",
        completesField: true,
        teamCount: 12,
      }),
      "Rashid and Kim each took a seat on their own. Put them together and the 12 Game teams are full.",
    );
    assert.equal(
      mergeDrawerLead({
        firstName: "Ada Lovelace",
        secondName: "Jonas B",
        completesField: false,
        teamCount: 12,
      }),
      "Ada and Jonas each took a seat on their own. Put them together into one Game team.",
    );
  });

  it("describes Swap as exchanging the preview Positions", () => {
    assert.equal(
      mergeSwapHint("Kim H", "left"),
      "Kim keeps the left seat instead",
    );
  });

  it("labels the merged preview, open Position, and Half team index without knockout copy", () => {
    assert.equal(mergeTeamEyebrow(12), "TEAM 12");
    assert.equal(mergeOccupantSubline("left", "C+"), "Left, C+");
    assert.equal(mergeOccupantSubline("right", null), "Right");
    assert.equal(mergeOpenPositionLabel("right"), "Right open");
    assert.equal(
      mergeManyHalfTeamsCopy(3),
      "3 Game teams have one Position each.",
    );
  });

  it("does not claim a message, a notification, or a knockout", () => {
    const copy = [
      ORGANIZER_EYEBROW,
      MERGE_BANNER_TITLE,
      MERGE_BANNER_ACTION_LABEL,
      MERGE_DRAWER_TITLE,
      MERGE_PREVIEW_LABEL,
      MERGE_PRIMARY_ACTION_LABEL,
      MERGE_DISMISS_ACTION_LABEL,
      MERGE_SWAP_LABEL,
      MERGE_SEATS_ACTION_LABEL,
      MERGE_MANY_TITLE,
      MERGE_OPEN_POSITION_SR,
      MERGE_TAKES_EFFECT_COPY,
      mergePairCopy({
        firstName: "Rashid N",
        secondName: "Kim H",
        completesField: true,
        teamCount: 12,
      }),
      mergeDrawerLead({
        firstName: "Rashid N",
        secondName: "Kim H",
        completesField: true,
        teamCount: 12,
      }),
      mergeSwapHint("Kim H", "left"),
      mergeManyHalfTeamsCopy(3),
    ].join(" ");
    assert.equal(FORBIDDEN.test(copy), false);
  });
});

describe("merge Position assignment", () => {
  it("keeps the first Half team's Position and puts the other on the opposite", () => {
    assert.deepEqual(defaultMergePositions({ takenPosition: "left" }), {
      firstPosition: "left",
      secondPosition: "right",
    });
    assert.deepEqual(defaultMergePositions({ takenPosition: "right" }), {
      firstPosition: "right",
      secondPosition: "left",
    });
  });

  it("swaps which User plays left", () => {
    assert.deepEqual(
      swapMergePositions({ firstPosition: "left", secondPosition: "right" }),
      { firstPosition: "right", secondPosition: "left" },
    );
  });

  it("detects a merge that would put both Users on the same Position", () => {
    assert.equal(
      samePositionMerge({ firstPosition: "left", secondPosition: "left" }),
      true,
    );
    assert.equal(
      samePositionMerge({ firstPosition: "left", secondPosition: "right" }),
      false,
    );
  });
});

describe("openPositionLabel", () => {
  it("names the vacant Position", () => {
    assert.equal(openPositionLabel("left"), "Open left");
    assert.equal(openPositionLabel("right"), "Open right");
  });
});
