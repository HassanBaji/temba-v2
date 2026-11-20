/**
 * How much of a full-screen view the keyboard covers. Where the system has
 * already resized the view to end at the keyboard (Android adjustResize),
 * nothing is covered.
 */
export function keyboardOverlap(
  viewHeight: number,
  keyboardTop: number | null,
): number {
  if (keyboardTop == null) {
    return 0;
  }
  return Math.max(0, Math.round(viewHeight - keyboardTop));
}
