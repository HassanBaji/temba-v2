import { createTRPCRouter } from "~/server/api/trpc";

import { acceptInAppInviteProcedure as acceptInAppInvite } from "./acceptInAppInvite";
import { acceptInviteLinkProcedure as acceptInviteLink } from "./acceptInviteLink";
import { byId } from "./byId";
import { create } from "./create";
import { createInviteLinkProcedure as createInviteLink } from "./createInviteLink";
import { dissolveProcedure as dissolve } from "./dissolve";
import { getInviteLinkProcedure as getInviteLink } from "./getInviteLink";
import { inviteInAppProcedure as inviteInApp } from "./inviteInApp";
import { listInAppInvitesProcedure as listInAppInvites } from "./listInAppInvites";
import { mineProcedure as mine } from "./mine";
import { pendingInvitesProcedure as pendingInvites } from "./pendingInvites";
import { previewInviteLinkProcedure as previewInviteLink } from "./previewInviteLink";
import { requestLinkProcedure as requestLink } from "./requestLink";
import { revokeInAppInviteProcedure as revokeInAppInvite } from "./revokeInAppInvite";
import { searchLookupUsersProcedure as searchLookupUsers } from "./searchLookupUsers";
import { unlinkProcedure as unlink } from "./unlink";

export const teamsRouter = createTRPCRouter({
  create,
  mine,
  pendingInvites,
  byId,
  searchLookupUsers,
  inviteInApp,
  listInAppInvites,
  revokeInAppInvite,
  acceptInAppInvite,
  getInviteLink,
  createInviteLink,
  previewInviteLink,
  acceptInviteLink,
  requestLink,
  unlink,
  dissolve,
});
