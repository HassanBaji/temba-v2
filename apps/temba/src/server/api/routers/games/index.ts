import { createTRPCRouter } from "~/server/api/trpc";

import { acceptInviteLinkProcedure as acceptInviteLink } from "./acceptInviteLink";
import { acceptLookupInviteProcedure as acceptLookupInvite } from "./acceptLookupInvite";
import { addMatchProcedure as addMatch } from "./addMatch";
import { addSetProcedure as addSet } from "./addSet";
import { approveLevelRangeRequestProcedure as approveLevelRangeRequest } from "./approveLevelRangeRequest";
import { byId } from "./byId";
import { cancel } from "./cancel";
import { cancelMatchProcedure as cancelMatch } from "./cancelMatch";
import { closeRegistrationProcedure as closeRegistration } from "./closeRegistration";
import { completeMatchProcedure as completeMatch } from "./completeMatch";
import { create } from "./create";
import { createInviteLinkProcedure as createInviteLink } from "./createInviteLink";
import { getInviteLinkProcedure as getInviteLink } from "./getInviteLink";
import { getSecretMessage } from "./getSecretMessage";
import { hello } from "./hello";
import { kickProcedure as kick } from "./kick";
import { leave } from "./leave";
import { leaveWaitlistProcedure as leaveWaitlist } from "./leaveWaitlist";
import { listCourtsProcedure as listCourts } from "./listCourts";
import { listCreateVenues } from "./listCreateVenues";
import { listLevelRangeRequestsProcedure as listLevelRangeRequests } from "./listLevelRangeRequests";
import { listLookupInvitesProcedure as listLookupInvites } from "./listLookupInvites";
import { listMyGames } from "./listMyGames";
import { listPublicPickup } from "./listPublicPickup";
import { moveSeatProcedure as moveSeat } from "./moveSeat";
import { pendingLookupInvitesProcedure as pendingLookupInvites } from "./pendingLookupInvites";
import { previewInviteLinkProcedure as previewInviteLink } from "./previewInviteLink";
import { registerProcedure as register } from "./register";
import { registerSeatProcedure as registerSeat } from "./registerSeat";
import { registerTeamProcedure as registerTeam } from "./registerTeam";
import { registerWithPartnerProcedure as registerWithPartner } from "./registerWithPartner";
import { rejectLevelRangeRequestProcedure as rejectLevelRangeRequest } from "./rejectLevelRangeRequest";
import { removeSetProcedure as removeSet } from "./removeSet";
import { reopenRegistrationProcedure as reopenRegistration } from "./reopenRegistration";
import { requestLevelRangeProcedure as requestLevelRange } from "./requestLevelRange";
import { revokeLookupInviteProcedure as revokeLookupInvite } from "./revokeLookupInvite";
import { scoreSetProcedure as scoreSet } from "./scoreSet";
import { searchLookupUsersProcedure as searchLookupUsers } from "./searchLookupUsers";
import { searchPartnerUsersProcedure as searchPartnerUsers } from "./searchPartnerUsers";
import { sendLookupInviteProcedure as sendLookupInvite } from "./sendLookupInvite";
import { updateCaps } from "./updateCaps";
import { updateLevelRange } from "./updateLevelRange";
import { updateMatchProcedure as updateMatch } from "./updateMatch";
import { updatePricePerPlayer } from "./updatePricePerPlayer";
import { updateWindow } from "./updateWindow";

export const gamesRouter = createTRPCRouter({
  hello,
  listMyGames,
  listPublicPickup,
  listCreateVenues,
  create,
  byId,
  register,
  registerSeat,
  moveSeat,
  searchPartnerUsers,
  registerWithPartner,
  registerTeam,
  leave,
  leaveWaitlist,
  kick,
  closeRegistration,
  reopenRegistration,
  cancel,
  cancelMatch,
  updateWindow,
  updatePricePerPlayer,
  updateLevelRange,
  requestLevelRange,
  listLevelRangeRequests,
  approveLevelRangeRequest,
  rejectLevelRangeRequest,
  updateCaps,
  listCourts,
  addMatch,
  updateMatch,
  addSet,
  scoreSet,
  removeSet,
  completeMatch,
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
  getSecretMessage,
});
