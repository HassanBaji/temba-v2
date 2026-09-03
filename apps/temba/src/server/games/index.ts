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
export { assertCourtAssignable } from "~/server/games/assert-court-assignable";
export { assertGameTeamOnGame } from "~/server/games/assert-game-team-on-game";
export { userAllowedByLevelRange } from "~/server/games/user-allowed-by-level-range";
export {
  FRIENDLY_SET_SHELL_COUNT,
  backfillFriendlySetShells,
  createFriendlyGame,
} from "~/server/games/create-friendly";
export { assertGameCreateVenueAndCourt } from "~/server/games/assert-game-create-venue-and-court";
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
export { assertMayWriteSets } from "~/server/games/assert-may-write-sets";
export { bothSlotsFilled } from "~/server/games/both-slots-filled";
export { bothSlottedTeamsComplete } from "~/server/games/both-slotted-teams-complete";
export { matchOutcome } from "~/server/games/match-outcome";
export { requireMatchOnGame } from "~/server/games/require-match-on-game";
export { setWinsForGames } from "~/server/games/set-wins-for-games";
export { userIsOnMatchSlots } from "~/server/games/user-is-on-match-slots";
export { toHubListRow } from "~/server/games/helpers/hub-list";
export { listMyGamesHubRows } from "~/server/games/list-my-games";
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
export { clearMatchSlotsForGameTeam } from "~/server/games/clear-match-slots-for-game-team";
export { enqueueWaitlistTeam } from "~/server/games/enqueue-waitlist-team";
export { enqueueWaitlistUser } from "~/server/games/enqueue-waitlist-user";
export { leaveRegisteredSeat } from "~/server/games/leave-registered-seat";
export { leaveWaitlistEntry } from "~/server/games/leave-waitlist-entry";
export { promoteWaitlist } from "~/server/games/promote-waitlist";
export { removeGameTeamAndPlayers } from "~/server/games/remove-game-team-and-players";
