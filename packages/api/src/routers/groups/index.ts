import { createTRPCRouter } from "#src/trpc";

import { acceptInviteLinkProcedure as acceptInviteLink } from "./acceptInviteLink";
import { acceptLinkRequestProcedure as acceptLinkRequest } from "./acceptLinkRequest";
import { acceptLookupInviteProcedure as acceptLookupInvite } from "./acceptLookupInvite";
import { adjustTierPointsProcedure as adjustTierPoints } from "./adjustTierPoints";
import { addPlayerByPhoneProcedure as addPlayerByPhone } from "./addPlayerByPhone";
import { approveJoinRequestProcedure as approveJoinRequest } from "./approveJoinRequest";
import { byId } from "./byId";
import { clearImageProcedure as clearImage } from "./clearImage";
import { closeSeasonProcedure as closeSeason } from "./closeSeason";
import { createInviteLinkProcedure as createInviteLink } from "./createInviteLink";
import { createLoosePrivateProcedure as createLoosePrivate } from "./createLoosePrivate";
import { createLoosePublicProcedure as createLoosePublic } from "./createLoosePublic";
import { createSeasonProcedure as createSeason } from "./createSeason";
import { declineLinkRequestProcedure as declineLinkRequest } from "./declineLinkRequest";
import { deleteProcedure } from "./delete";
import { editProcedure as edit } from "./edit";
import { getInviteLinkProcedure as getInviteLink } from "./getInviteLink";
import { joinPublicProcedure as joinPublic } from "./joinPublic";
import { leave } from "./leave";
import { listJoinRequestsProcedure as listJoinRequests } from "./listJoinRequests";
import { listForOperatorProcedure as listForOperator } from "./listForOperator";
import { listLookupInvitesProcedure as listLookupInvites } from "./listLookupInvites";
import { listPublicProcedure as listPublic } from "./listPublic";
import { listSeasonsProcedure as listSeasons } from "./listSeasons";
import { mineProcedure as mine } from "./mine";
import { mineLooseProcedure as mineLoose } from "./mineLoose";
import { pendingLinkRequestsProcedure as pendingLinkRequests } from "./pendingLinkRequests";
import { unlinkFromVenueProcedure as unlinkFromVenue } from "./unlinkFromVenue";
import { pendingLookupInvitesProcedure as pendingLookupInvites } from "./pendingLookupInvites";
import { inviteLinkByShortCodeProcedure as inviteLinkByShortCode } from "./inviteLinkByShortCode";
import { previewInviteLinkProcedure as previewInviteLink } from "./previewInviteLink";
import { previewPlayerByPhoneProcedure as previewPlayerByPhone } from "./previewPlayerByPhone";
import { rejectJoinRequestProcedure as rejectJoinRequest } from "./rejectJoinRequest";
import { removePlayerProcedure as removePlayer } from "./removePlayer";
import { removeUnclaimedPlayerProcedure as removeUnclaimedPlayer } from "./removeUnclaimedPlayer";
import { requestJoinProcedure as requestJoin } from "./requestJoin";
import { resetInviteLinkProcedure as resetInviteLink } from "./resetInviteLink";
import { revokeLookupInviteProcedure as revokeLookupInvite } from "./revokeLookupInvite";
import { searchLookupUsersProcedure as searchLookupUsers } from "./searchLookupUsers";
import { seasonStandingProcedure as seasonStanding } from "./seasonStanding";
import { sendLookupInviteProcedure as sendLookupInvite } from "./sendLookupInvite";
import { setOrganizerProcedure as setOrganizer } from "./setOrganizer";
import { setVerifiedProcedure as setVerified } from "./setVerified";
import { tierHistoryProcedure as tierHistory } from "./tierHistory";
import { transferOwnershipProcedure as transferOwnership } from "./transferOwnership";
import { setRequiresApprovalProcedure as setRequiresApproval } from "./setRequiresApproval";
import { undoJoinRequestDecisionProcedure as undoJoinRequestDecision } from "./undoJoinRequestDecision";
import { uploadImageProcedure as uploadImage } from "./uploadImage";
import { withdrawJoinRequestProcedure as withdrawJoinRequest } from "./withdrawJoinRequest";

export const groupsRouter = createTRPCRouter({
  createLoosePublic,
  createLoosePrivate,
  mineLoose,
  mine,
  listPublic,
  byId,
  joinPublic,
  requestJoin,
  listJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
  undoJoinRequestDecision,
  withdrawJoinRequest,
  setRequiresApproval,
  leave,
  delete: deleteProcedure,
  edit,
  transferOwnership,
  searchLookupUsers,
  sendLookupInvite,
  listLookupInvites,
  revokeLookupInvite,
  pendingLookupInvites,
  acceptLookupInvite,
  getInviteLink,
  createInviteLink,
  resetInviteLink,
  inviteLinkByShortCode,
  previewInviteLink,
  acceptInviteLink,
  uploadImage,
  clearImage,
  setVerified,
  listForOperator,
  pendingLinkRequests,
  acceptLinkRequest,
  declineLinkRequest,
  unlinkFromVenue,
  previewPlayerByPhone,
  addPlayerByPhone,
  removeUnclaimedPlayer,
  removePlayer,
  setOrganizer,
  listSeasons,
  createSeason,
  closeSeason,
  seasonStanding,
  adjustTierPoints,
  tierHistory,
});
