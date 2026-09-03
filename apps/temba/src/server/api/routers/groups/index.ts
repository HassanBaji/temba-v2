import { createTRPCRouter } from "~/server/api/trpc";

import { acceptInviteLinkProcedure as acceptInviteLink } from "./acceptInviteLink";
import { acceptLookupInviteProcedure as acceptLookupInvite } from "./acceptLookupInvite";
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
import { listLookupInvitesProcedure as listLookupInvites } from "./listLookupInvites";
import { mineProcedure as mine } from "./mine";
import { mineLooseProcedure as mineLoose } from "./mineLoose";
import { pendingLookupInvitesProcedure as pendingLookupInvites } from "./pendingLookupInvites";
import { previewInviteLinkProcedure as previewInviteLink } from "./previewInviteLink";
import { revokeLookupInviteProcedure as revokeLookupInvite } from "./revokeLookupInvite";
import { searchLookupUsersProcedure as searchLookupUsers } from "./searchLookupUsers";
import { sendLookupInviteProcedure as sendLookupInvite } from "./sendLookupInvite";

export const groupsRouter = createTRPCRouter({
  createClubPublic,
  createClubPrivate,
  createLoosePublic,
  createLoosePrivate,
  mineLoose,
  mine,
  byId,
  joinClubPublic,
  joinLoosePublic,
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
});
