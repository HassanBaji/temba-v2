import { I18nManager, type ViewStyle } from "react-native";

/**
 * React Native mirrors layout in RTL but not glyphs. Apply to arrows and
 * chevrons that point along the reading direction, never to icons that point
 * at a fixed thing (a clock hand, a play button).
 */
export const mirrorInRtl: ViewStyle = I18nManager.isRTL
  ? { transform: [{ scaleX: -1 }] }
  : {};

export function isLayoutRtl(): boolean {
  return I18nManager.isRTL;
}
