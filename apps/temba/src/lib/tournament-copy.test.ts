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
  MERGE_SAME_POSITION_COPY,
  MERGE_SEATS_ACTION_LABEL,
  MERGE_SWAP_LABEL,
  MERGE_TAKES_EFFECT_COPY,
  ORGANIZER_EYEBROW,
} from "~/lib/tournament-half-teams";
import {
  COUNTS_FOR_RATING_LABEL,
  COUNTS_FOR_RATING_YES,
  GROUP_ROW_LABEL,
  INVITE_ACTION_LABEL,
  INVITE_FROM_A_GROUP_LABEL,
  LEAVE_THE_SEAT_LABEL,
  LEFT_SEAT_LABEL,
  NOT_DRAWN_TRAILER,
  OPEN_POSITION_SR_LABEL,
  ORGANIZER_ROW_LABEL,
  POOLS_SEGMENT_LABEL,
  PRICE_PER_MATCH_SUFFIX,
  PRICE_ROW_LABEL,
  RIGHT_SEAT_LABEL,
  SEATS_HEADING,
  STANDINGS_HEADING,
  TAKE_SEAT_LABEL,
  TEAMS_HEADING,
  TOURNAMENT_CLOSING_LINE,
  TOURNAMENT_DRAW_RANDOM_CLAUSE,
  TOURNAMENT_DRAW_WHEN_FULL_COPY,
  TOURNAMENT_DRAWS_POOLS_WHEN_FULL_COPY,
  TOURNAMENT_ENDS_COPY,
  TOURNAMENT_EYEBROW_PREFIX,
  TOURNAMENT_YOU_ARE_IN_COPY,
  YOU_OWE_AFTER_EACH_MATCH,
  YOU_OWE_ROW_LABEL,
  YOUR_ROUNDS_PREDRAW_CAPTION,
  YOUR_TEAM_LABEL,
  YOUR_TEAM_TAG,
  otherPoolsPlayedLabel,
  roundResultsHeading,
  tournamentSizeLine,
  tournamentStatusLine,
} from "~/lib/tournament-home";
import {
  DRAW_RANDOM_VALUE,
  DRAW_ROW_LABEL,
  JOIN_SHEET_INTRO_SUFFIX,
  LEAVE_SEAT_UNTIL_POOL_DRAW_COPY,
  PARTNER_REQUIRED_INVITE_LANDING_COPY,
  PARTNER_REQUIRED_UNSEAT_PARTNER_CONFIRM_COPY,
  PARTNER_REQUIRED_VACANT_SIDE_RACE_MESSAGE,
  PRICE_PER_PLAYER_JOIN_SUFFIX,
  ROUNDS_ROW_LABEL,
  SIT_WITH_SOMEONE_HEADING,
  START_A_TEAM_ON_YOUR_OWN_LABEL,
  START_A_TEAM_ON_YOUR_OWN_SUBLINE,
  TAKE_A_SEAT_TITLE,
  TAKEN_SEAT_LABEL,
  YOUR_SEAT_HEADING,
} from "~/lib/tournament-join";
import {
  DRAW_AGAIN_ACTION,
  DRAW_DRAWER_TITLE,
  DRAW_EMPTY_DRAFT_COPY,
  DRAW_ENTRY_ACTION_LABEL,
  DRAW_ENTRY_DRAFTED_TITLE,
  DRAW_ENTRY_TITLE,
  DRAW_POOLS_ACTION,
  OPPONENTS_UNKNOWN_COPY,
  POOL_DRAW_NOT_HAPPENED_COPY,
  POOL_DRAW_RANDOM_COPY,
  POST_POOL_DRAW_ACTION,
  POST_POOL_DRAW_FOOTER_COPY,
  UNDO_POOL_DRAW_ACTION,
} from "~/lib/tournament-pool-draw";
import {
  POOL_RESULTS_HEADING,
  POOL_TABLE_HEADING,
  POOL_WINNER_LABEL,
  TOURNAMENT_FINISHED_COPY,
  UNPLAYED_RECORD_DISPLAY,
  YOUR_ROUNDS_HEADING,
} from "~/lib/tournament-pool-table";
import {
  ALONE_OR_WITH_A_PARTNER_LABEL,
  ANYONE_WITH_THE_LINK_LABEL,
  COURTS_ROW_LABEL,
  CREATE_FOOTER_COPY,
  CREATE_PRIMARY_ACTION,
  CREATE_SUBLINE,
  CREATE_TOURNAMENT_HEADING,
  EACH_MATCH_ROW_LABEL,
  FEW_WEEKS_DURATION_LABEL,
  HOW_LONG_IT_RUNS_LABEL,
  HOW_PEOPLE_JOIN_LABEL,
  MATCHES_PER_TEAM_ROW_LABEL,
  ONE_DAY_CALLOUT_LABEL,
  ONE_DAY_DURATION_LABEL,
  ONE_DAY_OVERRUN_MESSAGE,
  POOL_MATCHES_ROW_LABEL,
  THIS_GROUP_ONLY_LABEL,
  UNEVEN_POOLS_COPY,
  WHO_CAN_TAKE_A_SEAT_LABEL,
  WITH_A_PARTNER_ONLY_LABEL,
  courtCountValue,
  formatMatchesPerTeam,
  formatPoolSizeLine,
  lastMatchFinishCopy,
  playersInPairsLine,
  sizeFriendlyTournament,
} from "~/lib/tournament-sizing";

