import { createTRPCRouter } from "~/server/api/trpc";

import { addCourtProcedure as addCourt } from "./addCourt";
import { approveLinkRequestProcedure as approveLinkRequest } from "./approveLinkRequest";
import { byId } from "./byId";
import { clearLogoProcedure as clearLogo } from "./clearLogo";
import { create } from "./create";
import { deleteCourtProcedure as deleteCourt } from "./deleteCourt";
import { list } from "./list";
import { listPendingLinkRequestsProcedure as listPendingLinkRequests } from "./listPendingLinkRequests";
import { rejectLinkRequestProcedure as rejectLinkRequest } from "./rejectLinkRequest";
import { renameCourtProcedure as renameCourt } from "./renameCourt";
import { softArchiveProcedure as softArchive } from "./softArchive";
import { unarchiveProcedure as unarchive } from "./unarchive";
import { update } from "./update";
import { uploadLogoProcedure as uploadLogo } from "./uploadLogo";

export const venuesRouter = createTRPCRouter({
  list,
  byId,
  create,
  update,
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
