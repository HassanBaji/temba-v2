import { createTRPCRouter } from "#src/trpc";

import { addPhotoProcedure as addPhoto } from "./addPhoto";
import { deleteNoteProcedure as deleteNote } from "./deleteNote";
import { forGameProcedure as forGame } from "./forGame";
import { myNotesProcedure as myNotes } from "./myNotes";
import { removePhotoProcedure as removePhoto } from "./removePhoto";
import { saveNoteProcedure as saveNote } from "./saveNote";

export const gameAlbumRouter = createTRPCRouter({
  forGame,
  addPhoto,
  removePhoto,
  saveNote,
  deleteNote,
  myNotes,
});