const ALLOWED_CHAMPION = "There is no overall champion.";
const ALLOWED_SEEDED = "Nobody is seeded.";

const FORBIDDEN =
  /\bquarters?\b|knockout|\bchampion\b|\bseeded\b|\bmessage\b|\bnotified\b|\bkr\b/iu;
const POOL_AS_GROUP = /\bgroups?\b/iu;

function stripAllowed(copy: string) {
  return copy
    .replaceAll(ALLOWED_CHAMPION, "")
    .replaceAll(ALLOWED_SEEDED, "")
    .replaceAll(GROUP_ROW_LABEL, "")
    .replaceAll(INVITE_FROM_A_GROUP_LABEL, "")
    .replaceAll(THIS_GROUP_ONLY_LABEL, "");
}

function allCopy() {
  const even = sizeFriendlyTournament(12, 3);
  const uneven = sizeFriendlyTournament(10, 3);
  assert.equal(even.ok && uneven.ok, true);
  if (!even.ok || !uneven.ok) {
    return "";
  }
  return [
    tournamentSizeLine(even.sizing),
    tournamentSizeLine(uneven.sizing),
    formatPoolSizeLine(even.sizing),
    formatPoolSizeLine(uneven.sizing),
    formatMatchesPerTeam(even.sizing),
    formatMatchesPerTeam(uneven.sizing),
    playersInPairsLine(12),
    courtCountValue(2),
    lastMatchFinishCopy("7:45 PM"),
    tournamentStatusLine({
      seated: false,
      seatsLeft: 5,
      teamCount: 12,
      organizerName: "Jonas B",
    }),
    TOURNAMENT_EYEBROW_PREFIX,
    YOUR_TEAM_LABEL,
    LEFT_SEAT_LABEL,
    RIGHT_SEAT_LABEL,
    OPEN_POSITION_SR_LABEL,
    TOURNAMENT_YOU_ARE_IN_COPY,
    TOURNAMENT_DRAW_RANDOM_CLAUSE,
    TOURNAMENT_DRAW_WHEN_FULL_COPY,
    TOURNAMENT_DRAWS_POOLS_WHEN_FULL_COPY,
    TOURNAMENT_CLOSING_LINE,
    ORGANIZER_ROW_LABEL,
    PRICE_ROW_LABEL,
    COUNTS_FOR_RATING_LABEL,
    COUNTS_FOR_RATING_YES,
    YOU_OWE_ROW_LABEL,
    YOU_OWE_AFTER_EACH_MATCH,
    INVITE_ACTION_LABEL,
    PRICE_PER_MATCH_SUFFIX,
    TEAMS_HEADING,
    TAKE_SEAT_LABEL,
    YOUR_TEAM_TAG,
    SEATS_HEADING,
    LEAVE_THE_SEAT_LABEL,
    YOUR_ROUNDS_PREDRAW_CAPTION,
    NOT_DRAWN_TRAILER,
    STANDINGS_HEADING,
    TOURNAMENT_ENDS_COPY,
    POOLS_SEGMENT_LABEL,
    roundResultsHeading(2),
    otherPoolsPlayedLabel(4),
    POOL_DRAW_NOT_HAPPENED_COPY,
    OPPONENTS_UNKNOWN_COPY,
    POOL_DRAW_RANDOM_COPY,
    DRAW_POOLS_ACTION,
    DRAW_AGAIN_ACTION,
    POST_POOL_DRAW_ACTION,
    UNDO_POOL_DRAW_ACTION,
    DRAW_DRAWER_TITLE,
    DRAW_ENTRY_TITLE,
    DRAW_ENTRY_DRAFTED_TITLE,
    DRAW_ENTRY_ACTION_LABEL,
    DRAW_EMPTY_DRAFT_COPY,
    POST_POOL_DRAW_FOOTER_COPY,
    ORGANIZER_EYEBROW,
    MERGE_COMPLETES_FIELD_COPY,
    MERGE_TAKES_EFFECT_COPY,
    MERGE_BANNER_TITLE,
    MERGE_BANNER_ACTION_LABEL,
    MERGE_DRAWER_TITLE,
    MERGE_PREVIEW_LABEL,
    MERGE_PRIMARY_ACTION_LABEL,
    MERGE_DISMISS_ACTION_LABEL,
    MERGE_SWAP_LABEL,
    MERGE_SEATS_ACTION_LABEL,
    MERGE_MANY_TITLE,
    MERGE_SAME_POSITION_COPY,
    MERGE_OPEN_POSITION_SR,
    TAKE_A_SEAT_TITLE,
    SIT_WITH_SOMEONE_HEADING,
    START_A_TEAM_ON_YOUR_OWN_LABEL,
    START_A_TEAM_ON_YOUR_OWN_SUBLINE,
    YOUR_SEAT_HEADING,
    TAKEN_SEAT_LABEL,
    ROUNDS_ROW_LABEL,
    DRAW_ROW_LABEL,
    DRAW_RANDOM_VALUE,
    PRICE_PER_PLAYER_JOIN_SUFFIX,
    JOIN_SHEET_INTRO_SUFFIX,
    LEAVE_SEAT_UNTIL_POOL_DRAW_COPY,
    PARTNER_REQUIRED_VACANT_SIDE_RACE_MESSAGE,
    PARTNER_REQUIRED_UNSEAT_PARTNER_CONFIRM_COPY,
    PARTNER_REQUIRED_INVITE_LANDING_COPY,
    POOL_TABLE_HEADING,
    POOL_WINNER_LABEL,
    TOURNAMENT_FINISHED_COPY,
    YOUR_ROUNDS_HEADING,
    POOL_RESULTS_HEADING,
    UNPLAYED_RECORD_DISPLAY,
    CREATE_TOURNAMENT_HEADING,
    CREATE_SUBLINE,
    CREATE_FOOTER_COPY,
    UNEVEN_POOLS_COPY,
    POOL_MATCHES_ROW_LABEL,
    MATCHES_PER_TEAM_ROW_LABEL,
    EACH_MATCH_ROW_LABEL,
    COURTS_ROW_LABEL,
    ONE_DAY_CALLOUT_LABEL,
    CREATE_PRIMARY_ACTION,
    HOW_LONG_IT_RUNS_LABEL,
    ONE_DAY_DURATION_LABEL,
    FEW_WEEKS_DURATION_LABEL,
    WHO_CAN_TAKE_A_SEAT_LABEL,
    ANYONE_WITH_THE_LINK_LABEL,
    HOW_PEOPLE_JOIN_LABEL,
    ALONE_OR_WITH_A_PARTNER_LABEL,
    WITH_A_PARTNER_ONLY_LABEL,
    ONE_DAY_OVERRUN_MESSAGE,
  ].join("\n");
}

