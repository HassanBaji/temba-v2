import { createTRPCRouter } from "~/server/api/trpc";

import { acceptInviteLinkProcedure as acceptInviteLink } from "./acceptInviteLink";
import { acceptLookupInviteProcedure as acceptLookupInvite } from "./acceptLookupInvite";
import { approveJoinRequestProcedure as approveJoinRequest } from "./approveJoinRequest";
import { byId } from "./byId";
import { createClubPrivateProcedure as createClubPrivate } from "./createClubPrivate";
import { createClubPublicProcedure as createClubPublic } from "./createClubPublic";
import { createInviteLinkProcedure as createInviteLink } from "./createInviteLink";
import { createLoosePrivateProcedure as createLoosePrivate } from "./createLoosePrivate";
import { createLoosePublicProcedure as createLoosePublic } from "./createLoosePublic";
import { deleteProcedure } from "./delete";
import { getInviteLinkProcedure as getInviteLink } from "./getInviteLink";
import { joinClubPublicProcedure as joinClubPublic } from "./joinClubPublic";
import { joinLoosePublicProcedure as joinLoosePublic } from "./joinLoosePublic";
import { leave } from "./leave";
import { listJoinRequestsProcedure as listJoinRequests } from "./listJoinRequests";
import { listLookupInvitesProcedure as listLookupInvites } from "./listLookupInvites";
import { listPublicProcedure as listPublic } from "./listPublic";
import { mineProcedure as mine } from "./mine";
import { mineLooseProcedure as mineLoose } from "./mineLoose";
import { pendingLookupInvitesProcedure as pendingLookupInvites } from "./pendingLookupInvites";
import { previewInviteLinkProcedure as previewInviteLink } from "./previewInviteLink";
import { rejectJoinRequestProcedure as rejectJoinRequest } from "./rejectJoinRequest";
import { requestJoinProcedure as requestJoin } from "./requestJoin";
import { revokeLookupInviteProcedure as revokeLookupInvite } from "./revokeLookupInvite";
import { searchLookupUsersProcedure as searchLookupUsers } from "./searchLookupUsers";
import { sendLookupInviteProcedure as sendLookupInvite } from "./sendLookupInvite";
import { setRequiresApprovalProcedure as setRequiresApproval } from "./setRequiresApproval";
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
  previewInviteLink,
  acceptInviteLink,
  uploadImage,
});
