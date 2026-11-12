import { createTRPCRouter } from "#src/trpc";

import { acceptInviteLinkProcedure as acceptInviteLink } from "./acceptInviteLink";
import { acceptLookupInviteProcedure as acceptLookupInvite } from "./acceptLookupInvite";
import { addGroupMembersProcedure as addGroupMembers } from "./addGroupMembers";
import { addMatchProcedure as addMatch } from "./addMatch";
import { addPlayerByPhoneProcedure as addPlayerByPhone } from "./addPlayerByPhone";
import { addSetProcedure as addSet } from "./addSet";
import { approveLevelRangeRequestProcedure as approveLevelRangeRequest } from "./approveLevelRangeRequest";
import { byId } from "./byId";
import { cancel } from "./cancel";
import { cancelMatchProcedure as cancelMatch } from "./cancelMatch";
import { closeRegistrationProcedure as closeRegistration } from "./closeRegistration";
import { completeMatchProcedure as completeMatch } from "./completeMatch";
import { confirmMatchResultProcedure as confirmMatchResult } from "./confirmMatchResult";
import { create } from "./create";
import { createInviteLinkProcedure as createInviteLink } from "./createInviteLink";
import { createTournamentProcedure as createTournament } from "./createTournament";
import { decideDisputeProcedure as decideDispute } from "./decideDispute";
import { disputeMatchResultProcedure as disputeMatchResult } from "./disputeMatchResult";
import { drawPoolsProcedure as drawPools } from "./drawPools";
import { footballBoardProcedure as footballBoard } from "./footballBoard";
import { getInviteLinkProcedure as getInviteLink } from "./getInviteLink";
import { joinGroupFromInviteLinkProcedure as joinGroupFromInviteLink } from "./joinGroupFromInviteLink";
import { kickProcedure as kick } from "./kick";
import { leave } from "./leave";
import { leaveWaitlistProcedure as leaveWaitlist } from "./leaveWaitlist";
import { listCourtsProcedure as listCourts } from "./listCourts";
import { listCreateGroupsProcedure as listCreateGroups } from "./listCreateGroups";
import { listCreateVenues } from "./listCreateVenues";
import { listDisputesForOperatorProcedure as listDisputesForOperator } from "./listDisputesForOperator";
import { listGroupMembersToAddProcedure as listGroupMembersToAdd } from "./listGroupMembersToAdd";
import { listLevelRangeRequestsProcedure as listLevelRangeRequests } from "./listLevelRangeRequests";
import { listLookupInvitesProcedure as listLookupInvites } from "./listLookupInvites";
import { listMyGames } from "./listMyGames";
import { listMyMatchHistory } from "./listMyMatchHistory";
import { listPartnerSuggestionsProcedure as listPartnerSuggestions } from "./listPartnerSuggestions";
import { listPublicPickup } from "./listPublicPickup";
import { mergeHalfTeamsProcedure as mergeHalfTeams } from "./mergeHalfTeams";
import { moveSeatProcedure as moveSeat } from "./moveSeat";
import { setSeatSideProcedure as setSeatSide } from "./setSeatSide";
import { setTeamSidesProcedure as setTeamSides } from "./setTeamSides";
import { pendingLookupInvitesProcedure as pendingLookupInvites } from "./pendingLookupInvites";
import { performanceRatingResultProcedure as performanceRatingResult } from "./performanceRatingResult";
import { performanceRatingSheetProcedure as performanceRatingSheet } from "./performanceRatingSheet";
import { performanceRatingSummaryProcedure as performanceRatingSummary } from "./performanceRatingSummary";
import { poolTablesProcedure as poolTables } from "./poolTables";
import { postPoolDrawProcedure as postPoolDraw } from "./postPoolDraw";
import { enterTournamentScoreProcedure as enterTournamentScore } from "./enterTournamentScore";
import { generateRoundsProcedure as generateRounds } from "./generateRounds";
import { markMatchNotFinishedProcedure as markMatchNotFinished } from "./markMatchNotFinished";
import { postRoundsProcedure as postRounds } from "./postRounds";
import { saveRoundPairingsProcedure as saveRoundPairings } from "./saveRoundPairings";
import { swapRoundPairingProcedure as swapRoundPairing } from "./swapRoundPairing";
import { tournamentRoundsProcedure as tournamentRounds } from "./tournamentRounds";
import { inviteLinkByShortCodeProcedure as inviteLinkByShortCode } from "./inviteLinkByShortCode";
import { nameChallengeSquadProcedure as nameChallengeSquad } from "./nameChallengeSquad";
import { previewInviteLinkProcedure as previewInviteLink } from "./previewInviteLink";
import { previewPlayerByPhoneProcedure as previewPlayerByPhone } from "./previewPlayerByPhone";
import { publishFootballTeamsProcedure as publishFootballTeams } from "./publishFootballTeams";
import { registerProcedure as register } from "./register";
import { submitPerformanceRatingsProcedure as submitPerformanceRatings } from "./submitPerformanceRatings";
import { registerSeatProcedure as registerSeat } from "./registerSeat";
import { registerTeamProcedure as registerTeam } from "./registerTeam";
import { registerWithPartnerProcedure as registerWithPartner } from "./registerWithPartner";
import { rejectLevelRangeRequestProcedure as rejectLevelRangeRequest } from "./rejectLevelRangeRequest";
import { removeSetProcedure as removeSet } from "./removeSet";
import { reopenRegistrationProcedure as reopenRegistration } from "./reopenRegistration";
import { reportWrongScoreProcedure as reportWrongScore } from "./reportWrongScore";
import { resultLinkProcedure as resultLink } from "./resultLink";
import { requestLevelRangeProcedure as requestLevelRange } from "./requestLevelRange";
import { revokeLookupInviteProcedure as revokeLookupInvite } from "./revokeLookupInvite";
import { saveFootballScoreProcedure as saveFootballScore } from "./saveFootballScore";
import { scoreSetProcedure as scoreSet } from "./scoreSet";
import { searchLookupUsersProcedure as searchLookupUsers } from "./searchLookupUsers";
import { searchPartnerUsersProcedure as searchPartnerUsers } from "./searchPartnerUsers";
import { sendLookupInviteProcedure as sendLookupInvite } from "./sendLookupInvite";
import { setFootballRoleProcedure as setFootballRole } from "./setFootballRole";
import { stampMatchProcedure as stampMatch } from "./stampMatch";
import { undoPoolDrawProcedure as undoPoolDraw } from "./undoPoolDraw";
import { updateCaps } from "./updateCaps";
import { updateCourt } from "./updateCourt";
import { updateLevelRange } from "./updateLevelRange";
import { updateMatchProcedure as updateMatch } from "./updateMatch";
import { updateName } from "./updateName";
import { updatePricePerPlayer } from "./updatePricePerPlayer";
import { updateRoundCount } from "./updateRoundCount";
import { updateSeason } from "./updateSeason";
import { updateWindow } from "./updateWindow";

