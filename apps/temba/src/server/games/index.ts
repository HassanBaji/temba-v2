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
} from "~/server/games/courts";
export { userAllowedByLevelRange } from "~/server/games/user-allowed-by-level-range";
export {
  FRIENDLY_SET_SHELL_COUNT,
  backfillFriendlySetShells,
  createFriendlyGame,
} from "~/server/games/create-friendly";
export { assertGameCreateVenueAndCourt } from "~/server/games/venue";
export { loadGameCreateVenueContext } from "~/server/games/helpers/load-game-create-venue-context";
export { updateFriendlyGameMatchCourt } from "~/server/games/update-friendly-game-match-court";
export { updateTournamentMatch } from "~/server/games/update-tournament-match";
export {
  admitCompleteTeam,
  admitIndividualUser,
  assertGameInviteDoorsOpen,
  assertInviteeAllowedOnGame,
  eligibleCompleteTeamsForUser,
  recordTeamInviteLinkConsent,
} from "~/server/games/invites";
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
export { listMyGamesHubRows, toHubListRow } from "~/server/games/hub-list-rows";
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
