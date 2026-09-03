import { createTRPCRouter } from "~/server/api/trpc";

import { acceptInviteLinkProcedure as acceptInviteLink } from "./acceptInviteLink";
import { acceptLookupInviteProcedure as acceptLookupInvite } from "./acceptLookupInvite";
import { addSportProcedure as addSport } from "./addSport";
import { approveJoinRequestProcedure as approveJoinRequest } from "./approveJoinRequest";
import { approveTeamLinkProcedure as approveTeamLink } from "./approveTeamLink";
import { byId } from "./byId";
import { create } from "./create";
import { createInviteLinkProcedure as createInviteLink } from "./createInviteLink";
import { getInviteLinkProcedure as getInviteLink } from "./getInviteLink";
import { leave } from "./leave";
import { listJoinRequestsProcedure as listJoinRequests } from "./listJoinRequests";
import { listLookupInvitesProcedure as listLookupInvites } from "./listLookupInvites";
import { listMembersProcedure as listMembers } from "./listMembers";
import { listTeamLinkRequestsProcedure as listTeamLinkRequests } from "./listTeamLinkRequests";
import { mineProcedure as mine } from "./mine";
import { pendingLookupInvitesProcedure as pendingLookupInvites } from "./pendingLookupInvites";
import { previewInviteLinkProcedure as previewInviteLink } from "./previewInviteLink";
import { rejectJoinRequestProcedure as rejectJoinRequest } from "./rejectJoinRequest";
import { rejectTeamLinkProcedure as rejectTeamLink } from "./rejectTeamLink";
import { removeSportProcedure as removeSport } from "./removeSport";
import { requestJoinProcedure as requestJoin } from "./requestJoin";
import { requestVenueLinkProcedure as requestVenueLink } from "./requestVenueLink";
import { revokeLookupInviteProcedure as revokeLookupInvite } from "./revokeLookupInvite";
import { searchLiveVenuesProcedure as searchLiveVenues } from "./searchLiveVenues";
import { searchLookupUsersProcedure as searchLookupUsers } from "./searchLookupUsers";
import { sendLookupInviteProcedure as sendLookupInvite } from "./sendLookupInvite";
import { setMemberRoleProcedure as setMemberRole } from "./setMemberRole";
import { softArchiveProcedure as softArchive } from "./softArchive";
import { unarchiveProcedure as unarchive } from "./unarchive";
import { unlinkVenueProcedure as unlinkVenue } from "./unlinkVenue";

export const communitiesRouter = createTRPCRouter({
  create,
  byId,
  listMembers,
  setMemberRole,
  softArchive,
  unarchive,
  leave,
  addSport,
  removeSport,
  listTeamLinkRequests,
  approveTeamLink,
  rejectTeamLink,
  mine,
  requestJoin,
  listJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
  searchLookupUsers,
  sendLookupInvite,
  listLookupInvites,
  revokeLookupInvite,
  pendingLookupInvites,
  acceptLookupInvite,
  getInviteLink,
  createInviteLink,
  previewInviteLink,
  acceptInviteLink,
  searchLiveVenues,
  requestVenueLink,
  unlinkVenue,
});
