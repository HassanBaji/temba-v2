export {
  FRIENDLY_PLAYERS_ALLOWED,
  FRIENDLY_TEAMS_ALLOWED,
  assertGameOrganizer,
  assertMayCreateGameOnGroup,
  assertRegistrationOpen,
  assertUserPassesJoinGate,
  canViewGame,
  getRegistrationStatus,
  isClubGroupGameJoinFrozen,
  isGameOrganizer,
  isGroupMember,
  isRegistrationOpen,
  isStaffRole,
  mayCreateGameOnGroup,
  registeredGameTeamCount,
  registeredUserCount,
  registrationStatusFromState,
  requireGame,
  userPassesJoinGate,
  type GameRow,
  type RegistrationStatus,
} from "~/server/games/access";
export { admit } from "~/server/games/admit";
export {
  assertCourtAssignable,
  assertGameTeamOnGame,
  listAssignableCourts,
  listCourts,
} from "~/server/games/courts";
export { gameById } from "~/server/games/by-id";
export { createGame } from "~/server/games/create";
export {
  FRIENDLY_SET_SHELL_COUNT,
  backfillFriendlySetShells,
  createFriendlyGame,
} from "~/server/games/create-friendly";
export { register } from "~/server/games/register";
export { registerSeat } from "~/server/games/register-seat";
export { moveSeat } from "~/server/games/move-seat";
export { searchPartnerUsers } from "~/server/games/search-partner-users";
export { registerWithPartner } from "~/server/games/register-with-partner";
export { registerTeam } from "~/server/games/register-team";
export { leaveGame } from "~/server/games/leave";
export { leaveWaitlist } from "~/server/games/leave-waitlist";
export { kick } from "~/server/games/kick";
export { listCreateVenues } from "~/server/games/list-create-venues";
export {
  listVenuesForGameCreate,
  assertGameCreateVenueAndCourt,
} from "~/server/games/venue";
export { loadGameCreateVenueContext } from "~/server/games/helpers/load-game-create-venue-context";
export {
  admitCompleteTeam,
  admitIndividualUser,
  assertGameInviteDoorsOpen,
  assertInviteeAllowedOnGame,
  eligibleCompleteTeamsForUser,
  recordTeamInviteLinkConsent,
} from "~/server/games/invites";
export { addMatch, addTournamentMatch } from "~/server/games/add-match";
export { cancelGame } from "~/server/games/cancel";
export { cancelMatch } from "~/server/games/cancel-match";
export { closeRegistration } from "~/server/games/close-registration";
export { kickRegisteredUser } from "~/server/games/kick-registered-user";
export { kickWaitlistEntry } from "~/server/games/kick-waitlist-entry";
export { reopenRegistration } from "~/server/games/reopen-registration";
export { updateFriendlyGameMatchCourt } from "~/server/games/update-friendly-game-match-court";
export { updateGameMatch, updateMatch } from "~/server/games/update-match";
export { updateTournamentMatch } from "~/server/games/update-tournament-match";
export { updateGameCaps } from "~/server/games/update-caps";
export { updateGamePricePerPlayer } from "~/server/games/update-price-per-player";
export { updateGameLevelRange } from "~/server/games/update-level-range";
export { updateGameWindow } from "~/server/games/update-window";
export { addSet, addMatchSet } from "~/server/games/add-set";
export { scoreSet, scoreMatchSet } from "~/server/games/score-set";
export { removeSet, removeMatchSet } from "~/server/games/remove-set";
export { completeMatch } from "~/server/games/complete-match";
export { searchLookupUsers } from "~/server/games/search-lookup-users";
export { sendLookupInvite } from "~/server/games/send-lookup-invite";
export { listLookupInvites } from "~/server/games/list-lookup-invites";
export { revokeLookupInvite } from "~/server/games/revoke-lookup-invite";
export { pendingLookupInvites } from "~/server/games/pending-lookup-invites";
export { acceptLookupInvite } from "~/server/games/accept-lookup-invite";
export { getInviteLink } from "~/server/games/get-invite-link";
export { createInviteLink } from "~/server/games/create-invite-link";
export { previewInviteLink } from "~/server/games/preview-invite-link";
export { acceptInviteLink } from "~/server/games/accept-invite-link";
export {
  assertFullyVacantSide,
  firstFullyVacantSideIndex,
  firstVacantPosition,
  highestOccupiedSideIndex,
  insertIndividualPairOnVacantSide,
  isIndividualSeatGame,
  listGameSides,
  moveToSeat,
  occupySeat,
  otherPosition,
  remainingCapacity,
  setFriendlyMatchSlotForSide,
  sideCount,
  sitsOnCompletedMatch,
  vacateSeat,
  vacantPositionsFromSides,
} from "~/server/games/seats";
export {
  assertMayWriteSets,
  bothSlotsFilled,
  bothSlottedTeamsComplete,
  matchOutcome,
  requireMatchOnGame,
  setWinsForGames,
  userIsOnMatchSlots,
} from "~/server/games/sets";
export {
  listMyGamesHubRows,
  listPublicHubRows,
  toHubListRow,
} from "~/server/games/hub-list-rows";
export type {
  AdmitDb,
  AdmitDoor,
  AdmitParty,
  AdmitPlacement,
  AdmitReason,
  AdmitResult,
  CreateGameInput,
  CreateFriendlyDb,
  CreateFriendlyGameInput,
  CreateFriendlyGameResult,
  GameCreateGroupKind,
  GameCreateVenueContext,
  GameCreateVenueOption,
  GameSide,
  HubListRow,
  HubListSide,
  HubListSideOccupant,
  MatchRow,
  MatchUpdateInput,
  SeatOccupant,
  SeatPosition,
  TournamentMatchInput,
  VacatedSeat,
} from "~/server/games/utils";
export {
  clearMatchSlotsForGameTeam,
  enqueueWaitlistTeam,
  enqueueWaitlistUser,
  leaveRegisteredSeat,
  leaveWaitlistEntry,
  promoteWaitlist,
  removeGameTeamAndPlayers,
} from "~/server/games/waitlist";
