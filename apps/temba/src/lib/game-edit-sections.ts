export const GAME_EDIT_SECTIONS = [
  "window",
  "price",
  "level",
  "rounds",
] as const;

export type GameEditSection = (typeof GAME_EDIT_SECTIONS)[number];

/**
 * Which Edit game sections take fresh server values when the Game reloads.
 * While the dialog is open only a section that was just saved is reseeded, so
 * unsaved edits in the other sections survive.
 */
export function gameEditSectionsToReseed({
  dialogOpen,
  justSaved,
}: {
  dialogOpen: boolean;
  justSaved: ReadonlySet<GameEditSection>;
}): GameEditSection[] {
  if (!dialogOpen) {
    return [...GAME_EDIT_SECTIONS];
  }
  return GAME_EDIT_SECTIONS.filter((section) => justSaved.has(section));
}
