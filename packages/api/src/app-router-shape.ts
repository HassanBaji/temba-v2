import type { inferRouterInputs } from "@trpc/server";

import type { AppRouter } from "#src/root";

type RouterInputs = inferRouterInputs<AppRouter>;

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;

type AssertTrue<T extends true> = T;

type ExpectedTopLevel =
  | "bookings"
  | "challenges"
  | "games"
  | "groups"
  | "marks"
  | "notifications"
  | "ratings"
  | "teams"
  | "users"
  | "venues";

type ExpectedBookings =
  | "listBookableVenues"
  | "venueForBooking"
  | "venueAvailability"
  | "create"
  | "listMine"
  | "listForVenue"
  | "byId"
  | "createForVenue"
  | "searchCustomers"
  | "listCustomers"
  | "update"
  | "cancelForVenue"
  | "markNoShow"
  | "cancel"
  | "createGame"
  | "paymentState"
  | "confirmPayment"
  | "retryPayment"
  | "settlePayment"
  | "recordRefund";

type ExpectedChallenges =
  | "listMine"
  | "listOpen"
  | "byId"
  | "listPostOptions"
  | "listProposeOptions"
  | "post"
  | "withdraw"
  | "propose"
  | "changeProposal"
  | "withdrawProposal"
  | "declineProposal"
  | "confirmProposal";

type ExpectedGames =
  | "listMyGames"
  | "listMyMatchHistory"
  | "listPublicPickup"
  | "listCreateVenues"
  | "listCreateGroups"
  | "create"
  | "createTournament"
  | "drawPools"
  | "postPoolDraw"
  | "undoPoolDraw"
  | "tournamentRounds"
  | "generateRounds"
  | "saveRoundPairings"
  | "swapRoundPairing"
  | "postRounds"
  | "enterTournamentScore"
  | "markMatchNotFinished"
  | "byId"
  | "poolTables"
  | "register"
  | "registerSeat"
  | "moveSeat"
  | "setSeatSide"
  | "setTeamSides"
  | "searchPartnerUsers"
  | "listPartnerSuggestions"
  | "registerWithPartner"
  | "registerTeam"
  | "mergeHalfTeams"
  | "leave"
  | "leaveWaitlist"
  | "kick"
  | "previewPlayerByPhone"
  | "addPlayerByPhone"
  | "listGroupMembersToAdd"
  | "addGroupMembers"
  | "closeRegistration"
  | "reopenRegistration"
  | "cancel"
  | "cancelMatch"
  | "updateWindow"
  | "updateName"
  | "updatePricePerPlayer"
  | "updateLevelRange"
  | "updateRoundCount"
  | "updateSeason"
  | "requestLevelRange"
  | "listLevelRangeRequests"
  | "approveLevelRangeRequest"
  | "rejectLevelRangeRequest"
  | "updateCaps"
  | "updateCourt"
  | "listCourts"
  | "addMatch"
  | "updateMatch"
  | "addSet"
  | "scoreSet"
  | "removeSet"
  | "completeMatch"
  | "confirmMatchResult"
  | "footballBoard"
  | "resultLink"
  | "setFootballRole"
  | "publishFootballTeams"
  | "saveFootballScore"
  | "nameChallengeSquad"
  | "performanceRatingSheet"
  | "performanceRatingResult"
  | "performanceRatingSummary"
  | "submitPerformanceRatings"
  | "reportWrongScore"
  | "searchLookupUsers"
  | "sendLookupInvite"
  | "listLookupInvites"
  | "revokeLookupInvite"
  | "pendingLookupInvites"
  | "acceptLookupInvite"
  | "getInviteLink"
  | "createInviteLink"
  | "inviteLinkByShortCode"
  | "previewInviteLink"
  | "acceptInviteLink"
  | "joinGroupFromInviteLink";

type ExpectedGroups =
  | "createLoosePublic"
  | "createLoosePrivate"
  | "mineLoose"
  | "mine"
  | "listPublic"
  | "byId"
  | "joinPublic"
  | "requestJoin"
  | "listJoinRequests"
  | "approveJoinRequest"
  | "rejectJoinRequest"
  | "undoJoinRequestDecision"
  | "withdrawJoinRequest"
  | "setRequiresApproval"
  | "leave"
  | "delete"
  | "edit"
  | "transferOwnership"
  | "searchLookupUsers"
  | "sendLookupInvite"
  | "listLookupInvites"
  | "revokeLookupInvite"
  | "pendingLookupInvites"
  | "acceptLookupInvite"
  | "getInviteLink"
  | "createInviteLink"
  | "resetInviteLink"
  | "inviteLinkByShortCode"
  | "previewInviteLink"
  | "acceptInviteLink"
  | "uploadImage"
  | "clearImage"
  | "setVerified"
  | "listForOperator"
  | "pendingLinkRequests"
  | "acceptLinkRequest"
  | "declineLinkRequest"
  | "unlinkFromVenue"
  | "previewPlayerByPhone"
  | "addPlayerByPhone"
  | "removeUnclaimedPlayer"
  | "removePlayer"
  | "setOrganizer"
  | "listSeasons"
  | "createSeason"
  | "closeSeason"
  | "seasonStanding"
  | "adjustTierPoints"
  | "tierHistory"
  | "ratingSettings"
  | "updateRatingSettings"
  | "myStandings";

