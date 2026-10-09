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
} from "#src/games/access";
export { admit } from "#src/games/admit";
export { assertPoolDrawNotPosted } from "#src/games/assert-pool-draw-not-posted";
export { assertCourtAssignable } from "#src/games/assert-court-assignable";
export { assertGameTeamOnGame } from "#src/games/assert-game-team-on-game";
export { userAllowedByLevelRange } from "#src/games/user-allowed-by-level-range";
export {
  FRIENDLY_SET_SHELL_COUNT,
  backfillFriendlySetShells,
  createFriendlyGame,
} from "#src/games/create-friendly";
export { assertGameCreateVenueAndCourt } from "#src/games/assert-game-create-venue-and-court";
export { loadGameCreateVenueContext } from "#src/games/helpers/load-game-create-venue-context";
export { updateFriendlyGameMatchCourt } from "#src/games/update-friendly-game-match-court";
export { updateTournamentMatch } from "#src/games/update-tournament-match";
export {
  admitCompleteTeam,
  admitIndividualUser,
  assertGameInviteDoorsOpen,
  assertInviteeAllowedOnGame,
  eligibleCompleteTeamsForUser,
  recordTeamInviteLinkConsent,
} from "#src/games/invites";
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
} from "#src/games/seats";
export { assertMayWriteSets } from "#src/games/assert-may-write-sets";
export { bothSlotsFilled } from "#src/games/both-slots-filled";
export { bothSlottedTeamsComplete } from "#src/games/both-slotted-teams-complete";
export { matchOutcome } from "@repo/domain/match-outcome";
export { requireMatchOnGame } from "#src/games/require-match-on-game";
export { setWinsForGames } from "@repo/domain/set-wins-for-games";
export { userIsOnMatchSlots } from "#src/games/user-is-on-match-slots";
export { toHubListRow } from "#src/games/helpers/hub-list";
export { listMyGamesHubRows } from "#src/games/list-my-games";
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
} from "#src/games/utils";
export { clearMatchSlotsForGameTeam } from "#src/games/clear-match-slots-for-game-team";
export { enqueueWaitlistTeam } from "#src/games/enqueue-waitlist-team";
export { enqueueWaitlistUser } from "#src/games/enqueue-waitlist-user";
export { leaveRegisteredSeat } from "#src/games/leave-registered-seat";
export { leaveWaitlistEntry } from "#src/games/leave-waitlist-entry";
export { promoteWaitlist } from "#src/games/promote-waitlist";
export { removeGameTeamAndPlayers } from "#src/games/remove-game-team-and-players";
