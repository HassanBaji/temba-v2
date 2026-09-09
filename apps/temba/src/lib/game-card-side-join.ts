/**
 * Which Position a one-tap Join on a Games hub Friendly roster side takes.
 *
 * Empty sides always seat left first, then right on a later tap after
 * refresh. Partial sides take the remaining vacant Position. Full sides
 * are not joinable. Preferred Position is not consulted — that default is
 * for the Game details join sheet only.
 */
export function nextJoinPosition(side: {
  left: unknown;
  right: unknown;
}): "left" | "right" | null {
  if (side.left == null) {
    return "left";
  }
  if (side.right == null) {
    return "right";
  }
  return null;
}
