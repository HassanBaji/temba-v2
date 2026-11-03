import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { messagesFor } from "@repo/i18n/messages";

import {
  otherPoolsPlayedLabel,
  roundResultsHeading,
  tournamentSizeLine,
  tournamentStatusLine,
} from "./tournament-home";
import {
  courtCountValue,
  formatMatchesPerTeam,
  formatPoolSizeLine,
  lastMatchFinishCopy,
  playersInPairsLine,
  sizeFriendlyTournament,
} from "./tournament-sizing";

const m = messagesFor("en").tournament;

const ALLOWED_CHAMPION = "There is no overall champion.";
const ALLOWED_SEEDED = "Nobody is seeded.";

const FORBIDDEN =
  /\bquarters?\b|knockout|\bchampion\b|\bseeded\b|\bmessage\b|\bnotified\b|\bkr\b/iu;
const POOL_AS_GROUP = /\bgroups?\b/iu;

function stripAllowed(copy: string) {
  return copy
    .replaceAll(ALLOWED_CHAMPION, "")
    .replaceAll(ALLOWED_SEEDED, "")
    .replaceAll(m.home.groupRow, "")
    .replaceAll(m.home.inviteFromGroup, "")
    .replaceAll(m.sizing.thisGroupOnly, "");
}

function allCopy() {
  const even = sizeFriendlyTournament(12, 3);
  const uneven = sizeFriendlyTournament(10, 3);
  assert.equal(even.ok && uneven.ok, true);
  if (!even.ok || !uneven.ok) {
    return "";
  }
  return [
    tournamentSizeLine(even.sizing, "en"),
    tournamentSizeLine(uneven.sizing, "en"),
    formatPoolSizeLine(even.sizing, "en"),
    formatPoolSizeLine(uneven.sizing, "en"),
    formatMatchesPerTeam(even.sizing, "en"),
    formatMatchesPerTeam(uneven.sizing, "en"),
    playersInPairsLine(12, "en"),
    courtCountValue(2, "en"),
    lastMatchFinishCopy("7:45 PM", "en"),
    tournamentStatusLine({
      seated: false,
      seatsLeft: 5,
      teamCount: 12,
      organizerName: "Jonas B",
      locale: "en",
    }),
    m.home.eyebrowPrefix,
    m.home.yourTeam,
    m.home.leftSeat,
    m.home.rightSeat,
    m.home.openPositionSr,
    m.home.youAreIn,
    m.home.drawRandomClause,
    m.home.drawWhenFull,
    m.home.drawsPoolsWhenFull,
    m.home.closingLine,
    m.home.organizerRow,
    m.home.priceRow,
    m.home.countsForRating,
    m.home.youOweRow,
    m.home.youOweAfterEachMatch,
    m.home.inviteAction,
    m.home.pricePerMatch,
    m.home.teamsHeading,
    m.home.takeSeat,
    m.home.yourTeamTag,
    m.home.seatsHeading,
    m.home.leaveTheSeat,
    m.home.yourRoundsPredrawCaption,
    m.home.notDrawn,
    m.home.standingsHeading,
    m.home.endsCopy,
    m.home.poolsSegment,
    roundResultsHeading(2, "en"),
    otherPoolsPlayedLabel(4, "en"),
    m.poolDraw.notHappened,
    m.poolDraw.opponentsUnknown,
    m.poolDraw.random,
    m.poolDraw.drawPools,
    m.poolDraw.drawAgain,
    m.poolDraw.post,
    m.poolDraw.undo,
    m.poolDraw.drawerTitle,
    m.poolDraw.entryTitle,
    m.poolDraw.entryDraftedTitle,
    m.poolDraw.entryAction,
    m.poolDraw.emptyDraft,
    m.poolDraw.postFooter,
    m.halfTeams.organizerEyebrow,
    m.halfTeams.mergeCompletesField,
    m.halfTeams.takesEffect,
    m.halfTeams.bannerTitle,
    m.halfTeams.bannerAction,
    m.halfTeams.drawerTitle,
    m.halfTeams.previewLabel,
    m.halfTeams.primaryAction,
    m.halfTeams.dismissAction,
    m.halfTeams.swap,
    m.halfTeams.mergeSeats,
    m.halfTeams.manyTitle,
    m.halfTeams.samePosition,
    m.halfTeams.openPositionSr,
    m.join.takeASeatTitle,
    m.join.sitWithSomeone,
    m.join.startATeam,
    m.join.startATeamSubline,
    m.join.yourSeat,
    m.join.taken,
    m.join.roundsRow,
    m.join.drawRow,
    m.join.drawRandom,
    m.join.pricePerPlayer,
    m.join.introSuffix,
    m.join.leaveSeatUntilPoolDraw,
    m.join.partnerVacantSideRace,
    m.join.partnerUnseatedConfirm,
    m.join.partnerInviteLanding,
    m.poolTable.heading,
    m.poolTable.winner,
    m.poolTable.finished,
    m.poolTable.yourRounds,
    m.poolTable.results,
    m.sizing.createHeading,
    m.sizing.createSubline,
    m.sizing.createFooter,
    m.sizing.unevenPools,
    m.sizing.poolMatchesRow,
    m.sizing.matchesPerTeamRow,
    m.sizing.eachMatchRow,
    m.sizing.courtsRow,
    m.sizing.oneDayCallout,
    m.sizing.createPrimaryAction,
    m.sizing.howLongItRuns,
    m.sizing.oneDay,
    m.sizing.fewWeeks,
    m.sizing.whoCanTakeASeat,
    m.sizing.anyoneWithTheLink,
    m.sizing.howPeopleJoin,
    m.sizing.aloneOrWithPartner,
    m.sizing.withPartnerOnly,
    m.sizing.oneDayOverrun,
  ].join("\n");
}

describe("Pool tournament copy sweep", () => {
  it("keeps the allowed champion and seeded sentences", () => {
    assert.equal(
      m.home.endsCopy,
      "Each group has a winner. There is no overall champion.",
    );
    assert.equal(
      m.poolDraw.random,
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
      tournamentSizeLine(even.sizing, "en"),
      tournamentSizeLine(uneven.sizing, "en"),
      formatPoolSizeLine(even.sizing, "en"),
      formatPoolSizeLine(uneven.sizing, "en"),
      formatMatchesPerTeam(uneven.sizing, "en"),
      m.sizing.unevenPools,
      m.home.poolsSegment,
      m.poolTable.heading,
      m.poolTable.winner,
      m.sizing.poolMatchesRow,
      m.poolDraw.entryTitle,
      m.poolDraw.entryDraftedTitle,
      m.poolDraw.emptyDraft,
      m.poolDraw.postFooter,
      m.poolDraw.random,
      m.home.endsCopy,
    ].join("\n");
    assert.equal(POOL_AS_GROUP.test(poolCopy), true);
    assert.equal(/\bPool\b/u.test(poolCopy), false);
    assert.equal(/\bGroup\b/u.test(poolCopy), false);
  });

  it("names the Community Group only on the Group row and invite/create seat labels", () => {
    assert.equal(m.home.groupRow, "Group");
    assert.match(m.home.inviteFromGroup, /group/iu);
    assert.match(m.sizing.thisGroupOnly, /Group/u);
  });
});
