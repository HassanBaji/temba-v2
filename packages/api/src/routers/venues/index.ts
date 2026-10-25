import { createTRPCRouter } from "#src/trpc";

import { addClosureProcedure as addClosure } from "./addClosure";
import { addCourtProcedure as addCourt } from "./addCourt";
import { addManagerProcedure as addManager } from "./addManager";
import { approveLinkRequestProcedure as approveLinkRequest } from "./approveLinkRequest";
import { byId } from "./byId";
import { cancelGroupLinkRequestProcedure as cancelGroupLinkRequest } from "./cancelGroupLinkRequest";
import { clearLogoProcedure as clearLogo } from "./clearLogo";
import { create } from "./create";
import { deleteCourtProcedure as deleteCourt } from "./deleteCourt";
import { deletePhotoProcedure as deletePhoto } from "./deletePhoto";
import { list } from "./list";
import { listCommunityGroupsProcedure as listCommunityGroups } from "./listCommunityGroups";
import { listManagedProcedure as listManaged } from "./listManaged";
import { listPendingLinkRequestsProcedure as listPendingLinkRequests } from "./listPendingLinkRequests";
import { managedById } from "./managedById";
import { rejectLinkRequestProcedure as rejectLinkRequest } from "./rejectLinkRequest";
import { removeManagerProcedure as removeManager } from "./removeManager";
import { removeClosureProcedure as removeClosure } from "./removeClosure";
import { renameCourtProcedure as renameCourt } from "./renameCourt";
import { searchLinkableGroupsProcedure as searchLinkableGroups } from "./searchLinkableGroups";
import { searchManagerUsersProcedure as searchManagerUsers } from "./searchManagerUsers";
import { setCourtSportProcedure as setCourtSport } from "./setCourtSport";
import { sendGroupLinkRequestProcedure as sendGroupLinkRequest } from "./sendGroupLinkRequest";
import { unlinkGroupProcedure as unlinkGroup } from "./unlinkGroup";
import { setDisplayPhotosProcedure as setDisplayPhotos } from "./setDisplayPhotos";
import { setOpeningHoursProcedure as setOpeningHours } from "./setOpeningHours";
import { setPricingRulesProcedure as setPricingRules } from "./setPricingRules";
import { softArchiveProcedure as softArchive } from "./softArchive";
import { unarchiveProcedure as unarchive } from "./unarchive";
import { update } from "./update";
import { updateBookingSettingsProcedure as updateBookingSettings } from "./updateBookingSettings";
import { updateCancellationPolicyProcedure as updateCancellationPolicy } from "./updateCancellationPolicy";
import { updateDetails } from "./updateDetails";
import { uploadLogoProcedure as uploadLogo } from "./uploadLogo";
import { uploadPhotoProcedure as uploadPhoto } from "./uploadPhoto";

export const venuesRouter = createTRPCRouter({
  list,
  listManaged,
  managedById,
  addManager,
  removeManager,
  searchManagerUsers,
  byId,
  create,
  update,
  updateDetails,
  updateBookingSettings,
  updateCancellationPolicy,
  setOpeningHours,
  setPricingRules,
  addClosure,
  removeClosure,
  addCourt,
  renameCourt,
  setCourtSport,
  deleteCourt,
  uploadLogo,
  clearLogo,
  uploadPhoto,
  deletePhoto,
  setDisplayPhotos,
  softArchive,
  unarchive,
  listPendingLinkRequests,
  approveLinkRequest,
  rejectLinkRequest,
  listCommunityGroups,
  searchLinkableGroups,
  sendGroupLinkRequest,
  cancelGroupLinkRequest,
  unlinkGroup,
});
