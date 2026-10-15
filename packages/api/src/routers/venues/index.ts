import { createTRPCRouter } from "#src/trpc";

import { addCourtProcedure as addCourt } from "./addCourt";
import { addManagerProcedure as addManager } from "./addManager";
import { approveLinkRequestProcedure as approveLinkRequest } from "./approveLinkRequest";
import { byId } from "./byId";
import { clearLogoProcedure as clearLogo } from "./clearLogo";
import { create } from "./create";
import { deleteCourtProcedure as deleteCourt } from "./deleteCourt";
import { list } from "./list";
import { listManagedProcedure as listManaged } from "./listManaged";
import { listPendingLinkRequestsProcedure as listPendingLinkRequests } from "./listPendingLinkRequests";
import { managedById } from "./managedById";
import { rejectLinkRequestProcedure as rejectLinkRequest } from "./rejectLinkRequest";
import { removeManagerProcedure as removeManager } from "./removeManager";
import { renameCourtProcedure as renameCourt } from "./renameCourt";
import { searchManagerUsersProcedure as searchManagerUsers } from "./searchManagerUsers";
import { softArchiveProcedure as softArchive } from "./softArchive";
import { unarchiveProcedure as unarchive } from "./unarchive";
import { update } from "./update";
import { updateDetails } from "./updateDetails";
import { uploadLogoProcedure as uploadLogo } from "./uploadLogo";

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
  addCourt,
  renameCourt,
  deleteCourt,
  uploadLogo,
  clearLogo,
  softArchive,
  unarchive,
  listPendingLinkRequests,
  approveLinkRequest,
  rejectLinkRequest,
});
