/** Sharp on a phone and on the web, and small enough to stay under the 2 MB cap. */
export const PHOTO_MAX_EDGE = 2048;

export function fitWithin(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } {
  if (width <= 0 || height <= 0) {
    return { width: maxEdge, height: maxEdge };
  }
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}