export const gamesRouter = createTRPCRouter({
  listMyGames,
  listMyMatchHistory,
  listPublicPickup,
  listCreateVenues,
  listCreateGroups,
  create,
  createTournament,
  drawPools,
  postPoolDraw,
  undoPoolDraw,
  tournamentRounds,
  generateRounds,
  saveRoundPairings,
  swapRoundPairing,
  postRounds,
  enterTournamentScore,
  markMatchNotFinished,
  byId,
  poolTables,
  register,
  registerSeat,
  moveSeat,
  setSeatSide,
  setTeamSides,
  searchPartnerUsers,
  listPartnerSuggestions,
  registerWithPartner,
  registerTeam,
  mergeHalfTeams,
  leave,
  leaveWaitlist,
  kick,
  previewPlayerByPhone,
  addPlayerByPhone,
  listGroupMembersToAdd,
  addGroupMembers,
  closeRegistration,
  reopenRegistration,
  cancel,
  cancelMatch,
  updateWindow,
  updateName,
  updatePricePerPlayer,
  updateLevelRange,
  updateRoundCount,
  updateSeason,
  requestLevelRange,
  listLevelRangeRequests,
  approveLevelRangeRequest,
  rejectLevelRangeRequest,
  updateCaps,
  updateCourt,
  listCourts,
  addMatch,
  updateMatch,
  addSet,
  scoreSet,
  removeSet,
  completeMatch,
  confirmMatchResult,
  stampMatch,
  disputeMatchResult,
  listDisputesForOperator,
  decideDispute,
  reportWrongScore,
  footballBoard,
  resultLink,
  setFootballRole,
  publishFootballTeams,
  saveFootballScore,
  nameChallengeSquad,
  performanceRatingSheet,
  performanceRatingResult,
  performanceRatingSummary,
  submitPerformanceRatings,
  searchLookupUsers,
  sendLookupInvite,
  listLookupInvites,
  revokeLookupInvite,
  pendingLookupInvites,
  acceptLookupInvite,
  getInviteLink,
  createInviteLink,
  inviteLinkByShortCode,
  previewInviteLink,
  acceptInviteLink,
  joinGroupFromInviteLink,
});
