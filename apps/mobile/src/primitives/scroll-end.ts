export const NEAR_END_DISTANCE = 240;

export function isNearEnd(
  metrics: {
    contentOffsetY: number;
    layoutHeight: number;
    contentHeight: number;
  },
  distance: number = NEAR_END_DISTANCE,
) {
  const { contentOffsetY, layoutHeight, contentHeight } = metrics;
  return contentOffsetY + layoutHeight >= contentHeight - distance;
}
