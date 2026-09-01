import type { inferRouterInputs } from "@trpc/server";

import type { AppRouter } from "~/server/api/root";

type RouterInputs = inferRouterInputs<AppRouter>;

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;

type AssertTrue<T extends true> = T;

type ExpectedTopLevel =
  | "communities"
  | "games"
  | "groups"
  | "ratings"
  | "teams"
  | "users"
  | "venues";

type ExpectedCommunities =
  | "create"
  | "byId"
  | "listMembers"
  | "setMemberRole"
  | "softArchive"
  | "unarchive"
  | "leave"
  | "addSport"
  | "removeSport"
  | "listTeamLinkRequests"
  | "approveTeamLink"
  | "rejectTeamLink"
  | "mine"
  | "requestJoin"
  | "listJoinRequests"
  | "approveJoinRequest"
  | "rejectJoinRequest"
  | "searchLookupUsers"
  | "sendLookupInvite"
  | "listLookupInvites"
  | "revokeLookupInvite"
  | "pendingLookupInvites"
  | "acceptLookupInvite"
  | "getInviteLink"
  | "createInviteLink"
  | "previewInviteLink"
  | "acceptInviteLink"
  | "searchLiveVenues"
  | "requestVenueLink"
  | "unlinkVenue";

type ExpectedGames =
  | "hello"
  | "listMyGames"
  | "listPublicPickup"
  | "listCreateVenues"
  | "create"
  | "byId"
  | "register"
  | "registerSeat"
  | "moveSeat"
  | "searchPartnerUsers"
  | "registerWithPartner"
  | "registerTeam"
  | "leave"
  | "leaveWaitlist"
  | "kick"
  | "closeRegistration"
  | "reopenRegistration"
  | "cancel"
  | "cancelMatch"
  | "updateWindow"
  | "updatePricePerPlayer"
  | "updateCaps"
  | "listCourts"
  | "addMatch"
  | "updateMatch"
  | "addSet"
  | "scoreSet"
  | "removeSet"
  | "completeMatch"
  | "searchLookupUsers"
  | "sendLookupInvite"
  | "listLookupInvites"
  | "revokeLookupInvite"
  | "pendingLookupInvites"
  | "acceptLookupInvite"
  | "getInviteLink"
  | "createInviteLink"
  | "previewInviteLink"
  | "acceptInviteLink"
  | "getSecretMessage";

type ExpectedGroups =
  | "createClubPublic"
  | "createClubPrivate"
  | "createLoosePublic"
  | "createLoosePrivate"
  | "mineLoose"
  | "mine"
  | "byId"
  | "joinClubPublic"
  | "joinLoosePublic"
  | "leave"
  | "delete"
  | "searchLookupUsers"
  | "sendLookupInvite"
  | "listLookupInvites"
  | "revokeLookupInvite"
  | "pendingLookupInvites"
  | "acceptLookupInvite"
  | "getInviteLink"
  | "createInviteLink"
  | "previewInviteLink"
  | "acceptInviteLink";

type ExpectedRatings = "me" | "selfDeclare";

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
  | "requestLink"
  | "unlink"
  | "dissolve";

type ExpectedUsers = "home";

type ExpectedVenues =
  | "list"
  | "byId"
  | "create"
  | "update"
  | "addCourt"
  | "renameCourt"
  | "deleteCourt"
  | "uploadLogo"
  | "clearLogo"
  | "softArchive"
  | "unarchive"
  | "listPendingLinkRequests"
  | "approveLinkRequest"
  | "rejectLinkRequest";

type _TopLevel = AssertTrue<Equal<keyof RouterInputs, ExpectedTopLevel>>;
type _Communities = AssertTrue<
  Equal<keyof RouterInputs["communities"], ExpectedCommunities>
>;
type _Games = AssertTrue<Equal<keyof RouterInputs["games"], ExpectedGames>>;
type _Groups = AssertTrue<Equal<keyof RouterInputs["groups"], ExpectedGroups>>;
type _Ratings = AssertTrue<
  Equal<keyof RouterInputs["ratings"], ExpectedRatings>
>;
type _Teams = AssertTrue<Equal<keyof RouterInputs["teams"], ExpectedTeams>>;
type _Users = AssertTrue<Equal<keyof RouterInputs["users"], ExpectedUsers>>;
type _Venues = AssertTrue<Equal<keyof RouterInputs["venues"], ExpectedVenues>>;

export type AppRouterShapeChecks = [
  _TopLevel,
  _Communities,
  _Games,
  _Groups,
  _Ratings,
  _Teams,
  _Users,
  _Venues,
];