describe("Pool tournament copy sweep", () => {
  it("keeps the allowed champion and seeded sentences", () => {
    assert.equal(
      TOURNAMENT_ENDS_COPY,
      "Each group has a winner. There is no overall champion.",
    );
    assert.equal(
      POOL_DRAW_RANDOM_COPY,
      "The group draw is random. Nobody is seeded.",
    );
  });

  it("has none of the forbidden words outside the allowed sentences", () => {
    const copy = stripAllowed(allCopy());
    assert.equal(FORBIDDEN.test(copy), false);
  });

  it("labels Pools as groups in the UI", () => {
    const even = sizeFriendlyTournament(12, 3);
    const uneven = sizeFriendlyTournament(10, 3);
    assert.equal(even.ok && uneven.ok, true);
    if (!even.ok || !uneven.ok) {
      return;
    }
    const poolCopy = [
      tournamentSizeLine(even.sizing),
      tournamentSizeLine(uneven.sizing),
      formatPoolSizeLine(even.sizing),
      formatPoolSizeLine(uneven.sizing),
      formatMatchesPerTeam(uneven.sizing),
      UNEVEN_POOLS_COPY,
      POOLS_SEGMENT_LABEL,
      POOL_TABLE_HEADING,
      POOL_WINNER_LABEL,
      POOL_MATCHES_ROW_LABEL,
      DRAW_ENTRY_TITLE,
      DRAW_ENTRY_DRAFTED_TITLE,
      DRAW_EMPTY_DRAFT_COPY,
      POST_POOL_DRAW_FOOTER_COPY,
      POOL_DRAW_RANDOM_COPY,
      TOURNAMENT_ENDS_COPY,
    ].join("\n");
    assert.equal(POOL_AS_GROUP.test(poolCopy), true);
    assert.equal(/\bPool\b/u.test(poolCopy), false);
    assert.equal(/\bGroup\b/u.test(poolCopy), false);
  });

  it("names the Community Group only on the Group row and invite/create seat labels", () => {
    assert.equal(GROUP_ROW_LABEL, "Group");
    assert.match(INVITE_FROM_A_GROUP_LABEL, /group/iu);
    assert.match(THIS_GROUP_ONLY_LABEL, /Group/u);
  });
});
