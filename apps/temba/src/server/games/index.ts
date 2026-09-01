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
  listAssignableCourts,
  assertCourtAssignable,
  assertGameTeamOnGame,
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
export {
  addTournamentMatch,
  cancelGame,
  cancelMatch,
  closeRegistration,
  kickRegisteredUser,
  kickWaitlistEntry,
  reopenRegistration,
  updateFriendlyGameMatchCourt,
  updateGameCaps,
  updateGameMatch,
  updateTournamentMatch,
  updateGamePricePerPlayer,
  updateGameWindow,
  type MatchUpdateInput,
  type TournamentMatchInput,
} from "~/server/games/organize";
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
  addMatchSet,
  assertMayWriteSets,
  bothSlotsFilled,
  bothSlottedTeamsComplete,
  completeMatch,
  matchOutcome,
  removeMatchSet,
  requireMatchOnGame,
  scoreMatchSet,
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
  SeatOccupant,
  SeatPosition,
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
