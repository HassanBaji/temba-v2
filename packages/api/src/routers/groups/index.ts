import { createTRPCRouter } from "#src/trpc";

import { acceptInviteLinkProcedure as acceptInviteLink } from "./acceptInviteLink";
import { acceptLinkRequestProcedure as acceptLinkRequest } from "./acceptLinkRequest";
import { acceptLookupInviteProcedure as acceptLookupInvite } from "./acceptLookupInvite";
import { addPlayerByPhoneProcedure as addPlayerByPhone } from "./addPlayerByPhone";
import { approveJoinRequestProcedure as approveJoinRequest } from "./approveJoinRequest";
import { byId } from "./byId";
import { clearImageProcedure as clearImage } from "./clearImage";
import { createClubPrivateProcedure as createClubPrivate } from "./createClubPrivate";
import { createClubPublicProcedure as createClubPublic } from "./createClubPublic";
import { createInviteLinkProcedure as createInviteLink } from "./createInviteLink";
import { createLoosePrivateProcedure as createLoosePrivate } from "./createLoosePrivate";
import { createLoosePublicProcedure as createLoosePublic } from "./createLoosePublic";
import { declineLinkRequestProcedure as declineLinkRequest } from "./declineLinkRequest";
import { deleteProcedure } from "./delete";
import { getInviteLinkProcedure as getInviteLink } from "./getInviteLink";
import { joinClubPublicProcedure as joinClubPublic } from "./joinClubPublic";
import { joinLoosePublicProcedure as joinLoosePublic } from "./joinLoosePublic";
import { leave } from "./leave";
import { listJoinRequestsProcedure as listJoinRequests } from "./listJoinRequests";
import { listForOperatorProcedure as listForOperator } from "./listForOperator";
import { listLookupInvitesProcedure as listLookupInvites } from "./listLookupInvites";
import { listPublicProcedure as listPublic } from "./listPublic";
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
import { revokeLookupInviteProcedure as revokeLookupInvite } from "./revokeLookupInvite";
import { searchLookupUsersProcedure as searchLookupUsers } from "./searchLookupUsers";
import { sendLookupInviteProcedure as sendLookupInvite } from "./sendLookupInvite";
import { setOrganizerProcedure as setOrganizer } from "./setOrganizer";
import { setVerifiedProcedure as setVerified } from "./setVerified";
import { setRequiresApprovalProcedure as setRequiresApproval } from "./setRequiresApproval";
import { undoJoinRequestDecisionProcedure as undoJoinRequestDecision } from "./undoJoinRequestDecision";
import { uploadImageProcedure as uploadImage } from "./uploadImage";

export const groupsRouter = createTRPCRouter({
  createClubPublic,
  createClubPrivate,
  createLoosePublic,
  createLoosePrivate,
  mineLoose,
  mine,
  listPublic,
  byId,
  joinClubPublic,
  joinLoosePublic,
  requestJoin,
  listJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
  undoJoinRequestDecision,
  setRequiresApproval,
  leave,
  delete: deleteProcedure,
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
});
