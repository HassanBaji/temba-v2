/** Rename is offered only when the trimmed draft is a new, non-empty name. */
export function courtRenameIsDirty(draft: string, savedName: string) {
  const next = draft.trim();
  return next.length > 0 && next !== savedName;
}