type ExpectedMarks =
  | "forGame"
  | "give"
  | "retract"
  | "castMvpVote"
  | "setMvp"
  | "setMvpMode"
  | "cabinet"
  | "kindDetail";

type ExpectedNotifications =
  | "list"
  | "unreadCount"
  | "markRead"
  | "markAllRead";

type ExpectedRatings =
  | "me"
  | "selfDeclare"
  | "setLevel"
  | "listForOperator"
  | "setLevelAsOperator"
  | "myGroupLevels"
  | "setGroupLevel";

type ExpectedTeams =
  | "create"
  | "mine"
  | "pendingInvites"
  | "byId"
  | "searchLookupUsers"
  | "inviteInApp"
  | "listInAppInvites"
  | "revokeInAppInvite"
  | "acceptInAppInvite"
  | "getInviteLink"
  | "createInviteLink"
  | "previewInviteLink"
  | "acceptInviteLink"
  | "dissolve"
  | "leave"
  | "setGroupTag"
  | "previewPlayerByPhone"
  | "addPlayerByPhone"
  | "removeUnclaimedPlayer"
  | "listGroupMembersToAdd"
  | "uploadImage"
  | "clearImage";

type ExpectedUsers =
  | "home"
  | "onboardingState"
  | "profileStats"
  | "playerProfile"
  | "footballProfile"
  | "setPreferredPosition"
  | "setName"
  | "completeOnboarding"
  | "renameUnclaimedPlayer"
  | "myProfile"
  | "profileDetails"
  | "setProfileDetails"
  | "setPlayWindows"
  | "setMatchHistoryVisibility"
  | "setHideRoasts"
  | "setSports"
  | "setFootballPreferences"
  | "setLocale"
  | "setEmailNotifications";

type ExpectedVenues =
  | "list"
  | "byId"
  | "create"
  | "update"
  | "updateDetails"
  | "addCourt"
  | "renameCourt"
  | "setCourtSport"
  | "deleteCourt"
  | "uploadLogo"
  | "clearLogo"
  | "uploadPhoto"
  | "deletePhoto"
  | "setDisplayPhotos"
  | "softArchive"
  | "unarchive"
  | "setPartner"
  | "listLinkedGroups"
  | "searchLinkableGroups"
  | "sendGroupLinkRequest"
  | "cancelGroupLinkRequest"
  | "unlinkGroup"
  | "searchGroupsToLink"
  | "linkGroup"
  | "listManaged"
  | "managedById"
  | "addManager"
  | "removeManager"
  | "searchManagerUsers"
  | "setOpeningHours"
  | "setPricingRules"
  | "addClosure"
  | "removeClosure"
  | "updateBookingSettings"
  | "updateCancellationPolicy";

type _TopLevel = AssertTrue<Equal<keyof RouterInputs, ExpectedTopLevel>>;
type _Bookings = AssertTrue<
  Equal<keyof RouterInputs["bookings"], ExpectedBookings>
>;
type _Challenges = AssertTrue<
  Equal<keyof RouterInputs["challenges"], ExpectedChallenges>
>;
type _Games = AssertTrue<Equal<keyof RouterInputs["games"], ExpectedGames>>;
type _Groups = AssertTrue<Equal<keyof RouterInputs["groups"], ExpectedGroups>>;
type _Marks = AssertTrue<Equal<keyof RouterInputs["marks"], ExpectedMarks>>;
type _Notifications = AssertTrue<
  Equal<keyof RouterInputs["notifications"], ExpectedNotifications>
>;
type _Ratings = AssertTrue<
  Equal<keyof RouterInputs["ratings"], ExpectedRatings>
>;
type _Teams = AssertTrue<Equal<keyof RouterInputs["teams"], ExpectedTeams>>;
type _Users = AssertTrue<Equal<keyof RouterInputs["users"], ExpectedUsers>>;
type _Venues = AssertTrue<Equal<keyof RouterInputs["venues"], ExpectedVenues>>;

export type AppRouterShapeChecks = [
  _Bookings,
  _TopLevel,
  _Challenges,
  _Games,
  _Groups,
  _Marks,
  _Notifications,
  _Ratings,
  _Teams,
  _Users,
  _Venues,
];
